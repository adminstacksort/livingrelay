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
site_admin=https://admin.livingrelay.com
app=https://app.livingrelay.com
local_public=<optional workstation callback host, for example https://local-dev.livingrelay.com>
```

`dev.livingrelay.com` is the deployed AWS development environment, not a production host and not a direct pointer to a developer laptop. Provider dashboards should use the deployed environment URLs for durable dev testing. If a provider needs to call code running only on a workstation, use a separate laptop-specific public host such as `local-dev.livingrelay.com` so it is never confused with deployed dev, staging, or production.

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
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=365609840635
AWS_ROLE_ARN=arn:aws:iam::365609840635:role/livingrelay-github-actions-deploy
AWS_ECR_REPOSITORY=livingrelay
```

After ECS services exist, also configure:

```text
AWS_ECS_CLUSTER=<cluster-name>
DEV_ECS_SERVICE=<dev-service-name>
DEV_ECS_TASK_DEFINITION=<dev-task-definition-family-or-arn>
STAGING_ECS_SERVICE=<staging-service-name>
STAGING_ECS_TASK_DEFINITION=<staging-task-definition-family-or-arn>
PRODUCTION_ECS_SERVICE=<production-service-name>
PRODUCTION_ECS_TASK_DEFINITION=<production-task-definition-family-or-arn>
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
APP_ENV
DATABASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_MESSAGING_NUMBER
ANTHROPIC_API_KEY
SESSION_SECRET
GOOGLE_PLACES_API_KEY
VITE_GA_MEASUREMENT_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_SENDGRID_API_KEY
TWILIO_SENDGRID_FROM_EMAIL
APNS_KEY_ID
APNS_TEAM_ID
APNS_BUNDLE_ID
APNS_PRIVATE_KEY
APNS_ENVIRONMENT=production
DISPATCH_FEE_CENTS
OWNER_SUBSCRIPTION_AMOUNT_CENTS
SITE_ADMIN_HOST=admin.livingrelay.com
SITE_ADMIN_PASSWORD
```

`SITE_ADMIN_HOST` gates the admin console and `/api/site-admin/*` endpoints by request host. In production, admin login should only be reachable through `admin.livingrelay.com`.

`SITE_ADMIN_PASSWORD` is compared case-insensitively (trimmed + lowercased) to avoid breaking automations due to capitalization differences (for example `owner-console` vs `Owner-console`).

In production (`NODE_ENV=production`), `SITE_ADMIN_PASSWORD` must be configured; otherwise `/api/site-admin/login` returns a 500 to avoid accidentally relying on the `owner-console` dev fallback.

Set `APP_ENV` to `dev`, `staging`, or `production`. Persistent Postgres snapshots are keyed by environment (`livingrelay-dev`, `livingrelay-staging`, `livingrelay-production`), so staging test properties remain visible in the staging admin portal until explicitly deleted and never mix with production data.

Use `https://staging.livingrelay.com/admin` for the staging admin portal. Plain `https://staging.livingrelay.com` remains the staging customer app for flows like Create property.

`VITE_GA_MEASUREMENT_ID` enables Google Analytics 4 web traffic tracking in the frontend. Use `G-4EPQK851N0` for staging and `G-JK9RC1VEXR` for production. Leave it blank in local and dev when you do not want those visits counted.

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
www.livingrelay.com      A/AAAA alias -> production ALB
admin.livingrelay.com    A/AAAA alias -> production ALB with Host header preserved
app.livingrelay.com      A/AAAA alias -> production ALB
```

Use an ACM certificate that covers `livingrelay.com` and `*.livingrelay.com`.

Current AWS foundation:

```text
Route 53 hosted zone ID=Z03036513QMYCCOVJDG6S
ACM certificate ARN=arn:aws:acm:us-east-1:365609840635:certificate/9c7e281d-fd9e-4b71-9a9c-1a028bdb4dd3
ECR repository=365609840635.dkr.ecr.us-east-1.amazonaws.com/livingrelay
GitHub OIDC deploy role=arn:aws:iam::365609840635:role/livingrelay-github-actions-deploy
```

## Health Checks

Use these endpoints for platform health checks:

```text
GET /api/health
GET /api/readiness
```

`/api/health` confirms the server is alive. `/api/readiness` returns `503` until required production integrations are configured and reachable.
