# Superposition Plugin

[Superposition](https://github.com/juspay/superposition) is an open-source, context-based configuration management platform (feature flags, experiments, dynamic config).

This Jilebi plugin exposes the [Superposition OpenAPI](https://github.com/juspay/superposition/blob/main/docs/docs/api/Superposition.openapi.json) as MCP tools.

## Setup

```bash
jilebi plugins add superposition
jilebi plugins env set superposition SUPERPOSITION_BASE_URL http://localhost:8080
jilebi plugins env set superposition SUPERPOSITION_ORG_ID localorg
jilebi plugins env set superposition SUPERPOSITION_WORKSPACE dev
```

Or run the demo server locally:

```bash
docker run -p 8080:8080 ghcr.io/juspay/superposition-demo:latest
```

## Environment

- `SUPERPOSITION_BASE_URL` (default: `http://localhost:8080`) – Superposition server base URL
- `SUPERPOSITION_ORG_ID` – default organisation id (e.g. `localorg` in the demo image). Can also be passed per-tool as `org_id`.
- `SUPERPOSITION_WORKSPACE` – default workspace (e.g. `dev` in the demo image). Can also be passed per-tool as `workspace`.

## Permissions

Each tool requests `hosts = ["user_defined"]`. Approve your Superposition host (e.g. `http://localhost:8080`) when installing.

## Tools (87)

Generated from the upstream OpenAPI spec (`2025-03-05`):

**Configuration Management**
- `get-config`, `get-config-json`, `get-resolved-config`, `get-detailed-resolved-config`, `get-resolved-config-explanation`, `get-config-toml`, `list-versions`, `get-version`, `get-resolved-config-with-identifier`

**Contexts**
- `list-contexts`, `create-context`, `bulk-operation`, `get-context-from-condition`, `move-context`, `update-override`, `validate-context`, `weight-recompute`, `delete-context`, `get-context`

**Default configs**
- `list-default-configs`, `create-default-config`, `delete-default-config`, `get-default-config`, `update-default-config`

**Dimensions**
- `list-dimensions`, `create-dimension`, `delete-dimension`, `get-dimension`, `update-dimension`

**Experiments**
- `get-experiment-config`, `create-experiment-group`, `list-experiment-groups`, `delete-experiment-group`, `get-experiment-group`, `update-experiment-group`, `add-members-to-group`, `remove-members-from-group`, `create-experiment`, `applicable-variants`, `list-experiment`, `get-experiment`, `conclude-experiment`, `discard-experiment`, `update-overrides-experiment`, `pause-experiment`, `ramp-experiment`, `resume-experiment`

**Functions**
- `list-function`, `create-function`, `delete-function`, `get-function`, `update-function`, `publish`, `test`

**Secrets / types / variables / webhooks / workspaces / organisations / audit**
- `list-secrets`, `create-secret`, `delete-secret`, `get-secret`, `update-secret`
- `get-type-templates-list`, `create-type-templates`, `delete-type-templates`, `get-type-template`, `update-type-templates`
- `list-variables`, `create-variable`, `delete-variable`, `get-variable`, `update-variable`
- `list-webhook`, `create-webhook`, `get-webhook-by-event`, `delete-webhook`, `get-webhook`, `update-webhook`
- `list-workspace`, `create-workspace`, `get-workspace`, `update-workspace`, `migrate-workspace-schema`, `rotate-workspace-encryption-key`, `rotate-master-encryption-key`
- `list-organisation`, `create-organisation`, `get-organisation`, `update-organisation`
- `list-audit-logs`

Every tool also accepts optional `org_id` / `workspace` overrides and talks to `{SUPERPOSITION_BASE_URL}<path>`.
