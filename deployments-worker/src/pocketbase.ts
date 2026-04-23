import { chmod, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import PocketBase from 'pocketbase'
import type { WorkerConfig } from './config'
import type {
  DeploymentRecord,
  DeploymentStatus,
  JobLogStream,
  JobRecord,
  SubmissionRecord,
} from './types'

export function createPocketBaseClient(config: WorkerConfig) {
  const pb = new PocketBase(config.pocketbaseUrl)
  pb.autoCancellation(false)
  const logSequences = new Map<string, number>()

  async function authenticate() {
    await pb
      .collection('_superusers')
      .authWithPassword(config.pocketbaseEmail, config.pocketbasePassword)
  }

  async function claimNextJob() {
    let job: JobRecord

    try {
      job = (await pb.collection('jobs').getFirstListItem(
        'type = "deployment" && status = "queued"'
      )) as unknown as JobRecord
    } catch (cause) {
      if (isNotFound(cause)) {
        return null
      }

      throw cause
    }

    const claimed = (await pb.collection('jobs').update(job.id, {
      status: 'running',
      progress: 5,
      startedAt: new Date().toISOString(),
      workerId: config.workerId,
      attempts: (job.attempts ?? 0) + 1,
      message: 'Preparing preview build',
      error: '',
    })) as unknown as JobRecord

    const deployment = await getDeploymentForJob(claimed, true)
    await updateDeployment(deployment.id, {
      status: 'building',
      message: 'Preparing preview build',
      error: '',
      url: '',
      deployId: '',
    })

    return claimed
  }

  async function prepareRunDir(runDir: string) {
    await rm(runDir, { recursive: true, force: true })
    await mkdir(runDir, { recursive: true })
  }

  async function loadJobInput(job: JobRecord, runDir: string) {
    const submission = (await pb
      .collection('submissions')
      .getOne(job.submission)) as unknown as SubmissionRecord
    const deployment = await getDeploymentForJob(job, false)

    if (!deployment) {
      throw new Error(`No deployment record found for submission ${job.submission}`)
    }
    const archivePath = path.join(runDir, 'submission.zip')
    const outputDir = path.join(runDir, 'output')
    const siteDir = path.join(outputDir, 'site')

    await mkdir(outputDir, { recursive: true })
    await chmod(outputDir, 0o777)
    await downloadArchive(submission, archivePath)

    return {
      archivePath,
      outputDir,
      siteDir,
      submission,
      deployment,
    }
  }

  async function markJobProgress(
    jobId: string,
    deploymentId: string,
    progress: number,
    message: string,
    status: DeploymentStatus = 'building'
  ) {
    await pb.collection('jobs').update(jobId, {
      progress,
      message,
    })
    await updateDeployment(deploymentId, {
      status,
      message,
    })
    await appendJobLog(jobId, 'system', message)
  }

  async function appendJobLog(
    jobId: string,
    stream: JobLogStream,
    message: string
  ) {
    const cleaned = sanitizeLogMessage(message)

    if (!cleaned.trim()) {
      return
    }

    const sequence = (logSequences.get(jobId) ?? 0) + 1
    logSequences.set(jobId, sequence)

    try {
      await pb.collection('job_logs').create({
        job: jobId,
        sequence,
        stream,
        message: cleaned.slice(0, 10000),
      })
    } catch (cause) {
      console.error('Failed to create job log', formatPocketBaseError(cause))
    }
  }

  async function finishJob(
    job: JobRecord,
    deploymentId: string,
    deployId: string,
    url: string
  ) {
    await updateDeployment(deploymentId, {
      status: 'deployed',
      message: 'Preview deployed',
      error: '',
      url,
      deployId,
      deployedAt: new Date().toISOString(),
    })
    await pb.collection('jobs').update(job.id, {
      status: 'succeeded',
      progress: 100,
      message: 'Preview deployed',
      finishedAt: new Date().toISOString(),
      error: '',
    })
    await appendJobLog(job.id, 'system', `Preview deployed: ${url}`)
  }

  async function failJob(job: JobRecord, deploymentId: string | null, cause: unknown) {
    const message = formatError(cause)
    const summary = message.split('\n').find((line) => line.trim()) ?? message

    if (deploymentId) {
      await updateDeployment(deploymentId, {
        status: 'failed',
        message: summary.slice(0, 2000),
        error: message.slice(0, 5000),
      })
    }
    await pb.collection('jobs').update(job.id, {
      status: 'failed',
      message: summary.slice(0, 2000),
      error: message.slice(0, 5000),
      finishedAt: new Date().toISOString(),
    })
    await appendJobLog(job.id, 'system', `Deployment failed: ${summary}`)
  }

  async function cancelJob(job: JobRecord, deploymentId: string | null) {
    await pb.collection('jobs').update(job.id, {
      status: 'canceled',
      message: 'Preview canceled',
      error: '',
      finishedAt: new Date().toISOString(),
    })

    if (deploymentId) {
      await updateDeployment(deploymentId, {
        status: 'failed',
        message: 'Preview canceled',
        error: '',
      }).catch(() => undefined)
    }

    await appendJobLog(job.id, 'system', 'Preview canceled')
  }

  async function isJobCanceled(jobId: string) {
    const job = (await pb.collection('jobs').getOne(jobId)) as unknown as JobRecord
    return job.status === 'canceled'
  }

  async function getDeploymentForJob(
    job: Pick<JobRecord, 'id' | 'submission'>,
    createIfMissing = true
  ) {
    const deployments = (await (pb as PocketBase)
      .collection('deployments')
      .getFullList({
        filter: `submission = "${job.submission}"`,
      })) as unknown as DeploymentRecord[]

    if (deployments.length === 0) {
      if (!createIfMissing) {
        return null
      }

      return (await (pb as PocketBase).collection('deployments').create({
        submission: job.submission,
        status: 'queued',
        message: 'Queued',
        url: '',
      })) as unknown as DeploymentRecord
    }

    const activeDeployment = deployments.find(
      (deployment) =>
        deployment.status === 'queued' || deployment.status === 'building'
    )

    if (activeDeployment) {
      return activeDeployment
    }

    return deployments.toSorted((first, second) =>
      String(second.id).localeCompare(String(first.id))
    )[0]
  }

  async function updateDeployment(
    deploymentId: string,
    data: Record<string, unknown>
  ) {
    await (pb as PocketBase).collection('deployments').update(deploymentId, data)
  }

  async function downloadArchive(submission: SubmissionRecord, archivePath: string) {
    const url = pb.files.getURL(submission, submission.archive)
    const response = await fetch(url, {
      headers: {
        Authorization: pb.authStore.token,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download archive: ${response.status}`)
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    await writeFile(archivePath, bytes)
  }

  return {
    appendJobLog,
    authenticate,
    cancelJob,
    claimNextJob,
    failJob,
    finishJob,
    getDeploymentForJob,
    isJobCanceled,
    loadJobInput,
    markJobProgress,
    prepareRunDir,
  }
}

function isNotFound(cause: unknown) {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'status' in cause &&
    cause.status === 404
  )
}

function formatError(cause: unknown) {
  if (cause instanceof Error) {
    return cause.stack || cause.message
  }

  return String(cause)
}

function sanitizeLogMessage(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

function formatPocketBaseError(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message
  }

  return String(cause)
}
