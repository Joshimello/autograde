import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Docker from 'dockerode'
import type { WorkerConfig } from './config'
import type { RunnerInput, RunnerOutput } from './types'
import { parseRunnerResult } from './result'

export class DockerRunner {
  private docker = new Docker({ socketPath: '/var/run/docker.sock' })

  constructor(private readonly config: WorkerConfig) {}

  async run(input: RunnerInput): Promise<RunnerOutput> {
    const policyPath = path.join(input.outputDir, 'policy.json')
    const resultPath = path.join(input.outputDir, 'result.json')
    const containerName = `submission-runner-${input.submission.id}-${Date.now()}`
    const container = await this.docker.createContainer({
      Image: this.config.runnerImage,
      name: containerName,
      Env: [
        `SUBMISSION_LABEL=${input.submission.label}`,
        `ANTHROPIC_BASE_URL=${this.config.anthropicBaseUrl}`,
        `ANTHROPIC_AUTH_TOKEN=${this.config.anthropicAuthToken}`,
        `ANTHROPIC_MODEL=${this.config.anthropicModel}`,
        `INPUT_ARCHIVE=${input.archivePath}`,
        `POLICY_PATH=${policyPath}`,
        `OUTPUT_DIR=${input.outputDir}`,
      ],
      HostConfig: {
        AutoRemove: false,
        Binds: [`${this.config.runsVolumeName}:/runs:rw`],
        CapDrop: ['ALL'],
        Memory: this.config.runnerMemoryBytes,
        NanoCpus: this.config.runnerNanoCpus,
        NetworkMode: this.config.runnerNetwork,
        PidsLimit: this.config.runnerPidsLimit,
        SecurityOpt: ['no-new-privileges'],
        Tmpfs: {
          '/tmp': 'rw,nosuid,size=512m',
        },
      },
      User: 'runner',
    })

    try {
      await container.start()
      const waitResult = await withTimeout(
        container.wait(),
        this.config.jobTimeoutMs,
        async () => {
          await container.stop({ t: 5 }).catch(() => undefined)
        }
      )
      const logsBuffer = await container.logs({
        stdout: true,
        stderr: true,
      })
      const logs = logsBuffer.toString('utf8')

      if (waitResult.StatusCode !== 0) {
        throw new Error(`submission-runner exited with ${waitResult.StatusCode}\n${logs}`)
      }

      const raw = await readFile(resultPath, 'utf8')
      const result = parseRunnerResult(JSON.parse(raw))

      return {
        result,
        logs,
      }
    } finally {
      await container.remove({ force: true }).catch(() => undefined)
    }
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Promise<void>
) {
  let timeout: Timer | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          void onTimeout().finally(() =>
            reject(new Error(`Runner timed out after ${timeoutMs}ms`))
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}
