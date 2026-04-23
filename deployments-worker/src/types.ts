export type SubmissionRecord = {
  id: string
  label: string
  archive: string
  collectionId: string
}

export type JobRecord = {
  id: string
  submission: string
  status: string
  type: string
  attempts?: number
}

export type DeploymentStatus = 'queued' | 'building' | 'deployed' | 'failed'

export type DeploymentRecord = {
  id: string
  submission: string
  job?: string
  status: DeploymentStatus
  message?: string
  error?: string
  url?: string
  deployId?: string
}

export type JobLogStream = 'stdout' | 'stderr' | 'system'

export type RunnerInput = {
  archivePath: string
  outputDir: string
  siteDir: string
  submission: SubmissionRecord
  deployment: DeploymentRecord
}

export type DeploymentRunnerResult = {
  buildStatus: 'passed'
  buildLogSummary: string
  outputDir: string
}

export type RunnerLogSink = (stream: JobLogStream, message: string) => Promise<void>
