onRecordAfterCreateSuccess((event) => {
  event.next()

  const app = event.app || $app
  const record = event.record

  try {
    const jobs = app.findCollectionByNameOrId('jobs')
    const deployments = app.findCollectionByNameOrId('deployments')
    const job = new Record(jobs)

    job.set('submission', record.id)
    job.set('type', 'deployment')
    job.set('status', 'queued')
    job.set('progress', 0)
    job.set('message', 'Queued')
    app.save(job)

    const deployment = new Record(deployments)
    deployment.set('submission', record.id)
    deployment.set('job', job.id)
    deployment.set('status', 'queued')
    deployment.set('message', 'Queued')
    app.save(deployment)
  } catch (error) {
    console.log(
      `Failed to auto-queue deployment for submission ${record.id}: ${String(error)}`
    )
  }
}, 'submissions')
