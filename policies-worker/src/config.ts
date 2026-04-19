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
  markdownPreviewMaxChars: number
  anthropicBaseUrl: string
  anthropicAuthToken: string
  anthropicModel: string
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback
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
    markdownPreviewMaxChars: numberEnv('POLICY_IMPORT_MARKDOWN_PREVIEW_CHARS', 20000),
    anthropicBaseUrl: requiredEnv('ANTHROPIC_BASE_URL'),
    anthropicAuthToken: requiredEnv('ANTHROPIC_AUTH_TOKEN'),
    anthropicModel: requiredEnv('ANTHROPIC_MODEL'),
  }
}
