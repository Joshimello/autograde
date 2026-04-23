For **Netlify**, these are the main REST APIs and env values you’ll actually need for a preview system.

### Env values to keep in your backend

```bash
NETLIFY_API_TOKEN=...
NETLIFY_SITE_ID=...
NETLIFY_ACCOUNT_ID=...
NETLIFY_API_BASE=https://api.netlify.com/api/v1
```

What each one is for:

- `NETLIFY_API_TOKEN`: Bearer token for authenticating API requests. Netlify documents personal access tokens and `Authorization: Bearer <token>`. ([Netlify Docs][1])
- `NETLIFY_SITE_ID`: the site/project you deploy into. Netlify says `{site_id}` can be the project ID or even the site domain in API paths. ([Netlify Docs][1])
- `NETLIFY_ACCOUNT_ID`: only needed if you want to manage environment variables via the account env endpoints. ([Netlify Docs][1])
- `NETLIFY_API_BASE`: just a convenience constant; Netlify’s v1 base URL is `https://api.netlify.com/api/v1/`. ([Netlify Docs][1])

If you are doing **server-to-server for your own team**, a PAT is enough. If you are building a public multi-tenant integration for other Netlify users, Netlify says to use OAuth2 instead. ([Netlify Docs][1])

---

### Most important REST APIs

#### 1) List or verify sites

```http
GET /api/v1/sites
GET /api/v1/sites/{site_id}
```

Use these to find or validate the site you’ll deploy into. ([Netlify Docs][1])

#### 2) Create a site

```http
POST /api/v1/sites
```

Only needed if you want your system to create sites automatically instead of reusing one existing site. Netlify’s deploy flow starts with creating a site if needed. ([Netlify Docs][1])

#### 3) Create a deploy for a site

```http
POST /api/v1/sites/{site_id}/deploys
```

This is the core endpoint. Netlify documents two deploy styles under this flow:

- **ZIP file method**
- **file digest method** ([Netlify Docs][1])

For your use case, ZIP is the easiest if you already have a packaged artifact. Netlify explicitly documents ZIP deploys as a supported deploy mode. ([Netlify Docs][1])

#### 4) Poll deploy status

```http
GET /api/v1/deploys/{deploy_id}
```

Use this after creating a deploy until the deploy state becomes `ready`. Netlify documents that `ready` means the deploy is live. ([Netlify Docs][1])

#### 5) Upload individual files

```http
PUT /api/v1/deploys/{deploy_id}/files/{path}
```

Only needed if you use the **file digest** deploy method instead of ZIP. Netlify’s OpenAPI lists this as `uploadDeployFile`. ([Netlify Docs][1])

#### 6) List deployed files

```http
GET /api/v1/sites/{site_id}/files
GET /api/v1/sites/{site_id}/files/{file_path}
```

Useful for debugging whether the expected static output actually made it to the deployed site. ([Netlify][2])

#### 7) Manage environment variables

```http
POST   /api/v1/accounts/{account_id}/env
PUT    /api/v1/accounts/{account_id}/env/{key}
PATCH  /api/v1/accounts/{account_id}/env/{key}
DELETE /api/v1/accounts/{account_id}/env/{key}
```

These are only needed if Netlify is doing the build and your student previews need build-time secrets or config. Netlify documents these under the account env endpoints. ([Netlify Docs][1])

---

### What you likely need in practice

If submissions are **already built static files**, your minimal setup is:

```bash
NETLIFY_API_TOKEN
NETLIFY_SITE_ID
```

And your main API flow is just:

1. `POST /sites/{site_id}/deploys` with ZIP or deploy payload
2. `GET /deploys/{deploy_id}` until `state=ready` ([Netlify Docs][1])

You probably **do not need** Netlify env vars at all in that case, because there is no build step to configure.

If submissions are **source code that Netlify must build**, then also keep:

```bash
NETLIFY_ACCOUNT_ID
```

and use the env endpoints to set variables like:

```bash
VITE_API_URL=...
PUBLIC_BASE_URL=...
NODE_VERSION=...
```

Those names are app/framework-specific, not Netlify-specific. Netlify provides the API to store them, but the actual keys depend on the framework you’re building. ([Netlify Docs][1])

---

### Suggested backend env template

```bash
NETLIFY_API_BASE=https://api.netlify.com/api/v1
NETLIFY_API_TOKEN=nl_pat_xxx
NETLIFY_SITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# only if using Netlify-managed build env vars
NETLIFY_ACCOUNT_ID=your-team-slug-or-account-id
```

---

### Header you’ll send on every request

```http
Authorization: Bearer <NETLIFY_API_TOKEN>
Content-Type: application/json
```

For ZIP deploys, `Content-Type` will be the ZIP content type for that request instead. Authentication is still Bearer token. ([Netlify Docs][1])

---

### Two constraints you should design around

- Netlify says API deploys are rate-limited more strictly than normal API calls: **up to 3 deploys per minute and 100 deploys per day** for deploy-through-API operations unless your limits are increased. That matters a lot for a grading system. ([Netlify Docs][1])
- General API requests are otherwise limited to **500 requests per minute**. ([Netlify Docs][1])

For 100 previews max, that daily deploy limit is the first thing I would verify with your plan.

### Best minimal design

For built static previews:

- one Netlify site per assignment or course
- one deploy per submission
- store `deploy_id`, preview URL, student ID in your DB
- poll `GET /deploys/{deploy_id}` until ready ([Netlify Docs][1])

If you want, I can give you the exact `curl` examples for:

- create deploy from ZIP
- poll until live
- and a small Python helper class using these env vars.

[1]: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/ "Get started with the Netlify API | Netlify Docs"
[2]: https://open-api.netlify.com/?utm_source=chatgpt.com "Netlify API documentation"
