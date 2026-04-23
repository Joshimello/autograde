import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import PocketBase from 'pocketbase'
import type { WorkerConfig } from './config'
import { parseRunnerResult } from './result'
import {
  JobCanceledError,
  type JobRecord,
  type JobLogStream,
  type PolicyRecord,
  type SubmissionRecord,
} from './types'

export type PocketBaseClient = ReturnType<typeof createPocketBaseClient>

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
        'type = "grading" && status = "queued"'
      )) as unknown as JobRecord
    } catch (cause) {
      if (isNotFound(cause)) {
        return null
      }

      throw cause
    }

    return (await pb.collection('jobs').update(job.id, {
      status: 'running',
      progress: 5,
      startedAt: new Date().toISOString(),
      workerId: config.workerId,
      attempts: (job.attempts ?? 0) + 1,
      message: 'Preparing submission',
      error: '',
    })) as unknown as JobRecord
  }

  async function loadJobInput(job: JobRecord, runDir: string) {
    const submission = (await pb
      .collection('submissions')
      .getOne(job.submission)) as unknown as SubmissionRecord
    const policy = (await pb
      .collection('policies')
      .getOne(submission.policy)) as unknown as PolicyRecord
    const archivePath = path.join(runDir, 'submission.zip')
    const outputDir = path.join(runDir, 'output')

    await mkdir(outputDir, { recursive: true })
    await chmod(outputDir, 0o777)
    await downloadArchive(submission, archivePath)

    return {
      archivePath,
      outputDir,
      submission,
      policy,
    }
  }

  async function markJobProgress(jobId: string, progress: number, message: string) {
    await pb.collection('jobs').update(jobId, {
      progress,
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

  async function isJobCanceled(jobId: string) {
    const job = (await pb.collection('jobs').getOne(jobId)) as unknown as JobRecord

    return job.status === 'canceled'
  }

  async function markJobCanceled(job: JobRecord) {
    await pb.collection('submissions').update(job.submission, {
      status: 'pending',
    })
    await pb.collection('jobs').update(job.id, {
      status: 'canceled',
      message: 'AI grading canceled',
      finishedAt: new Date().toISOString(),
    })
    await appendJobLog(job.id, 'system', 'AI grading canceled')
  }

  async function finishJob(job: JobRecord, resultPath: string) {
    const raw = await readFile(resultPath, 'utf8')
    const result = parseRunnerResult(JSON.parse(raw))
    const submission = (await pb
      .collection('submissions')
      .getOne(job.submission)) as unknown as SubmissionRecord

    await replaceResult(submission, result)
    await updateSubmissionStatus(submission.id, 'needs_review')
    await pb.collection('jobs').update(job.id, {
      status: 'succeeded',
      progress: 100,
      message: 'Grading completed',
      finishedAt: new Date().toISOString(),
      error: '',
    })
    await appendJobLog(job.id, 'system', 'Grading completed')
  }

  async function saveFailedResult(job: JobRecord, resultPath: string) {
    const raw = await readFile(resultPath, 'utf8')
    const result = parseRunnerResult(JSON.parse(raw))
    const submission = (await pb
      .collection('submissions')
      .getOne(job.submission)) as unknown as SubmissionRecord

    await replaceResult(submission, result)
  }

  async function failJob(job: JobRecord, cause: unknown) {
    if (cause instanceof JobCanceledError) {
      await markJobCanceled(job)
      return
    }

    const message = formatError(cause)
    const summary = message.split('\n').find((line) => line.trim()) ?? message

    await updateSubmissionStatus(job.submission, 'failed')
    await pb.collection('jobs').update(job.id, {
      status: 'failed',
      message: summary.slice(0, 2000),
      error: message.slice(0, 5000),
      finishedAt: new Date().toISOString(),
    })
    await appendJobLog(job.id, 'system', `Job failed: ${summary}`)
  }

  async function prepareRunDir(runDir: string) {
    await rm(runDir, { recursive: true, force: true })
    await mkdir(runDir, { recursive: true })
  }

  async function writePolicyInput(inputPath: string, policy: PolicyRecord) {
    await writeFile(
      inputPath,
      JSON.stringify(
        {
          id: policy.id,
          name: policy.name,
          description: policy.description ?? '',
          criteria: policy.criteria,
        },
        null,
        2
      )
    )
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

  async function replaceResult(submission: SubmissionRecord, result: ReturnType<typeof parseRunnerResult>) {
    const existing = await pb.collection('results').getFullList({
      filter: `submission = "${submission.id}"`,
    })

    for (const record of existing) {
      await pb.collection('results').delete(record.id)
    }

    await pb.collection('results').create({
      submission: submission.id,
      policy: submission.policy,
      score: result.score,
      maxScore: result.maxScore,
      rubricResults: result.rubricResults,
      feedback: result.feedback,
    })
  }

  async function updateSubmissionStatus(submissionId: string, status: string) {
    try {
      await pb.collection('submissions').update(submissionId, {
        status,
      })
    } catch (cause) {
      console.error(
        `Failed to update submission ${submissionId} status to ${status}`,
        formatPocketBaseError(cause)
      )
      throw cause
    }
  }

  return {
    authenticate,
    appendJobLog,
    claimNextJob,
    failJob,
    finishJob,
    isJobCanceled,
    loadJobInput,
    markJobCanceled,
    markJobProgress,
    prepareRunDir,
    saveFailedResult,
    writePolicyInput,
  }
}

function sanitizeLogMessage(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
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

function formatPocketBaseError(cause: unknown) {
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'response' in cause
  ) {
    return JSON.stringify(cause.response, null, 2)
  }

  return formatError(cause)
}
