export type PolicyImportStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type PolicyImportRecord = {
  id: string
  label: string
  sourceFile: string
  status: PolicyImportStatus
  progress?: number
}
