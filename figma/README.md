# Figma Plugin

[Figma REST API](https://developers.figma.com/docs/rest-api/) integration for Jilebi, generated from the [upstream OpenAPI spec](https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml).

This Jilebi plugin exposes a curated subset of the Figma API as MCP tools: files, rendered images, comments, components, styles, folders, variables and dev resources.

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

## Tools (20)

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

**Users**
- `get-me` – current authenticated user

**Components & styles**
- `get-team-components` / `get-file-components` / `get-component`
- `get-team-styles` / `get-file-styles` / `get-style`

**Folders**
- `get-team-folders` – top-level folders in a team
- `get-folder-files` – files in a folder

**Variables & dev resources**
- `get-local-variables` – local variables (Enterprise orgs)
- `get-dev-resources` – dev resources in a file

## Prompts

- `design-review` – review a file for consistency, component usage and accessibility
- `dev-handoff` – produce a developer handoff summary for nodes
