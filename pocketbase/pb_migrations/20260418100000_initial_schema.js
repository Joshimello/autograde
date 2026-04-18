migrate((app) => {
  function applyDevRules(collection) {
    collection.listRule = ''
    collection.viewRule = ''
    collection.createRule = ''
    collection.updateRule = ''
    collection.deleteRule = ''
  }

  const policies = new Collection({
    type: 'base',
    name: 'policies',
    fields: [
      new TextField({
        name: 'name',
        required: true,
        max: 200,
      }),
      new TextField({
        name: 'description',
        max: 2000,
      }),
      new JSONField({
        name: 'criteria',
        required: true,
      }),
      new BoolField({
        name: 'active',
      }),
    ],
    indexes: ['CREATE INDEX idx_policies_active ON policies (active)'],
  })
  applyDevRules(policies)
  app.save(policies)

  const submissions = new Collection({
    type: 'base',
    name: 'submissions',
    fields: [
      new TextField({
        name: 'label',
        required: true,
        max: 200,
      }),
      new RelationField({
        name: 'policy',
        required: true,
        collectionId: policies.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
      new FileField({
        name: 'archive',
        required: true,
        maxSelect: 1,
        maxSize: 104857600,
        mimeTypes: [
          'application/zip',
          'application/x-zip-compressed',
          'multipart/x-zip',
        ],
      }),
      new SelectField({
        name: 'status',
        required: true,
        maxSelect: 1,
        values: ['pending', 'grading', 'graded', 'failed'],
      }),
      new JSONField({
        name: 'manualGrades',
      }),
      new NumberField({
        name: 'manualScore',
        min: 0,
      }),
    ],
    indexes: [
      'CREATE INDEX idx_submissions_policy ON submissions (policy)',
      'CREATE INDEX idx_submissions_status ON submissions (status)',
    ],
  })
  applyDevRules(submissions)
  app.save(submissions)

  const jobs = new Collection({
    type: 'base',
    name: 'jobs',
    fields: [
      new RelationField({
        name: 'submission',
        required: true,
        collectionId: submissions.id,
        maxSelect: 1,
        cascadeDelete: true,
      }),
      new SelectField({
        name: 'type',
        required: true,
        maxSelect: 1,
        values: ['grading', 'deployment'],
      }),
      new SelectField({
        name: 'status',
        required: true,
        maxSelect: 1,
        values: ['queued', 'running', 'succeeded', 'failed', 'canceled'],
      }),
      new NumberField({
        name: 'progress',
        min: 0,
        max: 100,
      }),
      new TextField({
        name: 'message',
        max: 2000,
      }),
      new DateField({
        name: 'startedAt',
      }),
      new DateField({
        name: 'finishedAt',
      }),
    ],
    indexes: [
      'CREATE INDEX idx_jobs_submission ON jobs (submission)',
      'CREATE INDEX idx_jobs_status ON jobs (status)',
    ],
  })
  applyDevRules(jobs)
  app.save(jobs)

  const results = new Collection({
    type: 'base',
    name: 'results',
    fields: [
      new RelationField({
        name: 'submission',
        required: true,
        collectionId: submissions.id,
        maxSelect: 1,
        cascadeDelete: true,
      }),
      new RelationField({
        name: 'policy',
        required: true,
        collectionId: policies.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
      new NumberField({
        name: 'score',
        min: 0,
      }),
      new NumberField({
        name: 'maxScore',
        min: 0,
      }),
      new JSONField({
        name: 'rubricResults',
      }),
      new TextField({
        name: 'feedback',
        max: 10000,
      }),
    ],
    indexes: [
      'CREATE INDEX idx_results_submission ON results (submission)',
      'CREATE INDEX idx_results_policy ON results (policy)',
    ],
  })
  applyDevRules(results)
  app.save(results)

  const deployments = new Collection({
    type: 'base',
    name: 'deployments',
    fields: [
      new RelationField({
        name: 'submission',
        required: true,
        collectionId: submissions.id,
        maxSelect: 1,
        cascadeDelete: true,
      }),
      new SelectField({
        name: 'status',
        required: true,
        maxSelect: 1,
        values: ['queued', 'building', 'deployed', 'failed'],
      }),
      new URLField({
        name: 'url',
      }),
      new TextField({
        name: 'message',
        max: 2000,
      }),
      new DateField({
        name: 'deployedAt',
      }),
    ],
    indexes: [
      'CREATE INDEX idx_deployments_submission ON deployments (submission)',
      'CREATE INDEX idx_deployments_status ON deployments (status)',
    ],
  })
  applyDevRules(deployments)
  app.save(deployments)
}, (app) => {
  const names = ['deployments', 'results', 'jobs', 'submissions', 'policies']

  for (const name of names) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch (_) {
      // Collection is already absent.
    }
  }
})
