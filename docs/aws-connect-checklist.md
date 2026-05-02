# AWS Connection Checklist

This checklist connects the GitHub Actions deployment pipeline to live AWS infrastructure for:

- Dev: `https://dev.livingrelay.com`
- Staging: `https://staging.livingrelay.com`
- Production: `https://livingrelay.com`

Already configured:

```text
AWS account=365609840635
Region=us-east-1
Route 53 hosted zone=livingrelay.com / Z03036513QMYCCOVJDG6S
ACM certificate=arn:aws:acm:us-east-1:365609840635:certificate/9c7e281d-fd9e-4b71-9a9c-1a028bdb4dd3
ECR repository=365609840635.dkr.ecr.us-east-1.amazonaws.com/livingrelay
GitHub deploy role=arn:aws:iam::365609840635:role/livingrelay-github-actions-deploy
```

## 1. Create Networking

Use one VPC for all three environments unless there is a strong reason to isolate them harder.

Minimum setup:

- VPC with at least two public subnets in different Availability Zones.
- Security group for the ALB:
  - inbound `80` from `0.0.0.0/0`
  - inbound `443` from `0.0.0.0/0`
  - outbound all
- Security group for ECS tasks:
  - inbound `8787` only from the ALB security group
  - outbound all
- Security group for RDS:
  - inbound Postgres `5432` only from the ECS task security group

## 2. Create Databases

Create three separate Postgres databases or clusters:

```text
livingrelay_dev
livingrelay_staging
livingrelay_production
```

Run the schema against each database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Keep each environment's `DATABASE_URL` separate.

## 3. Store Runtime Secrets In SSM

Use SecureString parameters, one path per environment:

```text
/livingrelay/dev/APP_PUBLIC_URL
/livingrelay/dev/SESSION_SECRET
/livingrelay/dev/DATABASE_URL
/livingrelay/dev/TWILIO_ACCOUNT_SID
/livingrelay/dev/TWILIO_AUTH_TOKEN
/livingrelay/dev/TWILIO_MESSAGING_NUMBER
/livingrelay/dev/ANTHROPIC_API_KEY

/livingrelay/staging/...
/livingrelay/production/...
```

Set URLs as:

```text
/livingrelay/dev/APP_PUBLIC_URL=https://dev.livingrelay.com
/livingrelay/staging/APP_PUBLIC_URL=https://staging.livingrelay.com
/livingrelay/production/APP_PUBLIC_URL=https://livingrelay.com
```

## 4. Create ECS Task Definitions

Create one task definition family per environment:

```text
livingrelay-dev
livingrelay-staging
livingrelay-production
```

Base them on `deploy/aws-ecs-task-definition.example.json`.

Important values:

- Container name: `livingrelay`
- Container port: `8787`
- Image initially: `365609840635.dkr.ecr.us-east-1.amazonaws.com/livingrelay:dev`
- Use the matching environment SSM parameter path for secrets.
- Log group examples:
  - `/ecs/livingrelay-dev`
  - `/ecs/livingrelay-staging`
  - `/ecs/livingrelay-production`

## 5. Create ECS Services

Create one ECS cluster, for example:

```text
livingrelay
```

Create three Fargate services:

```text
livingrelay-dev
livingrelay-staging
livingrelay-production
```

Each service should:

- Use its matching task definition family.
- Run in private or public subnets depending on your VPC design.
- Attach to an Application Load Balancer target group.
- Health check path: `/api/health`
- Desired count:
  - dev: `1`
  - staging: `1`
  - production: `2` when ready for public use

## 6. Create Load Balancer Routing

Create an Application Load Balancer with HTTPS listener `443` using:

```text
arn:aws:acm:us-east-1:365609840635:certificate/9c7e281d-fd9e-4b71-9a9c-1a028bdb4dd3
```

Create target groups:

```text
livingrelay-dev
livingrelay-staging
livingrelay-production
```

Host-based listener rules:

```text
dev.livingrelay.com      -> livingrelay-dev target group
staging.livingrelay.com  -> livingrelay-staging target group
livingrelay.com          -> livingrelay-production target group
www.livingrelay.com      -> livingrelay-production target group or redirect to livingrelay.com
```

## 7. Create Route 53 Records

In hosted zone `Z03036513QMYCCOVJDG6S`, create alias records:

```text
dev.livingrelay.com      A/AAAA alias -> ALB
staging.livingrelay.com  A/AAAA alias -> ALB
livingrelay.com          A/AAAA alias -> ALB
www.livingrelay.com      A/AAAA alias -> ALB
```

## 8. Set GitHub ECS Variables

After creating ECS resources, set these in `adminstacksort/livingrelay` GitHub Actions variables:

```bash
gh variable set AWS_ECS_CLUSTER --repo adminstacksort/livingrelay --body livingrelay

gh variable set DEV_ECS_SERVICE --repo adminstacksort/livingrelay --body livingrelay-dev
gh variable set DEV_ECS_TASK_DEFINITION --repo adminstacksort/livingrelay --body livingrelay-dev

gh variable set STAGING_ECS_SERVICE --repo adminstacksort/livingrelay --body livingrelay-staging
gh variable set STAGING_ECS_TASK_DEFINITION --repo adminstacksort/livingrelay --body livingrelay-staging

gh variable set PRODUCTION_ECS_SERVICE --repo adminstacksort/livingrelay --body livingrelay-production
gh variable set PRODUCTION_ECS_TASK_DEFINITION --repo adminstacksort/livingrelay --body livingrelay-production
```

Once these are set, GitHub Actions will update ECS services automatically.

## 9. Configure Twilio Webhooks

Use separate Twilio numbers for dev, staging, and production when possible.

Inbound SMS webhook URLs:

```text
https://dev.livingrelay.com/api/twilio/inbound
https://staging.livingrelay.com/api/twilio/inbound
https://livingrelay.com/api/twilio/inbound
```

Method: `POST`

## 10. Verify

After each deploy:

```bash
curl -s https://dev.livingrelay.com/api/health
curl -s https://staging.livingrelay.com/api/health
curl -s https://livingrelay.com/api/health
```

Readiness should eventually return `ok: true` once all required secrets and integrations are configured:

```bash
curl -s https://dev.livingrelay.com/api/readiness
curl -s https://staging.livingrelay.com/api/readiness
curl -s https://livingrelay.com/api/readiness
```

