migrate((app) => {
  const appRule = '@request.auth.id != "" && @request.auth.allowed = true'
  const policies = app.findCollectionByNameOrId('policies')
  const policyImports = new Collection({
    type: 'base',
    name: 'policy_imports',
    indexes: [
      'CREATE INDEX idx_policy_imports_status ON policy_imports (status)',
      'CREATE INDEX idx_policy_imports_policy ON policy_imports (policy)',
    ],
  })

  policyImports.fields.add(
    new TextField({
      name: 'label',
      required: true,
      max: 200,
    }),
    new FileField({
      name: 'sourceFile',
      required: true,
      maxSelect: 1,
      maxSize: 52428800,
      mimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
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
    new TextField({
      name: 'error',
      max: 5000,
    }),
    new RelationField({
      name: 'policy',
      collectionId: policies.id,
      maxSelect: 1,
      cascadeDelete: false,
    }),
    new TextField({
      name: 'markdownPreview',
      max: 20000,
    }),
    new DateField({
      name: 'startedAt',
    }),
    new DateField({
      name: 'finishedAt',
    })
  )

  policyImports.listRule = appRule
  policyImports.viewRule = appRule
  policyImports.createRule = appRule
  policyImports.updateRule = appRule
  policyImports.deleteRule = appRule
  app.save(policyImports)
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId('policy_imports'))
  } catch (_) {
    // Collection is already absent.
  }
})
