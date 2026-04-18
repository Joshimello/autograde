migrate((app) => {
  const appRule = '@request.auth.id != "" && @request.auth.allowed = true'
  const selfRule = 'id = @request.auth.id && @request.auth.allowed = true'

  function applyAppRules(collection) {
    collection.listRule = appRule
    collection.viewRule = appRule
    collection.createRule = appRule
    collection.updateRule = appRule
    collection.deleteRule = appRule
  }

  const users = app.findCollectionByNameOrId('users')
  users.fields.add(
    new BoolField({
      name: 'allowed',
    })
  )
  users.authRule = ''
  users.listRule = selfRule
  users.viewRule = selfRule
  users.updateRule = selfRule
  users.deleteRule = selfRule
  users.passwordAuth.enabled = false
  users.oauth2.enabled = true
  app.save(users)

  const emailWhitelist = new Collection({
    type: 'base',
    name: 'email_whitelist',
    indexes: [
      'CREATE UNIQUE INDEX idx_email_whitelist_email ON email_whitelist (email)',
      'CREATE INDEX idx_email_whitelist_active ON email_whitelist (active)',
    ],
  })
  emailWhitelist.fields.add(
    new EmailField({
      name: 'email',
      required: true,
    }),
    new BoolField({
      name: 'active',
    }),
    new TextField({
      name: 'notes',
      max: 1000,
    })
  )
  applyAppRules(emailWhitelist)
  app.save(emailWhitelist)

  const policies = new Collection({
    type: 'base',
    name: 'policies',
    indexes: ['CREATE INDEX idx_policies_active ON policies (active)'],
  })
  policies.fields.add(
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
    })
  )
  applyAppRules(policies)
  app.save(policies)

  const submissions = new Collection({
    type: 'base',
    name: 'submissions',
    indexes: [
      'CREATE INDEX idx_submissions_policy ON submissions (policy)',
      'CREATE INDEX idx_submissions_status ON submissions (status)',
    ],
  })
  submissions.fields.add(
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
    })
  )
  applyAppRules(submissions)
  app.save(submissions)

  const jobs = new Collection({
    type: 'base',
    name: 'jobs',
    indexes: [
      'CREATE INDEX idx_jobs_submission ON jobs (submission)',
      'CREATE INDEX idx_jobs_status ON jobs (status)',
    ],
  })
  jobs.fields.add(
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
    })
  )
  applyAppRules(jobs)
  app.save(jobs)

  const results = new Collection({
    type: 'base',
    name: 'results',
    indexes: [
      'CREATE INDEX idx_results_submission ON results (submission)',
      'CREATE INDEX idx_results_policy ON results (policy)',
    ],
  })
  results.fields.add(
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
    })
  )
  applyAppRules(results)
  app.save(results)

  const deployments = new Collection({
    type: 'base',
    name: 'deployments',
    indexes: [
      'CREATE INDEX idx_deployments_submission ON deployments (submission)',
      'CREATE INDEX idx_deployments_status ON deployments (status)',
    ],
  })
  deployments.fields.add(
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
    })
  )
  applyAppRules(deployments)
  app.save(deployments)
}, (app) => {
  const names = [
    'deployments',
    'results',
    'jobs',
    'submissions',
    'policies',
    'email_whitelist',
  ]

  for (const name of names) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch (_) {
      // Collection is already absent.
    }
  }

  try {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('allowed')
    users.authRule = ''
    app.save(users)
  } catch (_) {
    // The users collection is managed by PocketBase.
  }
})
