migrate((app) => {
  const jobs = app.findCollectionByNameOrId('jobs')
  const results = app.findCollectionByNameOrId('results')

  function addField(collection, field) {
    try {
      collection.fields.getByName(field.name)
    } catch (_) {
      collection.fields.add(field)
    }
  }

  addField(
    jobs,
    new TextField({
      name: 'workerId',
      max: 200,
    })
  )
  addField(
    jobs,
    new NumberField({
      name: 'attempts',
      min: 0,
    })
  )
  addField(
    jobs,
    new TextField({
      name: 'error',
      max: 5000,
    })
  )
  app.save(jobs)

  addField(
    results,
    new SelectField({
      name: 'buildStatus',
      maxSelect: 1,
      values: ['passed', 'failed', 'skipped'],
    })
  )
  addField(
    results,
    new TextField({
      name: 'buildLogSummary',
      max: 5000,
    })
  )
  app.save(results)
}, (app) => {
  const jobs = app.findCollectionByNameOrId('jobs')
  const results = app.findCollectionByNameOrId('results')

  for (const name of ['workerId', 'attempts', 'error']) {
    try {
      jobs.fields.removeByName(name)
    } catch (_) {
      // Field is already absent.
    }
  }
  app.save(jobs)

  for (const name of ['buildStatus', 'buildLogSummary']) {
    try {
      results.fields.removeByName(name)
    } catch (_) {
      // Field is already absent.
    }
  }
  app.save(results)
})
