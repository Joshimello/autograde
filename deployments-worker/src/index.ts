import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { loadConfig } from './config'
import { DockerRunner } from './docker'
import { createNetlifyClient } from './netlify'
import { createPocketBaseClient } from './pocketbase'
import { JobCanceledError, type JobRecord } from './types'

const config = loadConfig()
const pb = createPocketBaseClient(config)
const runner = new DockerRunner(config)
const netlify = createNetlifyClient(config)
const activeJobs = new Set<Promise<void>>()

async function main() {
  await authenticateWithRetry()
  console.log(
    `deployments-worker started as ${config.workerId} with concurrency ${config.runnerConcurrency}`
  )

  while (true) {
    await fillRunnerSlots().catch((cause) => {
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

async function fillRunnerSlots() {
  while (activeJobs.size < config.runnerConcurrency) {
    const job = await pb.claimNextJob()

    if (!job) {
      return
    }

    const task = processJob(job).finally(() => {
      activeJobs.delete(task)
    })
    activeJobs.add(task)
  }
}

async function processJob(job: JobRecord) {
  const runDir = path.join(config.runsDir, job.id)
  let deploymentId: string | null = null

  try {
    await pb.appendJobLog(job.id, 'system', 'Claimed deployment job')
    await pb.prepareRunDir(runDir)
    await pb.appendJobLog(job.id, 'system', 'Prepared deployment run directory')
    const input = await pb.loadJobInput(job, runDir)
    deploymentId = input.deployment.id
    await pb.appendJobLog(job.id, 'system', 'Downloaded submission archive')
    await pb.markJobProgress(job.id, input.deployment.id, 20, 'Building preview')
    const result = await runner.run(
      input,
      () => pb.isJobCanceled(job.id),
      (stream, message) => pb.appendJobLog(job.id, stream, message)
    )

    if (await pb.isJobCanceled(job.id)) {
      throw new JobCanceledError()
    }

    if (!existsSync(path.join(input.siteDir, 'index.html'))) {
      throw new Error('Build completed without a deployable index.html output')
    }

    await pb.markJobProgress(
      job.id,
      input.deployment.id,
      60,
      'Uploading preview to Netlify'
    )
    const deploy = await netlify.deployDirectory(input.siteDir, async (message) => {
      await pb.markJobProgress(job.id, input.deployment.id, 80, message)
    })

    if (await pb.isJobCanceled(job.id)) {
      throw new JobCanceledError()
    }

    const deployUrl = deploy.url.trim()

    if (!deployUrl) {
      throw new Error('Netlify deploy completed without a preview URL')
    }

    await pb.appendJobLog(
      job.id,
      'system',
      `Build summary: ${result.buildLogSummary || 'Build passed.'}`
    )
    await pb.finishJob(job, input.deployment.id, deploy.deployId, deployUrl)
  } catch (cause) {
    if (cause instanceof JobCanceledError) {
      await pb.cancelJob(job, deploymentId)
      return
    }

    console.error(`Deployment job ${job.id} failed`, cause)
    const nextDeploymentId =
      deploymentId ?? (await pb.getDeploymentForJob(job, false))?.id ?? null
    await pb.failJob(job, nextDeploymentId, cause)
  } finally {
    await rm(runDir, { recursive: true, force: true }).catch((cause) => {
      console.error(`Failed to clean deployment run directory ${runDir}`, cause)
    })
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

void main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
