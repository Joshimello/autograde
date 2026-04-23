export type WorkerConfig = {
  pocketbaseUrl: string
  pocketbaseEmail: string
  pocketbasePassword: string
  workerId: string
  pollIntervalMs: number
  markitdownImage: string
  markitdownNetwork: string
  runsDir: string
  runsVolumeName: string
  conversionTimeoutMs: number
  llmTimeoutMs: number
  markdownPreviewMaxChars: number
  openaiBaseUrl: string
  openaiApiKey: string
  openaiModel: string
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback
}

function firstDefinedEnv(names: string[], fallback: string) {
  for (const name of names) {
    const value = process.env[name]

    if (value) {
      return value
    }
  }

  return fallback
}

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const value = Number(raw)

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`)
  }

  return value
}

export function loadConfig(): WorkerConfig {
  return {
    pocketbaseUrl: optionalEnv('POCKETBASE_URL', 'http://127.0.0.1:8090'),
    pocketbaseEmail: requiredEnv('POCKETBASE_ADMIN_EMAIL'),
    pocketbasePassword: requiredEnv('POCKETBASE_ADMIN_PASSWORD'),
    workerId: optionalEnv('WORKER_ID', `policies-worker-${crypto.randomUUID()}`),
    pollIntervalMs: numberEnv('POLICIES_WORKER_POLL_INTERVAL_MS', 3000),
    markitdownImage: optionalEnv('MARKITDOWN_IMAGE', 'markitdown:latest'),
    markitdownNetwork: optionalEnv('MARKITDOWN_NETWORK', 'autograde_runtime'),
    runsDir: optionalEnv('POLICIES_WORKER_RUNS_DIR', '/policy-runs'),
    runsVolumeName: optionalEnv(
      'POLICIES_WORKER_RUNS_VOLUME',
      'autograde_policies_worker_runs'
    ),
    conversionTimeoutMs: numberEnv('POLICY_IMPORT_CONVERSION_TIMEOUT_MS', 180000),
    llmTimeoutMs: numberEnv('POLICY_IMPORT_LLM_TIMEOUT_MS', 300000),
    markdownPreviewMaxChars: numberEnv('POLICY_IMPORT_MARKDOWN_PREVIEW_CHARS', 20000),
    openaiBaseUrl: firstDefinedEnv(
      ['POLICIES_OPENAI_BASE_URL', 'OPENAI_BASE_URL'],
      'https://api.openai.com/v1'
    ),
    openaiApiKey:
      process.env.POLICIES_OPENAI_API_KEY || requiredEnv('OPENAI_API_KEY'),
    openaiModel: firstDefinedEnv(
      ['POLICIES_OPENAI_MODEL', 'OPENAI_MODEL'],
      'gpt-4.1-mini'
    ),
  }
}
