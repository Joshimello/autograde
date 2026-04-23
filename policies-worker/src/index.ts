import path from 'node:path'
import { loadConfig } from './config'
import { extractPolicyWithLlm } from './llm'
import { MarkItDownRunner } from './markitdown'
import { createPocketBaseClient } from './pocketbase'
import { toDraftPolicyPayload, truncateMarkdown } from './policy'

const config = loadConfig()
const pb = createPocketBaseClient(config)
const markitdown = new MarkItDownRunner(config)

async function main() {
  await authenticateWithRetry()
  console.log(`policies-worker started as ${config.workerId}`)

  while (true) {
    await tick().catch((cause) => {
      console.error('Policies worker tick failed', cause)
    })
    await sleep(config.pollIntervalMs)
  }
}

async function tick() {
  const policyImport = await pb.claimNextImport()

  if (!policyImport) {
    return
  }

  const runDir = path.join(config.runsDir, policyImport.id)

  try {
    await pb.prepareRunDir(runDir)
    const sourcePath = await pb.downloadSource(policyImport, runDir)
    const markdownPath = path.join(runDir, 'converted.md')
    await pb.markProgress(policyImport.id, 20, 'Converting document')
    const markdown = await markitdown.convert(sourcePath, markdownPath)
    const markdownPreview = truncateMarkdown(
      markdown,
      config.markdownPreviewMaxChars
    )

    await pb.markProgress(policyImport.id, 60, 'Extracting policy')
    const extractedPolicy = await extractPolicyWithLlm(config, markdown, runDir)
    const payload = toDraftPolicyPayload(extractedPolicy)

    await pb.markProgress(policyImport.id, 90, 'Creating draft policy')
    await pb.finishImport(policyImport, payload, markdownPreview)
  } catch (cause) {
    console.error(`Policy import ${policyImport.id} failed`, cause)
    await pb.failImport(policyImport, cause)
  }
}

async function authenticateWithRetry() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await pb.authenticate()
      return
    } catch (cause) {
      if (attempt >= 20) {
        throw cause
      }

      console.log(`PocketBase auth failed, retrying (${attempt}/20)`)
      await sleep(1000)
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

void main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
