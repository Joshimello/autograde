import type { RunnerResult } from './result'

export type PolicyRecord = {
  id: string
  name: string
  description?: string
  criteria: unknown
}

export type SubmissionRecord = {
  id: string
  label: string
  policy: string
  archive: string
  status: string
  collectionId: string
}

export type JobRecord = {
  id: string
  submission: string
  status: string
  type: string
  attempts?: number
}

export type JobLogStream = 'stdout' | 'stderr' | 'system'

export type RunnerInput = {
  archivePath: string
  outputDir: string
  submission: SubmissionRecord
  policy: PolicyRecord
}

export type RunnerOutput = {
  result: RunnerResult
  logs: string
}

export type RunnerLogSink = (stream: JobLogStream, message: string) => Promise<void>

export class JobCanceledError extends Error {
  constructor() {
    super('AI grading was canceled.')
    this.name = 'JobCanceledError'
  }
}
