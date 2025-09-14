# Jilebi Plugins

Jilebi is a Model Context Protocol (MCP) runtime that provides secure sandboxing for MCP plugins, ensuring they can only access resources and capabilities that users explicitly allow. This repository contains a collection of plugins that extend Jilebi's functionality across various domains including development tools, documentation access, file management, and more.

## Installation

To install any of these plugins in your Jilebi runtime:

```bash
jilebi plugins add <plugin_name>
```

For example:
```bash
jilebi plugins add github
jilebi plugins add filesystem
jilebi plugins add context7
```

## Manifest.toml Format

Each plugin includes a `manifest.toml` file that defines its capabilities, permissions, and interface. The manifest follows this schema:

### Basic Structure
```toml
name = "plugin-name"           # Plugin identifier (required)
version = "1.0.0"             # Plugin version
homepage = "https://..."       # Plugin homepage URL
creator = "Plugin Creator"     # Plugin creator/maintainer
contact = "support@..."        # Contact information

[env]                         # Environment variables (optional)
VAR_NAME = { schema = { type = "string" }, default = "value" }

[secrets]                     # Secrets/API keys (optional)
API_KEY = { schema = { type = "string" } }

[resources]                   # Static resources (optional)
[resources.resource-name]
name = "Resource Display Name"
description = "What this resource provides"
mime_type = "text/plain"
function = "function_name"
[resources.resource-name.permissions]
# Permission settings...

[tools]                       # Interactive tools (required)
[tools.tool-name]
name = "tool-name"
description = "What this tool does"
input_schema = { type = "object", properties = { ... }, required = [...] }
function = "function_name"
[tools.tool-name.annotations]
title = "Tool Display Title"
read_only_hint = true/false
destructive_hint = true/false
idempotent_hint = true/false
open_world_hint = true/false
[tools.tool-name.permissions]
# Permission settings...

[prompts]                     # Conversation templates (optional)
[prompts.prompt-name]
name = "prompt-name"
description = "What this prompt helps with"
arguments = [
  { name = "arg1", description = "Argument description", required = true },
]
messages = [
  { role = "user", content = { type = "text", content = "Template content" } },
]
```

### Permission Types
- `hosts` - Array of allowed host domains
- `urls` - Array of specific allowed URLs
- `config_keys` - Array of configuration keys the plugin can access
- `read_files` - Array of file paths/patterns the plugin can read
- `write_files` - Array of file paths/patterns the plugin can write
- `read_dirs` - Array of directory paths the plugin can read from
- `write_dirs` - Array of directory paths the plugin can write to

## Available Plugins

### 🐙 GitHub Plugin
**Tools**: Repository management, issue tracking, pull requests, workflow automation  
**Resources**: None  
**Prompts**: `issue-to-fix-workflow`  
**Permissions**: `hosts: ["https://api.github.com"]`  
**Secrets**: `GITHUB_TOKEN`  

Provides comprehensive GitHub integration including repository search, issue management, pull request creation, commit history, file content access, workflow monitoring, and gist creation.

**Key Tools**:
- `get-me` - Get authenticated user information
- `search-repositories` - Search GitHub repositories
- `create-issue` - Create new issues
- `create-pull-request` - Create pull requests
- `get-file-contents` - Read repository files
- `list-commits` - Browse commit history
- `create-gist` - Create code gists

---

### 📁 Filesystem Plugin
**Tools**: File and directory operations  
**Resources**: None  
**Prompts**: None  
**Permissions**: `read_dirs: ["user_defined"]`, `write_dirs: ["user_defined"]`  
**Secrets**: None  

Comprehensive file system operations for reading, writing, and managing files and directories with sandbox protection.

**Key Tools**:
- `read-text-file` - Read text files with head/tail support
- `read-media-file` - Read images/audio as base64
- `write-file` - Create/overwrite files
- `edit-file` - Make selective edits using pattern matching
- `create-directory` - Create directories
- `list-directory` - List directory contents with sizes
- `directory-tree` - Get recursive directory structure
- `move-file` - Move/rename files and directories
- `search-files` - Find files matching patterns

---

### 📚 Context7 Plugin
**Tools**: Documentation access and library discovery  
**Resources**: None  
**Prompts**: `library-summary`  
**Permissions**: `hosts: ["https://context7.com"]`  
**Secrets**: None  

Access up-to-date documentation for popular libraries and frameworks through the Context7 service.

**Key Tools**:
- `resolve-library-id` - Find Context7-compatible library identifiers
- `get-library-docs` - Fetch comprehensive library documentation

---

### ☁️ Cloudflare Plugin
**Tools**: Cloudflare service management and documentation  
**Resources**: None  
**Prompts**: `workers-prompt-full`, `cloudflare-optimization`  
**Permissions**: `hosts: ["https://api.cloudflare.com", "https://developers.cloudflare.com"]`  
**Environment**: `CLOUDFLARE_ACCOUNT_ID`  
**Secrets**: `CLOUDFLARE_API_TOKEN`  

Manage Cloudflare services including Workers, AI Gateway, and access comprehensive documentation.

**Key Tools**:
- `ai-gateway-list-gateways` - List AI Gateway instances
- `workers-list-scripts` - List Cloudflare Workers scripts  
- `browser-get-html` - Get HTML content using Cloudflare Browser API
- `docs-search` - Search Cloudflare developer documentation

---

### 🧠 Memory Plugin
**Tools**: Knowledge graph management  
**Resources**: None  
**Prompts**: None  
**Permissions**: None  
**Secrets**: None  

Create and manage a persistent knowledge graph for storing and retrieving interconnected information.

**Key Tools**:
- `create-entities` - Create new entities in the knowledge graph
- `add-observations` - Add observations to existing entities
- `create-relations` - Create relationships between entities
- `read-graph` - Read the entire knowledge graph
- `search-nodes` - Search entities and observations
- `open-nodes` - Retrieve specific entities by name
- `delete-entities` - Remove entities and their relations
- `delete-observations` - Remove specific observations
- `delete-relations` - Remove relationships

---

### 🎌 AniList Plugin
**Tools**: Anime and manga database access  
**Resources**: None  
**Prompts**: `anime-recommendation`, `character-analysis`, `seasonal-anime`  
**Permissions**: `hosts: ["https://graphql.anilist.co"]`  
**Secrets**: None  

Access comprehensive anime and manga information from the AniList database.

**Key Tools**:
- `search-anime` - Search for anime titles
- `search-manga` - Search for manga titles  
- `search-characters` - Search for anime/manga characters
- `get-anime-details` - Get detailed anime information
- `get-manga-details` - Get detailed manga information
- `get-character-details` - Get character information
- `get-trending-anime` - Get currently trending anime
- `get-trending-manga` - Get currently trending manga

---

### 🦀 Rust Docs Plugin
**Tools**: Rust crate documentation and discovery  
**Resources**: None  
**Prompts**: `rust-documentation-guide`, `crate-comparison`, `rust-learning-path`  
**Permissions**: `hosts: ["https://crates.io", "https://docs.rs"]`  
**Secrets**: None  

Search and access Rust crate documentation and examples.

**Key Tools**:
- `search-rust-docs` - Search across multiple Rust crates
- `get-crate-info` - Get basic crate information and versions

---

### 🏛️ Met Museum Plugin
**Tools**: Metropolitan Museum of Art collection access  
**Resources**: None  
**Prompts**: `explore-art-collection`, `art-discovery`, `museum-educator`  
**Permissions**: `hosts: ["https://collectionapi.metmuseum.org"]`  
**Secrets**: None  

Explore and search the Metropolitan Museum of Art's collection.

**Key Tools**:
- `search-museum-objects` - Search the museum collection
- `get-museum-object` - Get detailed object information
- `list-departments` - List museum departments

---

### ⏰ Time Plugin
**Tools**: Time zone conversion and current time  
**Resources**: None  
**Prompts**: None  
**Permissions**: None  
**Secrets**: None  

Handle time zone conversions and get current time in different zones.

**Key Tools**:
- `get-current-time` - Get current time in specific timezone
- `convert-time` - Convert time between timezones

---

### 💭 Sequential Thinking Plugin
**Tools**: Structured problem-solving framework  
**Resources**: None  
**Prompts**: None  
**Permissions**: None  
**Secrets**: None  

Provides a framework for dynamic and reflective problem-solving through sequential thoughts.

**Key Tools**:
- `sequential-thinking` - Structured thinking process with branching and revision capabilities

---

### 🔧 Jilebi Gen Plugin
**Tools**: Plugin generation and development assistance  
**Resources**: Manifest schema, examples  
**Prompts**: `create-plugin`  
**Permissions**: None  
**Secrets**: None  

Generate new Jilebi plugins with proper structure and documentation.

**Key Tools**:
- Various generation tools for creating plugin boilerplates and code

## Security Model

Jilebi's sandbox architecture ensures that:

1. **Resource Access Control**: Plugins can only access files, directories, and network resources explicitly permitted in their manifest
2. **Secret Management**: API keys and sensitive data are managed securely and only provided to authorized plugins
3. **Permission Isolation**: Each plugin operates in its own security context
4. **User Consent**: Users must explicitly approve plugin permissions before installation

## Contributing

To contribute a new plugin:

1. run the command `jilebi plugin create`
2. Follow the steps and create a new plugin
3. Define the plugin interface in `manifest.toml`
4. Implement your plugin logic in `index.js` or `index.ts`
5. Include a `README.md` with usage instructions
5. Add appropriate `package.json` and build configuration

The workflow will automatically package and distribute your plugin when merged.
