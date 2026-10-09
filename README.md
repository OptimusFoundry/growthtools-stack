# Growth Tools

Tools for creators to plan, schedule, and auto-publish content across X, LinkedIn, Meta, Threads, TikTok, Pinterest.

- **App / API**: https://protoapp.xyz
- **Infra**: https://github.com/OptimusFoundry/base-infra (product stack: `products/protoapp/`)

## Layout

```
.
├── base-server/          # Go API (ships as Docker image to ECR 'base-server')
├── webapp/               # Vite + React SPA
├── docs/                 # Product & engineering docs
└── .github/workflows/
    ├── protoapp-server.yml   # base-server → ECR → ECS service 'api_service'
    └── protoapp-webapp.yml   # webapp → S3 'protoapp.xyz-webapp' → CloudFront
```

## How deploys work

Same pattern as the sibling `launchcamp-stack` repo:

1. Workflows auth to AWS via OIDC using `PRODUCT_SLUG=protoapp` + `DEPLOY_ROLE` + `AWS_REGION` at the top.
2. Fetch `/protoapp/manifest` from SSM — JSON written by Terraform containing ECR repo, ECS cluster/service, S3 bucket, CloudFront id, SSM path prefixes, domain.
3. Deploy steps use those values.

Infra changes (rename a resource, bump task def env) → `terraform apply` in `base-infra/products/protoapp/` → manifest updates automatically → next deploy here picks it up.

## Local development

```bash
# API
cd base-server && make services-up && go run main.go

# Webapp
cd webapp && npm ci && npm run dev
```

`base-server/env.local` contains the full dev env var set. See `base-server/CLAUDE.md` for conventions.

## DB migrations (prod)

Run `base-server/dbmigrator.dockerfile` against the shared RDS through an SSM port-forward. See [base-infra RUNBOOK](https://github.com/OptimusFoundry/base-infra) for the exact sequence.
