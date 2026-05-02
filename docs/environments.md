# Environments

LivingRelay now has a three-repo operating model:

- `adminstacksort/livingrelay`: source-of-truth development repo.
- `adminstacksort/livingrelay-staging`: staging deployment mirror.
- `adminstacksort/livingrelay-production`: production deployment mirror.

The source repo should run CI on pull requests and branch pushes. Staging should deploy from `main`. Production should deploy only from a published GitHub Release or a manual workflow dispatch.

Note: workflow files need to be added by a GitHub token/user with `workflow` scope. The current Codex GitHub token cannot push `.github/workflows/*`, so this repo keeps the workflow plan documented here instead of committing those files from Codex.

## GitHub Setup

Create two empty private repositories:

```bash
gh repo create adminstacksort/livingrelay-staging --private
gh repo create adminstacksort/livingrelay-production --private
```

Add local remotes after the repositories exist:

```bash
git remote add staging git@github.com:adminstacksort/livingrelay-staging.git
git remote add production git@github.com:adminstacksort/livingrelay-production.git
```

Protect `main` in all three repositories. Require pull requests, at least one approval, passing CI, and conversation resolution before merging. Production should additionally restrict who can approve deployments in the GitHub `production` environment.

## Required Source Repo Variables

Configure these as GitHub Actions repository variables in `adminstacksort/livingrelay`:

```text
STAGING_REPOSITORY=adminstacksort/livingrelay-staging
PRODUCTION_REPOSITORY=adminstacksort/livingrelay-production
```

## Required Source Repo Secrets

Configure these as GitHub Actions repository or environment secrets:

```text
REPO_SYNC_TOKEN
STAGING_DEPLOY_WEBHOOK_URL
PRODUCTION_DEPLOY_WEBHOOK_URL
```

`REPO_SYNC_TOKEN` should be a fine-grained GitHub token with contents read/write access to only the staging and production mirror repositories.

The deploy webhook secrets are optional if the hosting platform deploys directly from GHCR image tags. When present, the workflow calls them after publishing the image.

## Runtime Secrets

Keep runtime secrets separate between staging and production. Use `.env.staging.example` and `.env.production.example` as checklists.

Both deployed environments require:

```text
APP_PUBLIC_URL
DATABASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_MESSAGING_NUMBER
ANTHROPIC_API_KEY
SESSION_SECRET
```

When `ENABLE_VENDOR_CALLS=true`, also configure:

```text
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
ELEVENLABS_AGENT_PHONE_NUMBER_ID
```

## Promotion Flow

1. Work on feature branches in `adminstacksort/livingrelay`.
2. Open a pull request into `main`; CI must pass.
3. Merge to `main`; the staging workflow should build the Docker image, push GHCR staging tags, mirror code to the staging repo, and trigger the staging deploy webhook.
4. Verify staging at `/api/health` and `/api/readiness`.
5. Publish a GitHub Release from the verified commit; the production workflow should build production image tags, mirror code to the production repo, and trigger production deploy.

## Health Checks

Use these endpoints for platform health checks:

```text
GET /api/health
GET /api/readiness
```

`/api/health` confirms the server is alive. `/api/readiness` returns `503` until required production integrations are configured and reachable.
