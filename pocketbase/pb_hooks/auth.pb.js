onRecordAuthWithOAuth2Request((event) => {
  const app = event.app || $app

  if (event.providerName !== 'github') {
    throw new ForbiddenError('Only GitHub login is allowed.')
  }

  const email = String((event.oAuth2User && event.oAuth2User.email) || '')
    .trim()
    .toLowerCase()

  if (!email) {
    throw new BadRequestError('GitHub did not return an email address.')
  }

  try {
    app.findFirstRecordByFilter(
      'email_whitelist',
      'email = {:email} && active = true',
      { email }
    )
  } catch (_) {
    throw new ForbiddenError('This email is not whitelisted.')
  }

  if (event.createData) {
    event.createData.email = email
    event.createData.emailVisibility = true
    event.createData.verified = true
    event.createData.allowed = true
  }

  event.next()

  if (event.record) {
    event.record.set('email', email)
    event.record.set('emailVisibility', true)
    event.record.set('verified', true)
    event.record.set('allowed', true)
    app.save(event.record)
  }
}, 'users')
