migrate((app) => {
  const deployments = app.findCollectionByNameOrId('deployments')
  const jobs = app.findCollectionByNameOrId('jobs')

  function addField(collection, field) {
    try {
      collection.fields.getByName(field.name)
    } catch (_) {
      collection.fields.add(field)
    }
  }

  addField(
    deployments,
    new RelationField({
      name: 'job',
      collectionId: jobs.id,
      maxSelect: 1,
      cascadeDelete: true,
    })
  )
  addField(
    deployments,
    new TextField({
      name: 'deployId',
      max: 200,
    })
  )
  addField(
    deployments,
    new TextField({
      name: 'error',
      max: 5000,
    })
  )

  app.save(deployments)
}, (app) => {
  const deployments = app.findCollectionByNameOrId('deployments')

  for (const name of ['job', 'deployId', 'error']) {
    try {
      deployments.fields.removeByName(name)
    } catch (_) {
      // Field is already absent.
    }
  }

  app.save(deployments)
})
