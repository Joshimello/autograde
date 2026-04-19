export type BuildStatus = 'passed' | 'failed' | 'skipped'

export type RunnerRubricResult = {
  criterionId: string
  label: string
  score: number
  maxScore: number
  feedback: string
}

export type RunnerResult = {
  score: number
  maxScore: number
  buildStatus: BuildStatus
  buildLogSummary: string
  feedback: string
  rubricResults: RunnerRubricResult[]
}

const buildStatuses = new Set<BuildStatus>(['passed', 'failed', 'skipped'])

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertString(value: unknown, field: string) {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`)
  }

  return value
}

function assertNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`)
  }

  return value
}

export function parseRunnerResult(value: unknown): RunnerResult {
  if (!isObject(value)) {
    throw new Error('Runner result must be an object')
  }

  const buildStatus = assertString(value.buildStatus, 'buildStatus')

  if (!buildStatuses.has(buildStatus as BuildStatus)) {
    throw new Error('buildStatus is invalid')
  }

  if (!Array.isArray(value.rubricResults)) {
    throw new Error('rubricResults must be an array')
  }

  const rubricResults = value.rubricResults.map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`rubricResults.${index} must be an object`)
    }

    return {
      criterionId: assertString(item.criterionId, `rubricResults.${index}.criterionId`),
      label: assertString(item.label, `rubricResults.${index}.label`),
      score: assertNumber(item.score, `rubricResults.${index}.score`),
      maxScore: assertNumber(item.maxScore, `rubricResults.${index}.maxScore`),
      feedback: assertString(item.feedback, `rubricResults.${index}.feedback`),
    }
  })

  return {
    score: assertNumber(value.score, 'score'),
    maxScore: assertNumber(value.maxScore, 'maxScore'),
    buildStatus: buildStatus as BuildStatus,
    buildLogSummary: assertString(value.buildLogSummary, 'buildLogSummary'),
    feedback: assertString(value.feedback, 'feedback'),
    rubricResults,
  }
}
