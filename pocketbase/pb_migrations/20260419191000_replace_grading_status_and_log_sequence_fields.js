migrate((app) => {
  const submissions = app.findCollectionByNameOrId('submissions')
  const currentStatus = submissions.fields.getByName('status')
  submissions.fields.add(new SelectField({
    id: currentStatus.id,
    name: 'status',
    required: true,
    maxSelect: 1,
    values: ['pending', 'grading', 'needs_review', 'graded', 'failed'],
  }))
  app.save(submissions)

  const jobLogs = app.findCollectionByNameOrId('job_logs')
  const currentSequence = jobLogs.fields.getByName('sequence')
  jobLogs.fields.add(new NumberField({
    id: currentSequence.id,
    name: 'sequence',
    required: true,
    min: 1,
  }))
  app.save(jobLogs)

  app.db().newQuery(`
    UPDATE job_logs
    SET sequence = sequence + 1
    WHERE sequence = 0
  `).execute()
}, (app) => {
  const jobLogs = app.findCollectionByNameOrId('job_logs')
  const currentSequence = jobLogs.fields.getByName('sequence')
  jobLogs.fields.add(new NumberField({
    id: currentSequence.id,
    name: 'sequence',
    required: true,
    min: 0,
  }))
  app.save(jobLogs)

  const submissions = app.findCollectionByNameOrId('submissions')
  const currentStatus = submissions.fields.getByName('status')
  submissions.fields.add(new SelectField({
    id: currentStatus.id,
    name: 'status',
    required: true,
    maxSelect: 1,
    values: ['pending', 'grading', 'graded', 'failed'],
  }))
  app.save(submissions)
})
