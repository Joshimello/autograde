import path from 'node:path'
import { existsSync } from 'node:fs'
import { DockerRunner } from './docker'
import { loadConfig } from './config'
import { createPocketBaseClient } from './pocketbase'

const config = loadConfig()
const pb = createPocketBaseClient(config)
const runner = new DockerRunner(config)

async function main() {
  await authenticateWithRetry()
  console.log(`submissions-worker started as ${config.workerId}`)

  while (true) {
    await tick().catch((cause) => {
      console.error('Worker tick failed', cause)
    })
    await sleep(config.pollIntervalMs)
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

async function tick() {
  const job = await pb.claimNextJob()

  if (!job) {
    return
  }

  const runDir = path.join(config.runsDir, job.id)

  try {
    await pb.appendJobLog(job.id, 'system', 'Claimed grading job')

    if (await pb.isJobCanceled(job.id)) {
      await pb.markJobCanceled(job)
      return
    }

    await pb.prepareRunDir(runDir)
    await pb.appendJobLog(job.id, 'system', 'Prepared worker run directory')
    const input = await pb.loadJobInput(job, runDir)
    await pb.appendJobLog(job.id, 'system', 'Downloaded submission archive')
    await pb.writePolicyInput(path.join(input.outputDir, 'policy.json'), input.policy)
    await pb.appendJobLog(job.id, 'system', 'Wrote policy input')
    await pb.markJobProgress(job.id, 20, 'Running submission sandbox')
    await runner.run(
      input,
      () => pb.isJobCanceled(job.id),
      (stream, message) => pb.appendJobLog(job.id, stream, message)
    )
    await pb.finishJob(job, path.join(input.outputDir, 'result.json'))
  } catch (cause) {
    console.error(`Job ${job.id} failed`, cause)
    const resultPath = path.join(runDir, 'output', 'result.json')

    if (existsSync(resultPath)) {
      await pb.saveFailedResult(job, resultPath).catch((resultCause) => {
        console.error(`Failed to save result for failed job ${job.id}`, resultCause)
      })
    }

    await pb.failJob(job, cause)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

void main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
