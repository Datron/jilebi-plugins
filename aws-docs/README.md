# AWS Documentation Plugin

Access AWS documentation, search for content, and get recommendations through the official AWS documentation APIs.

## Features

- **Read Documentation**: Fetch and convert AWS documentation pages to markdown format
- **Search Documentation**: Search AWS documentation using the official search API
- **Get Recommendations**: Discover related content and new features for documentation pages

## Installation

```bash
jilebi plugins add aws-docs
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_DOCUMENTATION_PARTITION` | AWS partition (`aws` or `aws-cn`) | `aws` |

## Tools

### read-documentation

Fetch and convert an AWS documentation page to markdown format.

**Parameters:**
- `url` (required): URL of the AWS documentation page (must be from docs.aws.amazon.com and end with .html)
- `max_length` (optional): Maximum characters to return (default: 5000)
- `start_index` (optional): Starting character index for pagination (default: 0)

**Example:**
```json
{
  "url": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html",
  "max_length": 10000
}
```

### search-documentation

Search AWS documentation using the official AWS Documentation Search API.

**Parameters:**
- `search_phrase` (required): Search phrase to use for finding documentation
- `limit` (optional): Maximum number of results to return, 1-50 (default: 10)

**Example:**
```json
{
  "search_phrase": "S3 bucket policy examples",
  "limit": 5
}
```

### get-recommendations

Get content recommendations for an AWS documentation page.

**Parameters:**
- `url` (required): URL of the AWS documentation page to get recommendations for

**Example:**
```json
{
  "url": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html"
}
```

## Prompts

### documentation-lookup

Look up AWS documentation for a specific service or feature.

**Arguments:**
- `service` (required): AWS service name (e.g., S3, Lambda, EC2)
- `feature` (optional): Specific feature or topic within the service

## Usage Examples

### Finding Documentation

```
Search for Lambda function configuration documentation and summarize the key points.
```

### Reading Specific Pages

```
Read the AWS S3 bucket naming rules documentation at https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
```

### Discovering Related Content

```
Get recommendations for related content based on the EC2 instance types page.
```

## Supported Domains

- `docs.aws.amazon.com` - Main AWS documentation
- `awsdocs-neuron.readthedocs-hosted.com` - AWS Neuron SDK documentation

## Notes

- For long documentation pages, use the `start_index` parameter to paginate through content
- The plugin automatically converts HTML to markdown for easier reading
- Search results include excerpts to help identify relevant pages
- Recommendations include related topics, new features, and additional resources

## License

Apache-2.0