migrate((app) => {
  const submissions = app.findCollectionByNameOrId('submissions')
  const status = submissions.fields.getByName('status')

  status.values = ['pending', 'grading', 'needs_review', 'graded', 'failed']
  app.save(submissions)

  app.db().newQuery(`
    UPDATE submissions
    SET status = 'needs_review'
    WHERE status = 'graded'
      AND COALESCE(json_array_length(manualGrades), 0) = 0
      AND id IN (SELECT submission FROM results)
  `).execute()
}, (app) => {
  app.db().newQuery(`
    UPDATE submissions
    SET status = 'pending'
    WHERE status = 'needs_review'
  `).execute()

  const submissions = app.findCollectionByNameOrId('submissions')
  const status = submissions.fields.getByName('status')

  status.values = ['pending', 'grading', 'graded', 'failed']
  app.save(submissions)
})
