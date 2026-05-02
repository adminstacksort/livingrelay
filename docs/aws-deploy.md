# AWS Deployment Path

This is the shortest path from local demo to a usable AWS-hosted LivingRelay.

## Target Architecture

- **ECS Fargate** runs the Node/Vite container.
- **Application Load Balancer** terminates HTTPS and forwards to port `8787`.
- **RDS Postgres** stores app state now and normalized production data next.
- **SSM Parameter Store** stores secrets.
- **S3** should store Twilio media once media download/storage is implemented.
- **CloudWatch Logs** captures server logs.
- **Twilio** points inbound SMS to `https://your-domain.com/api/twilio/inbound`.

## First AWS Launch

1. Create an RDS Postgres database.
2. Run `db/schema.sql` against it.
3. Store secrets from `.env.example` in SSM Parameter Store.
4. Build and push the Docker image to ECR.
5. Create an ECS Fargate service using `deploy/aws-ecs-task-definition.example.json`.
6. Put an ALB in front of ECS with HTTPS.
7. Set `APP_PUBLIC_URL` to the ALB/domain URL.
8. Configure Twilio SMS webhook:
   - Method: `POST`
   - URL: `https://your-domain.com/api/twilio/inbound`
9. Check:
   - `GET /api/health`
   - `GET /api/readiness`
   - Text `HELP` from a configured tenant/admin phone.

## Important Reality

The app now supports Postgres-backed state snapshots when `DATABASE_URL` is set. That is enough to stop relying on local files and run a first private pilot on AWS.

The normalized tables in `db/schema.sql` are the migration target. The next engineering step is moving each API flow from the snapshot state arrays into table-backed repository methods.

## Production Before Public Use

- Replace PIN demo login with real auth and hashed one-time codes.
- Store Twilio media in S3 instead of linking provider URLs directly.
- Add account/property authorization checks to every API route.
- Add Stripe subscription enforcement before tenant SMS activation.
- Add admin-only controls for vendor calls and live takeover.
- Add rate limits and request signature validation for Twilio webhooks.
