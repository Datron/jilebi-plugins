# Nix Jilebi Plugin

Comprehensive NixOS, Home Manager, nix-darwin, and NixHub integration plugin for Jilebi.

Ported from the [mcp-nixos](https://github.com/utensils/mcp-nixos) Python MCP server to the Jilebi plugin format.

## Overview

This plugin provides AI assistants with accurate, real-time information about the Nix ecosystem:

- NixOS packages (130K+ packages)
- Configuration options (22K+ NixOS options)
- Home Manager settings (4K+ user configuration options)
- nix-darwin configurations (1K+ macOS settings)
- Package version history via NixHub.io

## Features

- Real-time data from official NixOS APIs
- Dynamic channel resolution (stable always points to current stable)
- Smart option suggestions when exact matches are not found
- Version-aware package searches with commit hashes
- Category browsing for organized option exploration
- Cross-platform compatibility (works on any system)

## Available Tools

### NixOS Tools

#### nixos-search
Search NixOS packages, options, or programs.

Parameters:
- `query` (string, required): Search term
- `search_type` (string, optional): Type - "packages", "options", "programs", or "flakes" (default: "packages")
- `limit` (number, optional): Max results 1-100 (default: 20)
- `channel` (string, optional): Channel like "unstable", "stable", "25.05" (default: "unstable")

#### nixos-info
Get detailed information about a NixOS package or option.

Parameters:
- `name` (string, required): Package or option name
- `type` (string, optional): "package" or "option" (default: "package")
- `channel` (string, optional): Channel to search (default: "unstable")

#### nixos-channels
List available NixOS channels with their status.

No parameters required.

#### nixos-stats
Get package and option counts for a channel.

Parameters:
- `channel` (string, optional): Channel to get stats for (default: "unstable")

### Home Manager Tools

#### home-manager-search
Search Home Manager configuration options.

Parameters:
- `query` (string, required): Search query
- `limit` (number, optional): Max results 1-100 (default: 20)

#### home-manager-info
Get detailed information about a specific Home Manager option.

Parameters:
- `name` (string, required): Exact option name (e.g., "programs.git.enable")

#### home-manager-stats
Get statistics about available Home Manager options.

No parameters required.

#### home-manager-list-options
List all Home Manager option categories.

No parameters required.

#### home-manager-options-by-prefix
Explore Home Manager options by prefix.

Parameters:
- `prefix` (string, required): Option prefix (e.g., "programs.git")
- `limit` (number, optional): Max results (default: 50)

### nix-darwin Tools

#### darwin-search
Search nix-darwin (macOS) configuration options.

Parameters:
- `query` (string, required): Search query
- `limit` (number, optional): Max results 1-100 (default: 20)

#### darwin-info
Get detailed information about a specific nix-darwin option.

Parameters:
- `name` (string, required): Exact option name (e.g., "system.defaults.dock.autohide")

#### darwin-stats
Get statistics about available nix-darwin options.

No parameters required.

#### darwin-list-options
List all nix-darwin option categories.

No parameters required.

#### darwin-options-by-prefix
Explore nix-darwin options by prefix.

Parameters:
- `prefix` (string, required): Option prefix (e.g., "system.defaults")
- `limit` (number, optional): Max results (default: 50)

### Flakes Tools

#### nixos-flakes-stats
Get statistics about available community flakes.

No parameters required.

#### nixos-flakes-search
Search community NixOS flakes.

Parameters:
- `query` (string, required): Search term
- `limit` (number, optional): Max results 1-100 (default: 20)

### NixHub Tools

#### nixhub-package-versions
Get version history and nixpkgs commit hashes for a package.

Parameters:
- `package_name` (string, required): Package name (e.g., "firefox", "python")
- `limit` (number, optional): Max versions 1-50 (default: 10)

#### nixhub-find-version
Find a specific version of a package with commit hash.

Parameters:
- `package_name` (string, required): Package name (e.g., "ruby", "python")
- `version` (string, required): Specific version (e.g., "2.6.7", "3.5.9")

## Configuration

### Environment Variables

- `ELASTICSEARCH_URL`: NixOS API endpoint (default: "https://search.nixos.org/backend")

No API keys or authentication required.

## Usage Examples

### Search for a package
```json
{
  "query": "firefox",
  "search_type": "packages",
  "channel": "unstable"
}
```

### Get package information
```json
{
  "name": "firefox",
  "type": "package",
  "channel": "unstable"
}
```

### Search Home Manager options
```json
{
  "query": "git",
  "limit": 10
}
```

### Find a specific package version
```json
{
  "package_name": "ruby",
  "version": "2.6.7"
}
```

### Browse options by prefix
```json
{
  "prefix": "programs.git"
}
```

## Architecture

This plugin:

- Uses Jilebi runtime fetch API for all HTTP requests
- Implements channel caching for performance
- Parses HTML documentation using runtime.html2markdown
- Returns plain text responses optimized for AI consumption
- Handles errors gracefully with helpful suggestions

## Data Sources

This plugin queries:

- [search.nixos.org](https://search.nixos.org) - Official NixOS package and option search
- [NixHub.io](https://www.nixhub.io) - Package version history and commit tracking
- [Home Manager docs](https://nix-community.github.io/home-manager/) - User configuration options
- [nix-darwin docs](https://nix-darwin.github.io/nix-darwin/) - macOS configuration options

## Migration from MCP Server

This plugin is a complete port of the mcp-nixos Python MCP server to TypeScript for the Jilebi runtime. Key differences:

- Uses Jilebi runtime APIs instead of direct HTTP libraries
- Implements all 17 tools from the original server
- Maintains identical functionality and output formats
- No external dependencies beyond Jilebi runtime

See MIGRATION.md for detailed migration documentation.

## Development

### Building

```bash
npm install
npm run build
```

This compiles TypeScript to JavaScript using Rollup.

### Plugin Structure

- `index.ts` - Main plugin implementation with all tool functions (1,833 lines)
- `manifest.toml` - Plugin metadata and tool definitions (266 lines)
- `package.json` - Build configuration and dependencies
- `tsconfig.json` - TypeScript compiler configuration
- `rollup.config.js` - Rollup bundler configuration
- `README.md` - This file
- `MIGRATION.md` - Detailed migration notes

### Testing

The plugin can be tested by building it and loading it into a Jilebi runtime environment. All tools should produce identical output to the original Python MCP server.

## License

This plugin is based on mcp-nixos which is MIT licensed. Ported and adapted for Jilebi.

## Acknowledgments

- Original mcp-nixos project by James Brink
- NixOS project for the package ecosystem
- Jetify for NixHub.io
- Home Manager and nix-darwin communities