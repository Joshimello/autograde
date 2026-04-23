import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WorkerConfig } from './config'

type DeployCreationResponse = {
  id: string
  required?: string[]
}

type DeployStateResponse = {
  id: string
  state?: string
  deploy_url?: string
  deploy_ssl_url?: string
  ssl_url?: string
  url?: string
  summary?: {
    message?: string
  }
  error_message?: string
}

type ManifestEntry = {
  digest: string
  absolutePath: string
}

export function createNetlifyClient(config: WorkerConfig) {
  async function deployDirectory(
    directory: string,
    onProgress?: (message: string) => Promise<void>
  ) {
    const manifest = await buildFileManifest(directory)

    if (manifest.files.size === 0) {
      throw new Error('Build output directory is empty')
    }

    const response = await request<DeployCreationResponse>(
      config,
      `/sites/${config.netlifySiteId}/deploys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft: true,
          files: Object.fromEntries(
            Array.from(manifest.files.entries()).map(([filePath, entry]) => [
              filePath,
              entry.digest,
            ])
          ),
        }),
      }
    )

    if (!response.id) {
      throw new Error('Netlify did not return a deploy id')
    }

    const requiredDigests = Array.isArray(response.required) ? response.required : []

    if (requiredDigests.length > 0) {
      await onProgress?.(
        `Uploading ${requiredDigests.length} file${requiredDigests.length === 1 ? '' : 's'} to Netlify`
      )
    }

    for (const digest of requiredDigests) {
      const entry = manifest.byDigest.get(digest)

      if (!entry) {
        throw new Error(`Netlify requested unknown file digest ${digest}`)
      }

      await uploadFile(config, response.id, entry.absolutePath, entry.filePath)
    }

    return await waitUntilReady(config, response.id, onProgress)
  }

  return {
    deployDirectory,
  }
}

async function waitUntilReady(
  config: WorkerConfig,
  deployId: string,
  onProgress?: (message: string) => Promise<void>
) {
  const startedAt = Date.now()
  let lastState = ''

  while (Date.now() - startedAt < config.deployReadyTimeoutMs) {
    const deploy = await request<DeployStateResponse>(
      config,
      `/deploys/${deployId}`,
      {
        method: 'GET',
      }
    )

    if (deploy.state === 'ready') {
      return {
        deployId,
        url:
          deploy.deploy_ssl_url ||
          deploy.deploy_url ||
          deploy.ssl_url ||
          deploy.url ||
          '',
      }
    }

    if (deploy.state === 'error') {
      throw new Error(
        deploy.error_message ||
          deploy.summary?.message ||
          `Netlify deploy ${deployId} failed`
      )
    }

    const nextState = String(deploy.state || 'processing')

    if (nextState !== lastState) {
      lastState = nextState
      await onProgress?.(
        `Waiting for Netlify deploy ${deployId} (${nextState})`
      )
    }

    await sleep(config.deployPollIntervalMs)
  }

  throw new Error(`Timed out waiting for Netlify deploy ${deployId}`)
}

async function uploadFile(
  config: WorkerConfig,
  deployId: string,
  absolutePath: string,
  filePath: string
) {
  const body = await readFile(absolutePath)
  const encodedPath = filePath
    .replace(/^\//, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const response = await fetch(
    `${config.netlifyApiBase}/deploys/${deployId}/files/${encodedPath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.netlifyApiToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body,
    }
  )

  if (!response.ok) {
    throw new Error(
      `Netlify file upload failed (${response.status}): ${await response.text()}`
    )
  }
}

async function request<T>(
  config: WorkerConfig,
  pathName: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(`${config.netlifyApiBase}${pathName}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.netlifyApiToken}`,
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(
      `Netlify request failed (${response.status}): ${await response.text()}`
    )
  }

  return (await response.json()) as T
}

async function buildFileManifest(directory: string) {
  const files = new Map<string, ManifestEntry>()
  const byDigest = new Map<string, { absolutePath: string; filePath: string }>()

  for (const file of await listFiles(directory)) {
    const relativePath = path.relative(directory, file)
    const filePath = `/${toPosixPath(relativePath)}`
    const digest = sha1(await readFile(file))
    const entry = {
      digest,
      absolutePath: file,
    }

    files.set(filePath, entry)

    if (!byDigest.has(digest)) {
      byDigest.set(digest, {
        absolutePath: file,
        filePath,
      })
    }
  }

  return {
    files,
    byDigest,
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath)))
      continue
    }

    if (entry.isFile()) {
      files.push(absolutePath)
    }
  }

  return files.sort((first, second) => first.localeCompare(second))
}

function sha1(value: Uint8Array) {
  return createHash('sha1').update(value).digest('hex')
}

function toPosixPath(value: string) {
  return value.split(path.sep).join('/')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const internal = {
  buildFileManifest,
  toPosixPath,
}
