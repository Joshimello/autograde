import type { DeploymentRunnerResult } from './types'

export function parseDeploymentRunnerResult(
  value: unknown
): DeploymentRunnerResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Deployment runner result must be an object')
  }

  const candidate = value as Partial<DeploymentRunnerResult>

  if (candidate.buildStatus !== 'passed') {
    throw new Error('buildStatus is invalid')
  }

  const outputDir = String(candidate.outputDir || '').trim()

  if (!outputDir) {
    throw new Error('outputDir is required')
  }

  return {
    buildStatus: 'passed',
    buildLogSummary: String(candidate.buildLogSummary || ''),
    outputDir,
  }
}
