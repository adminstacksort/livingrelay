# Environments

LivingRelay now has a four-repo, three-environment operating model:

- `adminstacksort/livingrelay`: source-of-truth development repo.
- `adminstacksort/livingrelay-dev`: raw development deployment mirror.
- `adminstacksort/livingrelay-staging`: staging deployment mirror.
- `adminstacksort/livingrelay-production`: production deployment mirror.

The source repo runs CI on pull requests and branch pushes. Dev deploys from active development branches. Staging deploys from `main`. Production deploys only from a published GitHub Release or a manual workflow dispatch.

## Canonical Domains

```text
dev=https://dev.livingrelay.com
staging=https://staging.livingrelay.com
production=https://livingrelay.com
```

## GitHub Setup

Create three empty private repositories:

```bash
gh repo create adminstacksort/livingrelay-dev --private
gh repo create adminstacksort/livingrelay-staging --private
gh repo create adminstacksort/livingrelay-production --private
```

Add local remotes after the repositories exist:

```bash
git remote add dev git@github.com:adminstacksort/livingrelay-dev.git
git remote add staging git@github.com:adminstacksort/livingrelay-staging.git
git remote add production git@github.com:adminstacksort/livingrelay-production.git
```

Protect `main` in the source, staging, and production repositories. Require pull requests, at least one approval, passing CI, and conversation resolution before merging. Production should additionally restrict who can approve deployments in the GitHub `production` environment.

## Required Source Repo Variables

Configure these as GitHub Actions repository variables in `adminstacksort/livingrelay`:

```text
DEV_REPOSITORY=adminstacksort/livingrelay-dev
STAGING_REPOSITORY=adminstacksort/livingrelay-staging
PRODUCTION_REPOSITORY=adminstacksort/livingrelay-production
```

## Required Source Repo Secrets

Configure these as GitHub Actions repository or environment secrets:

```text
DEV_DEPLOY_KEY
STAGING_DEPLOY_KEY
PRODUCTION_DEPLOY_KEY
DEV_DEPLOY_WEBHOOK_URL
STAGING_DEPLOY_WEBHOOK_URL
PRODUCTION_DEPLOY_WEBHOOK_URL
```

Each `*_DEPLOY_KEY` is an SSH private key whose public key is installed as a write deploy key on only that environment's mirror repository.

The deploy webhook secrets are optional if the hosting platform deploys directly from GHCR image tags. When present, the workflow calls them after publishing the image.

## Runtime Secrets

Keep runtime secrets separate between dev, staging, and production. Use `.env.dev.example`, `.env.staging.example`, and `.env.production.example` as checklists.

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
3. Push to an active `codex/*` or `develop` branch; the dev workflow builds the Docker image, pushes GHCR dev tags, mirrors code to the dev repo, and triggers the dev deploy webhook for `dev.livingrelay.com`.
4. Merge to `main`; the staging workflow builds the Docker image, pushes GHCR staging tags, mirrors code to the staging repo, and triggers the staging deploy webhook for `staging.livingrelay.com`.
5. Verify staging at `/api/health` and `/api/readiness`.
6. Publish a GitHub Release from the verified commit; the production workflow builds production image tags, mirrors code to the production repo, and triggers production deploy for `livingrelay.com`.

## DNS Plan

Create Route 53 records in the `livingrelay.com` hosted zone:

```text
dev.livingrelay.com      A/AAAA alias -> dev ALB
staging.livingrelay.com  A/AAAA alias -> staging ALB
livingrelay.com          A/AAAA alias -> production ALB
www.livingrelay.com      CNAME or redirect -> livingrelay.com
```

Use an ACM certificate that covers `livingrelay.com`, `www.livingrelay.com`, `staging.livingrelay.com`, and `dev.livingrelay.com`.

## Health Checks

Use these endpoints for platform health checks:

```text
GET /api/health
GET /api/readiness
```

`/api/health` confirms the server is alive. `/api/readiness` returns `503` until required production integrations are configured and reachable.
