migrate((app) => {
  const appRule = '@request.auth.id != "" && @request.auth.allowed = true'
  const jobLogs = app.findCollectionByNameOrId('job_logs')

  jobLogs.listRule = appRule
  jobLogs.viewRule = appRule
  jobLogs.createRule = null
  jobLogs.updateRule = null
  jobLogs.deleteRule = null

  app.save(jobLogs)
}, (app) => {
  const appRule = '@request.auth.id != "" && @request.auth.allowed = true'
  const jobLogs = app.findCollectionByNameOrId('job_logs')

  jobLogs.listRule = appRule
  jobLogs.viewRule = appRule
  jobLogs.createRule = appRule
  jobLogs.updateRule = appRule
  jobLogs.deleteRule = appRule

  app.save(jobLogs)
})
