import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Docker from 'dockerode'
import type { WorkerConfig } from './config'
import {
  JobCanceledError,
  type RunnerInput,
  type RunnerLogSink,
  type RunnerOutput,
} from './types'
import { parseRunnerResult } from './result'

export class DockerRunner {
  private docker = new Docker({ socketPath: '/var/run/docker.sock' })

  constructor(private readonly config: WorkerConfig) {}

  async run(
    input: RunnerInput,
    shouldCancel?: () => Promise<boolean>,
    onLog?: RunnerLogSink
  ): Promise<RunnerOutput> {
    const policyPath = path.join(input.outputDir, 'policy.json')
    const resultPath = path.join(input.outputDir, 'result.json')
    const containerName = `submission-runner-${input.submission.id}-${crypto.randomUUID()}`
    const container = await this.docker.createContainer({
      Image: this.config.runnerImage,
      name: containerName,
      Tty: true,
      Env: [
        `SUBMISSION_LABEL=${input.submission.label}`,
        ...(this.config.openaiBaseUrl
          ? [`OPENAI_BASE_URL=${this.config.openaiBaseUrl}`]
          : []),
        `OPENAI_API_KEY=${this.config.openaiApiKey}`,
        `OPENAI_MODEL=${this.config.openaiModel}`,
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
      const attached = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      })
      const liveLog = collectLiveLogs(attached, onLog)
      await container.start()
      const cancelPoll = pollForCancellation(async () => {
        if (await shouldCancel?.()) {
          await container.stop({ t: 5 }).catch(() => undefined)
          throw new JobCanceledError()
        }
      })
      const waitResult = await withTimeout(
        Promise.race([container.wait(), cancelPoll]),
        this.config.jobTimeoutMs,
        async () => {
          await container.stop({ t: 5 }).catch(() => undefined)
        }
      )
      await Promise.race([liveLog, sleep(1000)])
      destroyStream(attached)
      await liveLog.catch(() => undefined)
      const logsBuffer = await container.logs({
        stdout: true,
        stderr: true,
      })
      const logs = sanitizeDockerLogs(logsBuffer.toString('utf8'))

      if (waitResult.StatusCode !== 0) {
        const diagnostics = await readOptional(path.join(input.outputDir, 'diagnostics.json'))
        const resultJson = await readOptional(resultPath)
        throw new Error(
          [
            `submission-runner exited with ${waitResult.StatusCode}`,
            diagnostics ? `diagnostics.json:\n${diagnostics}` : '',
            resultJson ? `result.json:\n${resultJson}` : '',
            logs ? `container logs:\n${logs}` : '',
          ]
            .filter(Boolean)
            .join('\n\n')
        )
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

async function collectLiveLogs(
  stream: NodeJS.ReadWriteStream,
  onLog?: RunnerLogSink
) {
  if (!onLog) {
    stream.resume()
    return
  }

  for await (const chunk of stream as AsyncIterable<Buffer>) {
    const message = sanitizeDockerLogs(String(chunk))

    if (message.trim()) {
      process.stdout.write(message.endsWith('\n') ? message : `${message}\n`)
      await onLog('stdout', message).catch((cause) => {
        console.error('Failed to persist runner log', cause)
      })
    }
  }
}

async function readOptional(filePath: string) {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function pollForCancellation(check: () => Promise<void>): Promise<never> {
  while (true) {
    await check()
    await sleep(1000)
  }
}

function sanitizeDockerLogs(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

function destroyStream(stream: NodeJS.ReadWriteStream) {
  if ('destroy' in stream && typeof stream.destroy === 'function') {
    stream.destroy()
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
