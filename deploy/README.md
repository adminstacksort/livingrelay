# Deployment

The app ships as a Docker container built by GitHub Actions and published to GHCR:

```text
ghcr.io/<owner>/<repo>/livingrelay:staging
ghcr.io/<owner>/<repo>/livingrelay:production
ghcr.io/<owner>/<repo>/livingrelay:dev
```

The container listens on `SERVER_PORT`, defaulting to `8787`.

Recommended platform settings:

- Health check path: `/api/health`
- Readiness check path: `/api/readiness`
- Start command: `npm start`
- Persistent database: Postgres with `DATABASE_URL`
- Node version: 22 when running outside Docker

Use separate databases, Twilio numbers, API keys, webhook URLs, and domains for dev, staging, and production.

Canonical domains:

- Dev: `https://dev.livingrelay.com`
- Staging: `https://staging.livingrelay.com`
- Production: `https://livingrelay.com`
