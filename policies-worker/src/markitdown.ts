import { readFile } from 'node:fs/promises'
import Docker from 'dockerode'
import type { WorkerConfig } from './config'

export class MarkItDownRunner {
  private docker = new Docker({ socketPath: '/var/run/docker.sock' })

  constructor(private readonly config: WorkerConfig) {}

  async convert(inputPath: string, outputPath: string) {
    const containerName = `markitdown-${Date.now()}-${crypto.randomUUID()}`
    const container = await this.docker.createContainer({
      Image: this.config.markitdownImage,
      name: containerName,
      Cmd: [inputPath, '-o', outputPath],
      HostConfig: {
        AutoRemove: false,
        Binds: [`${this.config.runsVolumeName}:${this.config.runsDir}:rw`],
        CapDrop: ['ALL'],
        Memory: 512 * 1024 * 1024,
        NanoCpus: 1_000_000_000,
        NetworkMode: this.config.markitdownNetwork,
        PidsLimit: 128,
        SecurityOpt: ['no-new-privileges'],
        Tmpfs: {
          '/tmp': 'rw,nosuid,size=256m',
        },
      },
    })

    try {
      await container.start()
      const waitResult = await withTimeout(
        container.wait(),
        this.config.conversionTimeoutMs,
        async () => {
          await container.stop({ t: 5 }).catch(() => undefined)
        }
      )

      if (waitResult.StatusCode !== 0) {
        const logsBuffer = await container.logs({
          stdout: true,
          stderr: true,
        })
        const logs = logsBuffer.toString('utf8')
        throw new Error(`MarkItDown failed with ${waitResult.StatusCode}: ${logs}`)
      }

      const output = await readFile(outputPath, 'utf8')

      if (!output.trim()) {
        throw new Error('MarkItDown produced empty Markdown')
      }

      return output
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
            reject(new Error(`MarkItDown timed out after ${timeoutMs}ms`))
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
