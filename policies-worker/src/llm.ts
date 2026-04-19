import type { WorkerConfig } from './config'
import { parsePolicyJson, type ExtractedPolicy } from './policy'

export async function extractPolicyWithLlm(
  config: WorkerConfig,
  markdown: string
): Promise<ExtractedPolicy> {
  const url = `${config.anthropicBaseUrl.replace(/\/$/, '')}/v1/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.anthropicAuthToken,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: buildPrompt(markdown),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${await response.text()}`)
  }

  const body = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const text =
    body.content
      ?.map((part) => (part.type === 'text' ? part.text ?? '' : ''))
      .join('\n')
      .trim() ?? ''

  if (!text) {
    throw new Error('LLM response did not include text content')
  }

  return parsePolicyJson(text)
}

function buildPrompt(markdown: string) {
  return `Extract a grading policy from this document. Return only valid JSON with this exact shape:
{
  "name": "Policy name",
  "description": "Short description",
  "criteria": [
    {
      "label": "Criterion label",
      "points": 10,
      "description": "What this criterion evaluates"
    }
  ]
}

Rules:
- Use explicit rubric criteria from the document when present.
- Preserve point values when present.
- If the document describes grading without exact points, assign reasonable positive points.
- Do not include markdown fences or explanatory prose.

Document:
${markdown}`
}
