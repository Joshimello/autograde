export type WorkerConfig = {
  pocketbaseUrl: string
  pocketbaseEmail: string
  pocketbasePassword: string
  workerId: string
  pollIntervalMs: number
  runnerConcurrency: number
  runnerImage: string
  runnerNetwork: string
  runsDir: string
  runsVolumeName: string
  jobTimeoutMs: number
  runnerMemoryBytes: number
  runnerNanoCpus: number
  runnerPidsLimit: number
  netlifyApiBase: string
  netlifyApiToken: string
  netlifySiteId: string
  deployPollIntervalMs: number
  deployReadyTimeoutMs: number
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

function integerEnv(name: string, fallback: number) {
  const value = numberEnv(name, fallback)

  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`)
  }

  return value
}

export function loadConfig(): WorkerConfig {
  return {
    pocketbaseUrl: optionalEnv('POCKETBASE_URL', 'http://127.0.0.1:8090'),
    pocketbaseEmail: requiredEnv('POCKETBASE_ADMIN_EMAIL'),
    pocketbasePassword: requiredEnv('POCKETBASE_ADMIN_PASSWORD'),
    workerId: optionalEnv('WORKER_ID', `deployments-worker-${crypto.randomUUID()}`),
    pollIntervalMs: numberEnv('DEPLOYMENTS_WORKER_POLL_INTERVAL_MS', 3000),
    runnerConcurrency: integerEnv('DEPLOYMENTS_WORKER_CONCURRENCY', 1),
    runnerImage: optionalEnv('DEPLOYMENT_RUNNER_IMAGE', 'autograde-deployment-runner:latest'),
    runnerNetwork: optionalEnv('DEPLOYMENT_RUNNER_NETWORK', 'autograde_runtime'),
    runsDir: optionalEnv('DEPLOYMENTS_WORKER_RUNS_DIR', '/deployment-runs'),
    runsVolumeName: optionalEnv(
      'DEPLOYMENTS_WORKER_RUNS_VOLUME',
      'autograde_deployments_worker_runs'
    ),
    jobTimeoutMs: numberEnv('DEPLOYMENT_JOB_TIMEOUT_MS', 10 * 60 * 1000),
    runnerMemoryBytes: numberEnv('DEPLOYMENT_RUNNER_MEMORY_BYTES', 1024 * 1024 * 1024),
    runnerNanoCpus: numberEnv('DEPLOYMENT_RUNNER_NANO_CPUS', 1_000_000_000),
    runnerPidsLimit: numberEnv('DEPLOYMENT_RUNNER_PIDS_LIMIT', 256),
    netlifyApiBase: optionalEnv(
      'NETLIFY_API_BASE',
      'https://api.netlify.com/api/v1'
    ).replace(/\/$/, ''),
    netlifyApiToken: requiredEnv('NETLIFY_API_TOKEN'),
    netlifySiteId: requiredEnv('NETLIFY_SITE_ID'),
    deployPollIntervalMs: numberEnv('NETLIFY_DEPLOY_POLL_INTERVAL_MS', 2000),
    deployReadyTimeoutMs: numberEnv('NETLIFY_DEPLOY_READY_TIMEOUT_MS', 2 * 60 * 1000),
  }
}
