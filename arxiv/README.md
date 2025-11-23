# ArXiv Jilebi Plugin

A comprehensive Jilebi plugin for searching, downloading, and analyzing academic papers from arXiv.

## Features

### Tools

#### 1. **search-papers**
Search for papers on arXiv with advanced filtering and query optimization.

**Parameters:**
- `query` (string, required): Search query using quoted phrases for exact matches
- `max_results` (integer, optional): Maximum number of results (default: 10, max: 50)
- `date_from` (string, optional): Start date in YYYY-MM-DD format
- `date_to` (string, optional): End date in YYYY-MM-DD format
- `categories` (array, optional): arXiv categories to filter (e.g., ['cs.AI', 'cs.LG'])
- `sort_by` (string, optional): Sort by 'relevance' (default) or 'date'

**Query Construction Guidelines:**
- Use QUOTED PHRASES for exact matches: "multi-agent systems", "neural networks"
- Combine concepts with OR: "AI agents" OR "software agents"
- Use field-specific searches:
  - `ti:"exact title phrase"` - search in titles only
  - `au:"author name"` - search by author
  - `abs:"keyword"` - search in abstracts only
- Use ANDNOT to exclude results: "machine learning" ANDNOT "survey"

**Example:**
```typescript
await searchPapers({
  query: 'ti:"reinforcement learning"',
  categories: ['cs.LG', 'cs.AI'],
  max_results: 20,
  date_from: '2023-01-01'
});
```

#### 2. **download-paper**
Download a paper and convert it to markdown format for analysis.

**Parameters:**
- `paper_id` (string, required): The arXiv ID of the paper
- `check_status` (boolean, optional): Only check conversion status without downloading

**Example:**
```typescript
await downloadPaper({ paper_id: '2301.12345' });
```

#### 3. **list-papers**
List all downloaded papers available in local storage.

**Example:**
```typescript
await listPapers({});
```

#### 4. **read-paper**
Read the full content of a stored paper in markdown format.

**Parameters:**
- `paper_id` (string, required): The arXiv ID of the paper to read

**Example:**
```typescript
await readPaper({ paper_id: '2301.12345' });
```

### Prompts

#### **deep-paper-analysis**
Comprehensive prompt for analyzing academic papers with structured guidance.

**Parameters:**
- `paper_id` (string, required): arXiv paper ID to analyze

**Analysis Workflow:**
1. Check if paper is downloaded, download if needed
2. Perform comprehensive analysis including:
   - Executive Summary
   - Research Context
   - Methodology Analysis
   - Results Analysis
   - Practical & Theoretical Implications
   - Future Directions
   - Broader Impact

## Configuration

### Environment Variables

- `STORAGE_PATH`: Directory for storing downloaded papers (default: `~/.arxiv-mcp-server/papers`)

### Permissions

The plugin requires the following permissions:

**Network Access:**
- `https://export.arxiv.org` - For API queries
- `https://arxiv.org` - For downloading PDFs

**File System:**
- Read access to `STORAGE_PATH` for listing and reading papers
- Write access to `STORAGE_PATH` for downloading papers

## Usage

1. Add the plugin to your Jilebi runtime:
   ```bash
   jilebi plugins add arxiv
   ```

2. Configure the storage path (optional):
   ```bash
   export STORAGE_PATH="/path/to/papers"
   ```

3. Use the tools in your workflows:
   ```typescript
   // Search for papers
   const results = await searchPapers({
     query: 'au:"Hinton" AND "deep learning"',
     categories: ['cs.LG'],
     max_results: 15
   });

   // Download a paper
   await downloadPaper({ paper_id: '2301.12345' });

   // Read the paper
   const paper = await readPaper({ paper_id: '2301.12345' });
   ```

## ArXiv Categories

Common categories for filtering:
- `cs.AI`: Artificial Intelligence
- `cs.MA`: Multi-Agent Systems
- `cs.LG`: Machine Learning
- `cs.CL`: Computation and Language (NLP)
- `cs.CV`: Computer Vision
- `cs.RO`: Robotics
- `cs.HC`: Human-Computer Interaction
- `cs.CR`: Cryptography and Security

See [arXiv Category Taxonomy](https://arxiv.org/category_taxonomy) for the complete list.

## Implementation Notes

### PDF to Markdown Conversion

The current implementation includes a basic PDF to markdown conversion. For production use with full text extraction, consider:

1. Integrating a robust PDF parsing library (e.g., PDF.js, pdf-parse)
2. Using an external service for PDF text extraction
3. Implementing OCR for scanned documents

### Status Tracking

The plugin maintains conversion status in memory for:
- Tracking ongoing downloads and conversions
- Avoiding duplicate downloads
- Providing status updates

## Development

### Building

```bash
npm install
npm run build
```

### Project Structure

```
arxiv/
├── index.ts           # Main plugin implementation
├── manifest.toml      # Plugin manifest with tools, prompts, permissions
├── package.json       # Node.js dependencies
├── rollup.config.js   # Build configuration
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## License

ISC

## Contributing

For issues and contributions, visit: https://github.com/datron/jilebi-plugins
