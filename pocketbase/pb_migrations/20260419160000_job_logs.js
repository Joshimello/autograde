migrate((app) => {
  const appRule = '@request.auth.id != "" && @request.auth.allowed = true'
  const jobs = app.findCollectionByNameOrId('jobs')

  try {
    app.findCollectionByNameOrId('job_logs')
    return
  } catch (_) {
    // Collection does not exist yet.
  }

  const jobLogs = new Collection({
    type: 'base',
    name: 'job_logs',
    indexes: [
      'CREATE INDEX idx_job_logs_job ON job_logs (job)',
      'CREATE INDEX idx_job_logs_sequence ON job_logs (sequence)',
    ],
  })

  jobLogs.fields.add(
    new RelationField({
      name: 'job',
      required: true,
      collectionId: jobs.id,
      maxSelect: 1,
      cascadeDelete: true,
    }),
    new NumberField({
      name: 'sequence',
      required: true,
      min: 1,
    }),
    new SelectField({
      name: 'stream',
      required: true,
      maxSelect: 1,
      values: ['stdout', 'stderr', 'system'],
    }),
    new TextField({
      name: 'message',
      required: true,
      max: 10000,
    })
  )

  jobLogs.listRule = appRule
  jobLogs.viewRule = appRule
  jobLogs.createRule = null
  jobLogs.updateRule = null
  jobLogs.deleteRule = null
  app.save(jobLogs)
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId('job_logs'))
  } catch (_) {
    // Collection is already absent.
  }
})
