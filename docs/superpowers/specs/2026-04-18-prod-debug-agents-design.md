# Prod Debug Agents — Design Spec

**Date:** 2026-04-18
**Status:** Approved

## Problem

Debugging production issues (unexpected errors, anomalous DB values) currently requires manually jumping between CloudWatch and psql. Agents that search too broadly waste time and tokens. We need a precise, human-gated investigation loop.

## Agent Structure

Three agents total:

| Agent | Model | Role |
|-------|-------|------|
| `prod-debug` | sonnet | Coordinator. Receives issue description, dispatches specialists sequentially, checkpoints with the user when results are empty, synthesizes root cause. |
| `prod-db-query` | haiku | Specialist. Opens SSM port-forward to RDS, runs read-only SQL, returns raw rows. Never interprets. |
| `prod-logs` | haiku | Specialist. Pulls CloudWatch log events for a specific log group + time window + filter pattern. Returns raw log lines. Never interprets. |

The coordinator is the only agent that talks to the user. Specialists are tools it calls — they never ask the user questions directly.

## Coordinator Behavior (`prod-debug`)

### Input
A natural-language description of the issue. May include: user ID, account ID, request ID, timestamp, error message text, anomalous DB column/value.

### Investigation Loop

1. **Parse** — extract all identifiers from the issue description (user ID, request ID, timestamp, error text, table/column).
2. **Hypothesize** — decide which data source to hit first based on what's available:
   - If a request ID or error string is available → logs first
   - If a specific DB record or column value is mentioned → DB first
3. **Narrow query** — form the tightest possible query: single record, specific filter pattern, 15-minute time window by default.
4. **Dispatch specialist** — fire `prod-db-query` or `prod-logs` with explicit parameters.
5. **Checkpoint** — if results are empty or inconclusive:
   - Report exactly what was searched and why it came up empty
   - Ask the user ONE targeted question to refine (e.g. "I searched the last 15 min — do you have a tighter timestamp or request ID?")
   - Never widen scope autonomously
6. **Iterate** — with the user's answer, refine and dispatch again.
7. **Synthesize** — once relevant data is found from both agents, produce the root cause report.

### Output Format

```
## Issue: [description]

### What I searched
- DB: [table / query / conditions]
- Logs: [log group / filter pattern / time window]

### Findings
[Relevant rows / log lines verbatim]

### Root Cause
[What went wrong and why]

### Code Reference
[file:line where the issue originates, if identifiable from the codebase]

### Suggested Fix or Next Step
[Specific action — code change, data fix, or further investigation]
```

If a conclusion cannot be reached, output "What I searched" + "What came up empty" and ask one targeted question.

## Specialist: `prod-db-query`

### Inputs (provided by coordinator)
- SSM instance ID (from SSM Parameter Store)
- RDS host (from SSM Parameter Store)
- Local port to forward (e.g. 15432)
- Database credentials (from SSM Parameter Store)
- SQL query (SELECT only)

### Behavior
1. Read SSM parameters for instance ID, RDS host, DB credentials.
2. Start SSM port-forward in background:
   ```bash
   aws ssm start-session \
     --target <instance-id> \
     --document-name AWS-StartPortForwardingSessionToRemoteHost \
     --parameters host=<rds-host>,portNumber=5432,localPortNumber=<local-port>
   ```
3. Wait for the tunnel to be ready.
4. Run the SQL query via `psql` on the forwarded local port.
5. Kill the port-forward session after query completes.
6. Return raw rows as a table.

### Constraints
- `SELECT` queries only — reject any query containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`.
- Always include `LIMIT` (default 50) to avoid flooding output.
- Always add `deleted_at IS NULL` where applicable (soft-delete convention).

## Specialist: `prod-logs`

### Inputs (provided by coordinator)
- Log group name (known, stored in SSM Parameter Store)
- Start time (ISO 8601 or epoch ms)
- End time (ISO 8601 or epoch ms)
- Filter pattern (CloudWatch filter syntax)

### Behavior
1. Call `aws logs filter-log-events` with the provided parameters.
2. Return matching log lines with timestamps.
3. If zero results, return the exact CLI command that was run so the coordinator can show the user what was searched.

### Default time window
15 minutes centered on the timestamp provided. Coordinator must specify explicitly; specialist never decides.

## Configuration (SSM Parameter Store paths)

These paths must exist in AWS SSM Parameter Store before agents can run:

| Parameter | Description |
|-----------|-------------|
| `/growth-tools/prod/ssm-instance-id` | EC2 instance ID used as SSM tunnel target |
| `/growth-tools/prod/rds-host` | RDS endpoint hostname |
| `/growth-tools/prod/db-name` | Production database name |
| `/growth-tools/prod/db-username` | DB username |
| `/growth-tools/prod/db-password` | DB password (SecureString) |
| `/growth-tools/prod/cloudwatch-log-group` | ECS service log group name |

## What Is Not in Scope

- Writing or modifying any production data
- Automated remediation (agents only investigate, never fix)
- Alerting or monitoring setup
- Multi-environment support (prod only for now)
