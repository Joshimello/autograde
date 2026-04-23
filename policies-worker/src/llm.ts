import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { WorkerConfig } from './config'
import { parsePolicyJson, type ExtractedPolicy } from './policy'

export async function extractPolicyWithLlm(
  config: WorkerConfig,
  markdown: string,
  runDir: string
): Promise<ExtractedPolicy> {
  const promptPath = path.join(runDir, 'policy-prompt.md')
  const schemaPath = path.join(runDir, 'policy-output-schema.json')
  const outputPath = path.join(runDir, 'policy-agent-output.json')
  const codexHome = path.join(runDir, '.codex-home')
  const prompt = buildPrompt(markdown)

  await writeFile(promptPath, prompt, 'utf8')
  await writeFile(schemaPath, JSON.stringify(buildOutputSchema(), null, 2), 'utf8')
  await rm(codexHome, { recursive: true, force: true })
  await mkdir(codexHome, { recursive: true })

  try {
    const configArgs = buildConfigArgs(config)
    const login = await runCommand(
      'codex',
      ['login', '--with-api-key', ...configArgs],
      {
        cwd: runDir,
        env: buildEnv(config, codexHome),
        input: `${config.openaiApiKey}\n`,
        timeoutMs: 60000,
      }
    )

    if (login.exitCode !== 0) {
      throw new Error(`Codex login failed: ${trim(login.output, 4000)}`)
    }

    const execResult = await runCommand(
      'codex',
      [
        'exec',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--ephemeral',
        '--ignore-user-config',
        '--output-schema',
        schemaPath,
        '--output-last-message',
        outputPath,
        '--color',
        'never',
        '-m',
        config.openaiModel,
        ...configArgs,
        '-',
      ],
      {
        cwd: runDir,
        env: buildEnv(config, codexHome),
        input: prompt,
        timeoutMs: config.llmTimeoutMs,
      }
    )

    const outputText = await readOptional(outputPath)
    const agentOutput = outputText.trim() ? outputText : execResult.output

    if (execResult.exitCode !== 0) {
      throw new Error(`Codex failed: ${trim(agentOutput, 4000)}`)
    }

    return parsePolicyJson(agentOutput)
  } finally {
    await rm(codexHome, { recursive: true, force: true }).catch(() => undefined)
  }
}

function buildEnv(config: WorkerConfig, codexHome: string) {
  return {
    ...process.env,
    OPENAI_API_KEY: config.openaiApiKey,
    OPENAI_MODEL: config.openaiModel,
    ...(config.openaiBaseUrl ? { OPENAI_BASE_URL: config.openaiBaseUrl } : {}),
    CODEX_HOME: codexHome,
  }
}

function buildConfigArgs(config: WorkerConfig) {
  if (!config.openaiBaseUrl) {
    return []
  }

  return ['-c', `openai_base_url=${JSON.stringify(config.openaiBaseUrl)}`]
}

function buildOutputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'criteria'],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'points', 'description'],
          properties: {
            label: { type: 'string' },
            points: { type: 'number' },
            description: { type: 'string' },
          },
        },
      },
    },
  }
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

async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd: string
    env: NodeJS.ProcessEnv
    input?: string
    timeoutMs: number
  }
) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutChunks.push(chunk)
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk)
  })

  if (options.input) {
    child.stdin.write(options.input)
  }
  child.stdin.end()

  const exitCode = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`${command} timed out after ${options.timeoutMs}ms`))
    }, options.timeoutMs)

    child.on('error', (cause) => {
      clearTimeout(timeout)
      reject(cause)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve(code ?? 1)
    })
  })

  return {
    exitCode,
    output: `${Buffer.concat(stdoutChunks).toString('utf8')}${Buffer.concat(
      stderrChunks
    ).toString('utf8')}`.trim(),
  }
}

async function readOptional(filePath: string) {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

function trim(value: string, limit: number) {
  return value.length <= limit ? value : value.slice(-limit)
}
