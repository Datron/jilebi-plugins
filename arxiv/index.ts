/**
 * ArXiv Jilebi Plugin
 *
 * Provides tools for searching, downloading, and analyzing papers from arXiv.
 *
 */

import pdf2md from "@opendocsg/pdf2md";

// Type definitions
interface ToolResponse {
  content: Array<{ type: string; text: string }>;
}

interface SearchRequest {
  query: string;
  max_results?: number;
  date_from?: string;
  date_to?: string;
  categories?: string[];
  sort_by?: "relevance" | "date";
}

interface DownloadRequest {
  paper_id: string;
  check_status?: boolean;
}

interface ReadRequest {
  paper_id: string;
}

interface ConversionStatus {
  paper_id: string;
  status: "downloading" | "converting" | "success" | "error";
  started_at: string;
  completed_at?: string;
  error?: string;
}

// Global state for conversion tracking
const conversionStatuses: Map<string, ConversionStatus> = new Map();

// Valid arXiv category prefixes
const VALID_CATEGORIES = new Set([
  "cs",
  "econ",
  "eess",
  "math",
  "physics",
  "q-bio",
  "q-fin",
  "stat",
  "astro-ph",
  "cond-mat",
  "gr-qc",
  "hep-ex",
  "hep-lat",
  "hep-ph",
  "hep-th",
  "math-ph",
  "nlin",
  "nucl-ex",
  "nucl-th",
  "quant-ph",
]);

// Configuration
const MAX_RESULTS = 50;

/**
 * Get the storage path, expanding ~ if needed
 */
function get_storage_path(env: Environment): string {
  return env.STORAGE_PATH || "~/.arxiv-mcp-server/papers";
}

/**
 * Ensure storage directory exists
 */
async function ensure_storage_dir(storagePath: string): Promise<void> {
  try {
    await Deno.stat(storagePath);
  } catch (error) {
    await Deno.mkdir(storagePath, { recursive: true });
  }
}

/**
 * Get the file path for a paper
 */
function get_paper_path(
  paperId: string,
  storagePath: string,
  suffix: string = ".md",
): string {
  const separator = storagePath.includes("\\") ? "\\" : "/";
  return `${storagePath}${separator}${paperId}${suffix}`;
}

/**
 * Validate arXiv categories
 */
function validate_categories(categories: string[]): boolean {
  for (const category of categories) {
    const prefix = category.includes(".") ? category.split(".")[0] : category;
    if (!VALID_CATEGORIES.has(prefix)) {
      console.warn(`Unknown category prefix: ${prefix}`);
      return false;
    }
  }
  return true;
}

/**
 * Parse date string to Date object
 */
function parse_date(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Download a file from URL using fetch
 */
async function download_file(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Parse arXiv API XML response
 */
function parse_arxiv_xml(xml: string): any[] {
  const entries: any[] = [];

  // Simple XML parsing for arXiv feed
  const entryMatches = xml.match(/<entry>(.*?)<\/entry>/gs);

  if (!entryMatches) {
    return entries;
  }

  for (const entry of entryMatches) {
    const getTag = (tag: string) => {
      const match = entry.match(
        new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, "s"),
      );
      return match ? match[1].trim() : "";
    };

    const getAllTags = (tag: string) => {
      const matches = entry.match(
        new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, "gs"),
      );
      return matches
        ? matches.map((m) => {
            const match = m.match(
              new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, "s"),
            );
            return match ? match[1].trim() : "";
          })
        : [];
    };

    const id = getTag("id");
    const arxivId = id.split("/abs/").pop() || "";

    entries.push({
      id: arxivId.replace("v1", "").replace("v2", "").replace("v3", ""),
      title: getTag("title").replace(/\s+/g, " "),
      summary: getTag("summary").replace(/\s+/g, " "),
      authors: getAllTags("name"),
      published: getTag("published"),
      updated: getTag("updated"),
      categories: getAllTags("category").map((cat: string) => {
        const termMatch = cat.match(/term="([^"]+)"/);
        return termMatch ? termMatch[1] : cat;
      }),
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
    });
  }

  return entries;
}

/**
 * Query arXiv API
 */
async function query_arxiv(
  query: string,
  maxResults: number = 10,
  sortBy: string = "relevance",
): Promise<any[]> {
  const sortParam = sortBy === "date" ? "submittedDate" : "relevance";
  const encodedQuery = encodeURIComponent(query);
  const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&max_results=${maxResults}&sortBy=${sortParam}&sortOrder=descending`;

  const xml = await download_file(url);
  const decoder = new TextDecoder("utf-8");
  const xmlString = decoder.decode(xml);

  return parse_arxiv_xml(xmlString);
}

/**
 * Convert PDF to Markdown using pdf2md library
 */
async function convert_pdf_to_markdown(
  pdfPath: string,
  paperId: string,
  storagePath: string,
): Promise<void> {
  try {
    console.log(`Starting PDF to Markdown conversion for ${paperId}`);

    // Read the PDF file
    const pdfBuffer = await Deno.readFile(pdfPath);
    console.log(`PDF file read successfully, size: ${pdfBuffer.length} bytes`);

    // Convert PDF to Markdown using pdf2md
    // pdf2md accepts Uint8Array (TypedArray) which is what Deno.readFile returns
    const markdown = await pdf2md(pdfBuffer, {
      pageParsed: (pages) => {
        console.log(`Parsed ${pages.length} page(s) so far for ${paperId}`);
      },
    });

    console.log(
      `PDF conversion complete, markdown length: ${markdown.length} characters`,
    );

    // Write the markdown file
    const mdPath = get_paper_path(paperId, storagePath, ".md");
    const encoder = new TextEncoder();
    await Deno.writeFile(mdPath, encoder.encode(markdown));

    // Update status
    const status = conversionStatuses.get(paperId);
    if (status) {
      status.status = "success";
      status.completed_at = new Date().toISOString();
    }
    console.log(`Conversion completed for ${paperId}`);
  } catch (error) {
    console.error(`Conversion failed for ${paperId}:`, error);
    const status = conversionStatuses.get(paperId);
    if (status) {
      status.status = "error";
      status.completed_at = new Date().toISOString();
      status.error = String(error);
    }
    throw error;
  }
}

/**
 * Search Papers Tool
 */
export async function search_papers(
  request: SearchRequest,
  env: Environment,
): Promise<ToolResponse> {
  console.log("Searching papers tool called");
  try {
    const maxResults = Math.min(request.max_results || 10, MAX_RESULTS);
    let query = request.query;

    console.log(
      `Starting search with query: '${query}', max_results: ${maxResults}`,
    );

    // Build query components
    const queryParts: string[] = [];

    // Add base query
    if (query.trim()) {
      queryParts.push(`(${query})`);
    }

    // Add category filtering
    if (request.categories && request.categories.length > 0) {
      if (!validate_categories(request.categories)) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Invalid category provided. Please check arXiv category names.",
            },
          ],
        };
      }
      const categoryFilter = request.categories
        .map((cat) => `cat:${cat}`)
        .join(" OR ");
      queryParts.push(`(${categoryFilter})`);
      console.log(`Added category filter: ${categoryFilter}`);
    }

    if (queryParts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No search criteria provided",
          },
        ],
      };
    }

    // Combine query parts
    const finalQuery = queryParts.join(" AND ");
    console.log(`Final arXiv query: ${finalQuery}`);

    // Query arXiv
    const sortBy = request.sort_by || "relevance";
    const apiMaxResults = Math.min(maxResults + 5, MAX_RESULTS);
    let results = await query_arxiv(finalQuery, apiMaxResults, sortBy);

    // Client-side date filtering
    if (request.date_from || request.date_to) {
      const dateFrom = request.date_from ? parse_date(request.date_from) : null;
      const dateTo = request.date_to ? parse_date(request.date_to) : null;

      if ((request.date_from && !dateFrom) || (request.date_to && !dateTo)) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Invalid date format. Use YYYY-MM-DD format.",
            },
          ],
        };
      }

      results = results.filter((paper) => {
        const paperDate = new Date(paper.published);
        if (dateFrom && paperDate < dateFrom) return false;
        if (dateTo && paperDate > dateTo) return false;
        return true;
      });
    }

    // Limit to requested max results
    results = results.slice(0, maxResults);

    // Format results
    const papers = results.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.summary,
      categories: paper.categories,
      published: paper.published,
      url: paper.pdf_url,
      resource_uri: `arxiv://${paper.id}`,
    }));

    console.log(`Search completed: ${papers.length} results returned`);

    const responseData = {
      total_results: papers.length,
      papers: papers,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Search error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${String(error)}`,
        },
      ],
    };
  }
}

/**
 * Download Paper Tool
 */
export async function download_paper(
  request: DownloadRequest,
  env: Environment,
): Promise<ToolResponse> {
  try {
    const paperId = request.paper_id;
    const checkStatus = request.check_status || false;
    const storagePath = get_storage_path(env);

    await ensure_storage_dir(storagePath);

    // If only checking status
    if (checkStatus) {
      const status = conversionStatuses.get(paperId);
      const mdPath = get_paper_path(paperId, storagePath, ".md");

      if (!status) {
        try {
          await Deno.stat(mdPath);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: "Paper is ready",
                  resource_uri: `file://${mdPath}`,
                }),
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "unknown",
                  message: "No download or conversion in progress",
                }),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: status.status,
              started_at: status.started_at,
              completed_at: status.completed_at,
              error: status.error,
              message: `Paper conversion ${status.status}`,
            }),
          },
        ],
      };
    }

    // Check if paper is already converted
    const mdPath = get_paper_path(paperId, storagePath, ".md");
    try {
      await Deno.stat(mdPath);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Paper already available",
              resource_uri: `file://${mdPath}`,
            }),
          },
        ],
      };
    } catch {
      // Paper doesn't exist, continue with download
    }

    // Check if already in progress
    if (conversionStatuses.has(paperId)) {
      const status = conversionStatuses.get(paperId)!;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: status.status,
              message: `Paper conversion ${status.status}`,
              started_at: status.started_at,
            }),
          },
        ],
      };
    }

    // Start new download and conversion
    const pdfPath = get_paper_path(paperId, storagePath, ".pdf");

    // Initialize status
    conversionStatuses.set(paperId, {
      paper_id: paperId,
      status: "downloading",
      started_at: new Date().toISOString(),
    });

    // Download PDF
    console.log(`Downloading paper ${paperId}`);
    const pdfUrl = `https://arxiv.org/pdf/${paperId}.pdf`;
    const pdfBuffer = await download_file(pdfUrl);
    await Deno.writeFile(pdfPath, pdfBuffer);

    // Update status and start conversion
    const status = conversionStatuses.get(paperId)!;
    status.status = "converting";

    await convert_pdf_to_markdown(pdfPath, paperId, storagePath);
    
    console.log("Conversion status of paper: ", status);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "converting",
            message: "Paper downloaded, conversion started",
            started_at: status.started_at,
          }),
        },
      ],
    };
  } catch (error) {
    console.error("Download error:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Error: ${String(error)}`,
          }),
        },
      ],
    };
  }
}

/**
 * List Papers Tool
 */
export async function list_papers(
  request: any,
  env: Environment,
): Promise<ToolResponse> {
  try {
    const storagePath = get_storage_path(env);

    await ensure_storage_dir(storagePath);

    // List all .md files
    const files: string[] = [];
    for await (const entry of Deno.readDir(storagePath)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        files.push(entry.name);
      }
    }
    const paperIds = files.map((f) => f.replace(".md", ""));

    if (paperIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_papers: 0,
                papers: [],
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Fetch metadata for each paper from arXiv
    const papers: any[] = [];

    // Query in batches to get metadata
    for (const paperId of paperIds) {
      try {
        const results = await query_arxiv(`id:${paperId}`, 1);
        if (results.length > 0) {
          const result = results[0];
          papers.push({
            title: result.title,
            summary: result.summary,
            authors: result.authors,
            links: [result.pdf_url],
            pdf_url: result.pdf_url,
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${paperId}:`, error);
      }
    }

    const responseData = {
      total_papers: papers.length,
      papers: papers,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("List papers error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${String(error)}`,
        },
      ],
    };
  }
}

/**
 * Read Paper Tool
 */
export async function read_paper(
  request: ReadRequest,
  env: Environment,
): Promise<ToolResponse> {
  try {
    const paperId = request.paper_id;
    const storagePath = get_storage_path(env);

    await ensure_storage_dir(storagePath);

    // List available papers
    const files: string[] = [];
    for await (const entry of Deno.readDir(storagePath)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        files.push(entry.name);
      }
    }
    const paperIds = files.map((f) => f.replace(".md", ""));

    // Check if paper exists
    if (!paperIds.includes(paperId)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: `Paper ${paperId} not found in storage. You may need to download it first using download_paper.`,
            }),
          },
        ],
      };
    }

    // Read paper content
    const mdPath = get_paper_path(paperId, storagePath, ".md");
    const contentBytes = await Deno.readFile(mdPath);
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(contentBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            paper_id: paperId,
            content: content,
          }),
        },
      ],
    };
  } catch (error) {
    console.error("Read paper error:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Error reading paper: ${String(error)}`,
          }),
        },
      ],
    };
  }
}
