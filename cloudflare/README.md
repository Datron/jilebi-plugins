# Cloudflare Jilebi Plugin 🌐

A comprehensive Jilebi plugin providing access to all Cloudflare services and APIs through a unified interface. This plugin consolidates functionality from multiple Cloudflare MCP servers into a single, easy-to-use plugin.

## Features

This plugin provides access to the following Cloudflare services:

### 🤖 AI Services
- **AI Gateway**: Manage AI Gateway instances, search logs, analyze prompts and responses
- **AutoRAG**: List and search documents in AutoRAG instances

### 🌐 Web & Browser Services
- **Browser Rendering**: Get HTML content, convert to Markdown, take screenshots
- **DNS Analytics**: Query DNS performance data and optimization insights
- **Radar**: Global internet traffic insights, ASN data, URL security scanning

### ⚡ Workers Platform
- **Workers Scripts**: List, get details of Workers scripts
- **Workers Observability**: Query Workers analytics and monitoring data
- **KV Storage**: Manage KV namespaces, keys, and values
- **R2 Storage**: List buckets and objects in R2 storage
- **D1 Database**: List databases and execute SQL queries

### 🔒 Security Services
- **CASB**: Get security findings for SaaS applications
- **DEX Analysis**: Digital Experience Monitoring insights
- **Audit Logs**: Query audit logs and generate reports

### 📊 Analytics & Data
- **GraphQL API**: Execute GraphQL queries against Cloudflare Analytics
- **Logpush**: List jobs and get health summaries

### 📚 Documentation & Support
- **Documentation Search**: Search Cloudflare documentation using Vectorize

## Setup

### 1. API Token

Create a Cloudflare API token with the appropriate permissions:
1. Go to [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a custom token with the following permissions based on services you want to use:

**Minimum Required Permissions:**
- Account: Read
- Zone: Read

**Service-Specific Permissions:**
- **AI Gateway**: AI Gateway:Read
- **Workers**: Workers:Read, Workers KV Storage:Read
- **R2**: R2:Read
- **D1**: D1:Read
- **DNS**: Zone:Read
- **Security**: Zero Trust:Read

### 2. Configure Plugin

Set your Cloudflare API token in the plugin configuration:
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token

## Available Tools

### Account Management
- `account-list`: List Cloudflare accounts you have access to
- `account-set-active`: Set the active account for subsequent API calls
- `zones-list`: List zones (domains) in your Cloudflare account

### AI Gateway
- `ai-gateway-list-gateways`: List AI Gateway instances
- `ai-gateway-get-gateway`: Get details of a specific AI Gateway
- `ai-gateway-list-logs`: List AI Gateway logs for analysis

### AutoRAG
- `autorag-list-instances`: List AutoRAG instances in your account
- `autorag-search-documents`: Search documents in an AutoRAG instance

### Browser Rendering
- `browser-get-html`: Get HTML content of a webpage
- `browser-get-markdown`: Get webpage content converted to Markdown
- `browser-screenshot`: Take a screenshot of a webpage

### DNS Analytics
- `dns-analytics-query`: Query DNS analytics data for zones

### GraphQL
- `graphql-query`: Execute GraphQL queries against Cloudflare Analytics API

### Radar Services
- `radar-list-asns`: List Autonomous Systems (ASNs)
- `radar-get-asn-details`: Get details of a specific ASN
- `radar-url-scanner`: Scan URL for security threats
- `radar-traffic-insights`: Get global internet traffic insights

### Workers Platform
- `workers-list-scripts`: List Workers scripts
- `workers-get-script`: Get details of a specific Workers script
- `workers-observability-query`: Query Workers observability data

### Storage Services
#### KV Storage
- `kv-list-namespaces`: List KV namespaces
- `kv-list-keys`: List keys in a KV namespace
- `kv-get-value`: Get value from KV store

#### R2 Storage
- `r2-list-buckets`: List R2 storage buckets
- `r2-list-objects`: List objects in an R2 bucket

#### D1 Database
- `d1-list-databases`: List D1 databases
- `d1-query-database`: Execute SQL queries on D1 database

### Security & Monitoring
- `security-casb-findings`: Get CASB security findings
- `security-dex-analysis`: Get Digital Experience Monitoring insights
- `logpush-list-jobs`: List Logpush jobs and health status
- `logpush-job-summary`: Get health summary for Logpush jobs

### Documentation
- `docs-search`: Search Cloudflare documentation

## Available Prompts

### workers-prompt-full
Detailed prompt for generating Cloudflare Workers code using comprehensive developer platform documentation.

### cloudflare-optimization
Get recommendations for optimizing Cloudflare configuration and performance.
- **service** (optional): Cloudflare service to optimize (dns, workers, security, etc.)
- **focus** (optional): Specific area to focus on (performance, security, cost, etc.)

## Usage Examples

### List Your Accounts
```
Use the account-list tool to show all my Cloudflare accounts
```

### Browser Rendering
```
Take a screenshot of https://example.com using browser-screenshot
```

### Workers Management
```
List all my Workers scripts and show their details
```

### DNS Analytics
```
Query DNS analytics for zone abc123 for the last 7 days
```

### Security Analysis
```
Get CASB security findings for all SaaS applications
```

### Documentation Search
```
Search Cloudflare docs for "Workers KV best practices"
```

## Troubleshooting

### Rate Limits
If you encounter rate limiting:
- Be specific with your queries to reduce API calls
- Break complex requests into smaller, focused queries
- Wait between requests if hitting rate limits

### Account Access
If you get account access errors:
- Ensure your API token has the correct permissions
- Use `account-list` to see available accounts
- Use `account-set-active` to set the correct active account

### API Errors
For API errors:
- Verify your API token is valid and not expired
- Check that you have the required permissions for the service
- Ensure the account/zone IDs are correct

## Security Notes

- Never share your API token
- Use tokens with minimum required permissions
- Regularly rotate your API tokens
- Monitor API token usage in Cloudflare Dashboard

## Support

For issues with this plugin:
1. Check the Cloudflare API documentation
2. Verify your API token permissions
3. Review the error messages for specific guidance

For Cloudflare service issues, refer to the [Cloudflare Documentation](https://developers.cloudflare.com/).
