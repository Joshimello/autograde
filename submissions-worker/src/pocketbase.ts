import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import PocketBase from 'pocketbase'
import type { WorkerConfig } from './config'
import { parseRunnerResult } from './result'
import type { JobRecord, PolicyRecord, SubmissionRecord } from './types'

export type PocketBaseClient = ReturnType<typeof createPocketBaseClient>

export function createPocketBaseClient(config: WorkerConfig) {
  const pb = new PocketBase(config.pocketbaseUrl)
  pb.autoCancellation(false)

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
  }

  async function finishJob(job: JobRecord, resultPath: string) {
    const raw = await readFile(resultPath, 'utf8')
    const result = parseRunnerResult(JSON.parse(raw))
    const submission = (await pb
      .collection('submissions')
      .getOne(job.submission)) as unknown as SubmissionRecord

    await replaceResult(submission, result)
    await pb.collection('submissions').update(submission.id, {
      status: 'graded',
    })
    await pb.collection('jobs').update(job.id, {
      status: 'succeeded',
      progress: 100,
      message: 'Grading completed',
      finishedAt: new Date().toISOString(),
      error: '',
    })
  }

  async function failJob(job: JobRecord, cause: unknown) {
    const message = formatError(cause)

    await pb.collection('submissions').update(job.submission, {
      status: 'failed',
    })
    await pb.collection('jobs').update(job.id, {
      status: 'failed',
      message: message.slice(0, 2000),
      error: message.slice(0, 5000),
      finishedAt: new Date().toISOString(),
    })
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
      buildStatus: result.buildStatus,
      buildLogSummary: result.buildLogSummary,
      feedback: result.feedback,
    })
  }

  return {
    authenticate,
    claimNextJob,
    failJob,
    finishJob,
    loadJobInput,
    markJobProgress,
    prepareRunDir,
    writePolicyInput,
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
