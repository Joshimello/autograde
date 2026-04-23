onBootstrap((event) => {
  event.next()

  const app = event.app || $app
  const clientId = String($os.getenv('GITHUB_CLIENT_ID') || '').trim()
  const clientSecret = String($os.getenv('GITHUB_CLIENT_SECRET') || '').trim()
  const githubConfigured = clientId !== '' && clientSecret !== ''
  const githubProvider = {
    name: 'github',
    clientId,
    clientSecret,
    authURL: '',
    tokenURL: '',
    userInfoURL: '',
    displayName: 'GitHub',
    pkce: null,
    extra: null,
  }
  const users = app.findCollectionByNameOrId('users')
  const currentProviders = Array.isArray(users.oauth2.providers)
    ? users.oauth2.providers
    : []
  const providersWithoutGithub = currentProviders.filter(
    (provider) => String(provider && provider.name) !== 'github'
  )
  const nextProviders = githubConfigured
    ? providersWithoutGithub.concat([githubProvider])
    : providersWithoutGithub
  const currentGithub = currentProviders.find(
    (provider) => String(provider && provider.name) === 'github'
  )
  const nextGithub = githubConfigured
    ? nextProviders.find((provider) => provider.name === 'github')
    : null
  const providersChanged =
    currentProviders.length !== nextProviders.length ||
    (githubConfigured &&
      !(
        String((currentGithub || {}).name || '') ===
          String((nextGithub || {}).name || '') &&
        String((currentGithub || {}).clientId || '') ===
          String((nextGithub || {}).clientId || '') &&
        String((currentGithub || {}).clientSecret || '') ===
          String((nextGithub || {}).clientSecret || '') &&
        String((currentGithub || {}).authURL || '') ===
          String((nextGithub || {}).authURL || '') &&
        String((currentGithub || {}).tokenURL || '') ===
          String((nextGithub || {}).tokenURL || '') &&
        String((currentGithub || {}).userInfoURL || '') ===
          String((nextGithub || {}).userInfoURL || '') &&
        String((currentGithub || {}).displayName || '') ===
          String((nextGithub || {}).displayName || '') &&
        (((currentGithub || {}).pkce == null
          ? null
          : Boolean((currentGithub || {}).pkce)) ===
          ((nextGithub || {}).pkce == null
            ? null
            : Boolean((nextGithub || {}).pkce)))
      )) ||
    (!githubConfigured && currentGithub)
  const enabledChanged = users.oauth2.enabled !== githubConfigured

  if (!providersChanged && !enabledChanged) {
    return
  }

  users.oauth2.providers = nextProviders
  users.oauth2.enabled = githubConfigured
  app.save(users)
})
