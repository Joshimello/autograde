import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import PocketBase from 'pocketbase'
import type { WorkerConfig } from './config'
import type { PolicyPayload } from './policy'
import type { PolicyImportRecord } from './types'

export function createPocketBaseClient(config: WorkerConfig) {
  const pb = new PocketBase(config.pocketbaseUrl)
  pb.autoCancellation(false)

  async function authenticate() {
    await pb
      .collection('_superusers')
      .authWithPassword(config.pocketbaseEmail, config.pocketbasePassword)
  }

  async function claimNextImport() {
    let policyImport: PolicyImportRecord

    try {
      policyImport = (await pb
        .collection('policy_imports')
        .getFirstListItem('status = "queued"')) as unknown as PolicyImportRecord
    } catch (cause) {
      if (isNotFound(cause)) {
        return null
      }

      throw cause
    }

    return (await pb.collection('policy_imports').update(policyImport.id, {
      status: 'running',
      progress: 5,
      startedAt: new Date().toISOString(),
      message: 'Preparing document',
      error: '',
    })) as unknown as PolicyImportRecord
  }

  async function prepareRunDir(runDir: string) {
    await rm(runDir, { recursive: true, force: true })
    await mkdir(runDir, { recursive: true })
  }

  async function downloadSource(policyImport: PolicyImportRecord, runDir: string) {
    const sourcePath = path.join(runDir, policyImport.sourceFile)
    const url = pb.files.getURL(policyImport, policyImport.sourceFile)
    const response = await fetch(url, {
      headers: {
        Authorization: pb.authStore.token,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download policy import source: ${response.status}`)
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    await writeFile(sourcePath, bytes)

    return sourcePath
  }

  async function markProgress(id: string, progress: number, message: string) {
    await pb.collection('policy_imports').update(id, {
      progress,
      message,
    })
  }

  async function finishImport(
    policyImport: PolicyImportRecord,
    payload: PolicyPayload,
    markdownPreview: string
  ) {
    const policy = await pb.collection('policies').create(payload)

    await pb.collection('policy_imports').update(policyImport.id, {
      status: 'succeeded',
      progress: 100,
      message: 'Policy draft created',
      policy: policy.id,
      markdownPreview,
      finishedAt: new Date().toISOString(),
      error: '',
    })
  }

  async function failImport(policyImport: PolicyImportRecord, cause: unknown) {
    const message = formatError(cause)

    await pb.collection('policy_imports').update(policyImport.id, {
      status: 'failed',
      message: message.slice(0, 2000),
      error: message.slice(0, 5000),
      finishedAt: new Date().toISOString(),
    })
  }

  return {
    authenticate,
    claimNextImport,
    downloadSource,
    failImport,
    finishImport,
    markProgress,
    prepareRunDir,
  }
}

function isNotFound(cause: unknown) {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'status' in cause &&
    cause.status === 404
  )
}

function formatError(cause: unknown) {
  if (cause instanceof Error) {
    return cause.stack || cause.message
  }

  return String(cause)
}
