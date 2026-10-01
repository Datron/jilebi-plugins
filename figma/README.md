# Figma Plugin

[Figma REST API](https://developers.figma.com/docs/rest-api/) integration for Jilebi, generated from the [upstream OpenAPI spec](https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml).

This Jilebi plugin exposes the Figma REST API as MCP tools, covering every non-deprecated endpoint of the upstream spec.

## Setup

```bash
jilebi plugins add figma
jilebi plugins secrets set figma FIGMA_TOKEN <your-personal-access-token>
```

Create a personal access token under Figma → Account settings → Personal access tokens.

## Secrets

- `FIGMA_TOKEN` – Figma personal access token, sent as the `X-Figma-Token` header.

## Permissions

Each tool requests `hosts = ["https://api.figma.com"]`.

## Tools (50)

**Files**
- `get-file` – file JSON document (supports `ids`, `depth`, `geometry`, `version`, `branch_data`)
- `get-file-nodes` – JSON for specific nodes
- `get-images` – render node images (`jpg`/`png`/`svg`/`pdf`)
- `get-image-fills` – download links for image fills
- `get-file-meta` – file metadata
- `get-file-versions` – version history

**Comments**
- `get-comments` – list comments on a file
- `post-comment` – post a comment or reply
- `delete-comment` – delete a comment
- `get-comment-reactions` / `post-comment-reaction` / `delete-comment-reaction` – comment reactions

**Users**
- `get-me` – current authenticated user

**Components, component sets & styles**
- `get-team-components` / `get-file-components` / `get-component`
- `get-team-component-sets` / `get-file-component-sets` / `get-component-set`
- `get-team-styles` / `get-file-styles` / `get-style`

**Folders**
- `get-team-folders` – top-level folders in a team
- `get-folder-subfolders` – subfolders in a folder
- `get-folder-files` – files in a folder
- `get-folder-meta` – folder metadata

**Variables & dev resources**
- `get-local-variables` / `get-published-variables` – variables (Enterprise orgs)
- `post-variables` – create/modify/delete variables, collections, modes and values
- `get-dev-resources` / `post-dev-resources` / `update-dev-resources` / `delete-dev-resource`

**Webhooks (team admin)**
- `get-webhooks` / `post-webhook` / `get-webhook` / `update-webhook` / `delete-webhook`
- `get-webhook-requests` – delivery logs

**Logs, usage & payments**
- `get-activity-logs` – organization activity logs
- `get-developer-logs` – REST API and MCP server request logs
- `get-ai-usage-daily` – per-user daily AI credit usage
- `get-payments` – Community purchase information

**Library analytics**
- `get-library-analytics-component-actions` / `get-library-analytics-component-usages`
- `get-library-analytics-style-actions` / `get-library-analytics-style-usages`
- `get-library-analytics-variable-actions` / `get-library-analytics-variable-usages`

**Embeds**
- `get-oembed` – oEmbed data for Figma files and published Makes

## Prompts

- `design-review` – review a file for consistency, component usage and accessibility
- `dev-handoff` – produce a developer handoff summary for nodes
