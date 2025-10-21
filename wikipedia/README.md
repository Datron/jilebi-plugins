# Wikipedia Jilebi Plugin

A comprehensive Wikipedia integration plugin for Jilebi that provides full access to Wikipedia's API functionality including article search, content retrieval, summaries, and geographic data.

## Features

- **Search Wikipedia**: Search for articles with customizable result limits
- **Get Articles**: Retrieve full article content including text, categories, and links
- **Get Summaries**: Quick access to article summaries
- **Query-Focused Summaries**: Get summaries tailored to specific queries
- **Section Summaries**: Extract summaries from specific article sections
- **Extract Key Facts**: Pull out key facts from articles
- **Related Topics**: Discover related articles and topics
- **Article Structure**: Get sections, links, and categories
- **Geographic Data**: Retrieve coordinates for location-based articles
- **Multi-language Support**: Support for 300+ language editions of Wikipedia
- **Country-Specific Settings**: Automatic language detection based on country codes
- **Connectivity Testing**: Built-in diagnostics for API connectivity

## Installation

```bash
jilebi plugins add wikipedia
```

## Configuration

### Environment Variables

- `WIKIPEDIA_LANGUAGE` - Language code for Wikipedia (default: `en`)
  - Examples: `en`, `es`, `fr`, `de`, `ja`, `zh-hans`, `zh-tw`
- `WIKIPEDIA_COUNTRY` - Country/locale code (overrides language if set)
  - Examples: `US`, `UK`, `CN`, `TW`, `JP`, `DE`, `FR`
- `WIKIPEDIA_ENABLE_CACHE` - Enable caching for API calls (default: `false`)

### Secrets

- `WIKIPEDIA_ACCESS_TOKEN` - Personal access token for Wikipedia API (optional)
  - Used to increase rate limits and avoid 403 errors

## Tools

### `search-wikipedia`

Search Wikipedia for articles matching a query.

**Parameters**:
- `query` (string, required): Search query for Wikipedia articles
- `limit` (number, optional): Maximum number of results to return (default: 10, max: 500)

**Returns**: Search results with title, snippet, page ID, word count, and timestamp

**Example**:
```typescript
const results = await search_wikipedia({
  query: "artificial intelligence",
  limit: 10
});
```

### `test-wikipedia-connectivity`

Test connectivity to the Wikipedia API and get diagnostics.

**Parameters**: None

**Returns**: Connectivity status, response time, site information

**Example**:
```typescript
const status = await test_wikipedia_connectivity({});
```

### `get-article`

Get the full content of a Wikipedia article.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article

**Returns**: Complete article data including text, categories, links, and metadata

**Example**:
```typescript
const article = await get_article({
  title: "Machine Learning"
});
```

### `get-summary`

Get a concise summary of a Wikipedia article.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article

**Returns**: Article summary

**Example**:
```typescript
const summary = await get_summary({
  title: "Quantum Computing"
});
```

### `summarize-article-for-query`

Get a summary of a Wikipedia article tailored to a specific query.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article
- `query` (string, required): Query to focus the summary on
- `max_length` (number, optional): Maximum length of the summary (default: 250)

**Returns**: Query-focused summary with context

**Example**:
```typescript
const summary = await summarize_article_for_query({
  title: "Python (programming language)",
  query: "data science",
  max_length: 300
});
```

### `summarize-article-section`

Get a summary of a specific section of a Wikipedia article.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article
- `section_title` (string, required): Title of the section to summarize
- `max_length` (number, optional): Maximum length of the summary (default: 150)

**Returns**: Section summary

**Example**:
```typescript
const sectionSummary = await summarize_article_section({
  title: "Climate change",
  section_title: "Effects",
  max_length: 200
});
```

### `extract-key-facts`

Extract key facts from a Wikipedia article, optionally focused on a topic.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article
- `topic_within_article` (string, optional): Optional topic to focus on within the article
- `count` (number, optional): Number of key facts to extract (default: 5)

**Returns**: List of extracted facts

**Example**:
```typescript
const facts = await extract_key_facts({
  title: "Solar System",
  topic_within_article: "planets",
  count: 7
});
```

### `get-related-topics`

Get topics related to a Wikipedia article based on links and categories.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article
- `limit` (number, optional): Maximum number of related topics to return (default: 10)

**Returns**: List of related topics with summaries

**Example**:
```typescript
const related = await get_related_topics({
  title: "Blockchain",
  limit: 15
});
```

### `get-sections`

Get the sections/structure of a Wikipedia article.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article

**Returns**: List of article sections with hierarchy

**Example**:
```typescript
const sections = await get_sections({
  title: "World War II"
});
```

### `get-links`

Get the links contained within a Wikipedia article.

**Parameters**:
- `title` (string, required): Title of the Wikipedia article

**Returns**: List of linked articles

**Example**:
```typescript
const links = await get_links({
  title: "United States"
});
```

### `get-coordinates`

Get the geographic coordinates of a Wikipedia article (if available).

**Parameters**:
- `title` (string, required): Title of the Wikipedia article

**Returns**: Geographic coordinates with metadata

**Example**:
```typescript
const coordinates = await get_coordinates({
  title: "Eiffel Tower"
});
```

## Language Support

The plugin supports all Wikipedia language editions. You can specify the language either through:

1. **Language Code**: Direct language specification
   ```
   WIKIPEDIA_LANGUAGE=es  # Spanish
   WIKIPEDIA_LANGUAGE=zh-hans  # Simplified Chinese
   WIKIPEDIA_LANGUAGE=ja  # Japanese
   ```

2. **Country Code**: Automatic language resolution
   ```
   WIKIPEDIA_COUNTRY=US  # English
   WIKIPEDIA_COUNTRY=CN  # Simplified Chinese
   WIKIPEDIA_COUNTRY=JP  # Japanese
   WIKIPEDIA_COUNTRY=FR  # French
   ```

### Supported Language Variants

- **Chinese**: `zh-hans` (Simplified), `zh-hant` (Traditional), `zh-tw` (Taiwan), `zh-hk` (Hong Kong)
- **Serbian**: `sr-latn` (Latin), `sr-cyrl` (Cyrillic)
- **Norwegian**: `no` (Bokmål default)
- **Kurdish**: `ku-latn` (Latin), `ku-arab` (Arabic)

## Permissions

The plugin requires access to Wikipedia API endpoints:
- `hosts: ["https://*.wikipedia.org"]`

## Rate Limiting

The plugin respects Wikipedia's API guidelines and includes built-in error handling for rate limiting. For higher rate limits, consider using a `WIKIPEDIA_ACCESS_TOKEN`.

## Error Handling

All tools include comprehensive error handling and return meaningful error messages:
- Connectivity issues
- Page not found errors
- API rate limiting
- Invalid parameters
- Malformed responses

## Development

This plugin is built with TypeScript and follows the Jilebi plugin structure:

- `manifest.toml`: Plugin configuration and metadata
- `index.ts`: Main plugin implementation with all tools
- `README.md`: Documentation

## API Rate Limits

Without authentication:
- Standard rate limits apply per IP address

With `WIKIPEDIA_ACCESS_TOKEN`:
- Increased rate limits
- Reduced 403 errors
- Better reliability for high-volume usage

## Use Cases

- **Research**: Quick access to encyclopedic information
- **Content Creation**: Gather facts and references
- **Education**: Learning assistant with multi-language support
- **Geographic Applications**: Location data for mapping
- **Link Analysis**: Explore topic relationships
- **Multilingual Applications**: Support for 300+ languages

## Source

Based on Wikipedia MCP Server v1.6.0
- Repository: https://github.com/Rudra-ravi/wikipedia-mcp
- Author: Rudra-ravi

## License

See the main repository for license information.

## Support

For issues, feature requests, or contributions, please visit the GitHub repository.
