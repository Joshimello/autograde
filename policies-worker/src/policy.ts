export type ExtractedPolicy = {
  name: string
  description: string
  criteria: Array<{
    label: string
    points: number
    description: string
  }>
}

export type PolicyPayload = {
  name: string
  description: string
  criteria: Array<{
    id: string
    label: string
    points: number
    description: string
  }>
  active: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parsePolicyJson(text: string): ExtractedPolicy {
  const json = extractJson(text)
  const value = JSON.parse(json) as unknown

  return validateExtractedPolicy(value)
}

export function validateExtractedPolicy(value: unknown): ExtractedPolicy {
  if (!isObject(value)) {
    throw new Error('Policy extraction result must be an object')
  }

  const name = String(value.name ?? '').trim()
  const description = String(value.description ?? '').trim()

  if (!name) {
    throw new Error('Policy name is required')
  }

  if (!Array.isArray(value.criteria) || value.criteria.length === 0) {
    throw new Error('At least one criterion is required')
  }

  const criteria = value.criteria.map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Criterion ${index + 1} must be an object`)
    }

    const label = String(item.label ?? '').trim()
    const points = Number(item.points)
    const criterionDescription = String(item.description ?? '').trim()

    if (!label) {
      throw new Error(`Criterion ${index + 1} label is required`)
    }

    if (!Number.isFinite(points) || points <= 0) {
      throw new Error(`Criterion ${index + 1} points must be positive`)
    }

    return {
      label,
      points,
      description: criterionDescription,
    }
  })

  return {
    name,
    description,
    criteria,
  }
}

export function toDraftPolicyPayload(policy: ExtractedPolicy): PolicyPayload {
  return {
    name: policy.name.slice(0, 200),
    description: policy.description.slice(0, 2000),
    active: false,
    criteria: policy.criteria.map((criterion) => ({
      id: `criterion-${crypto.randomUUID()}`,
      label: criterion.label,
      points: criterion.points,
      description: criterion.description,
    })),
  }
}

export function truncateMarkdown(markdown: string, maxChars: number) {
  if (markdown.length <= maxChars) {
    return markdown
  }

  return markdown.slice(0, maxChars)
}

function extractJson(text: string) {
  const trimmed = text.trim()

  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    if (withoutFence.startsWith('{')) {
      return withoutFence
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')

  if (start < 0 || end < start) {
    throw new Error('LLM response did not contain JSON')
  }

  return trimmed.slice(start, end + 1)
}
