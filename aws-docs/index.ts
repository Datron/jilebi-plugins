// AWS Documentation Plugin for Jilebi
// Provides access to AWS documentation, search, and recommendations
// One-to-one port from awslabs/aws_documentation_mcp_server Python implementation

interface MCPTextContent {
  type: "text";
  text: string;
}

interface MCPResult {
  content: MCPTextContent[];
  isError?: boolean;
}

interface Environment {
  AWS_DOCUMENTATION_PARTITION?: string;
  MCP_USER_AGENT?: string;
}

// Models matching Python implementation
interface SearchResult {
  rank_order: number;
  url: string;
  title: string;
  context: string | null;
}

interface SearchResponse {
  search_results: SearchResult[];
  facets: {
    product_types?: string[];
    guide_types?: string[];
  } | null;
  query_id: string;
}

interface RecommendationResult {
  url: string;
  title: string;
  context: string | null;
}

// API URLs
const SEARCH_API_URL = "https://proxy.search.docs.aws.amazon.com/search";
const RECOMMENDATIONS_API_URL =
  "https://contentrecs-api.docs.aws.amazon.com/v1/recommendations";

// User agent matching Python implementation
const BASE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const DEFAULT_USER_AGENT = `${BASE_USER_AGENT} ModelContextProtocol/1.0.0 (AWS Documentation Server)`;

// Session UUID for tracking requests
const SESSION_UUID = crypto.randomUUID();

// Search term domain modifiers matching Python implementation
const SEARCH_TERM_DOMAIN_MODIFIERS = [
  {
    terms: ["neuron", "neuron sdk"],
    domains: [
      { key: "domain", value: "awsdocs-neuron.readthedocs-hosted.com" },
    ],
    regex: /^https?:\/\/awsdocs-neuron\.readthedocs-hosted\.com\//,
  },
];

// Supported domain patterns for documentation
const SUPPORTED_DOMAIN_REGEXES = [
  /^https?:\/\/docs\.aws\.amazon\.com\//,
  ...SEARCH_TERM_DOMAIN_MODIFIERS.map((m) => m.regex),
];

// Search result cache (matching Python's deque with maxlen=3)
interface CachedSearchResponse {
  search_results: SearchResult[];
  query_id: string;
}
const SEARCH_RESULT_CACHE: CachedSearchResponse[] = [];
const CACHE_MAX_SIZE = 3;

/**
 * Add search result to cache (most recent first)
 */
function addSearchResultCacheItem(searchResponse: CachedSearchResponse): void {
  SEARCH_RESULT_CACHE.unshift(searchResponse);
  if (SEARCH_RESULT_CACHE.length > CACHE_MAX_SIZE) {
    SEARCH_RESULT_CACHE.pop();
  }
}

/**
 * Get query_id from cache for a URL if it exists
 */
function getQueryIdFromCache(url: string): string | null {
  for (const searchResponse of SEARCH_RESULT_CACHE) {
    for (const result of searchResponse.search_results) {
      if (result.url === url) {
        return encodeURIComponent(searchResponse.query_id);
      }
    }
  }
  return null;
}

/**
 * Validate that a URL is from a supported AWS documentation domain
 */
function isValidDocumentationUrl(url: string): boolean {
  return SUPPORTED_DOMAIN_REGEXES.some((pattern) => pattern.test(url));
}

/**
 * Check if content is HTML
 */
function isHtmlContent(pageRaw: string, contentType: string): boolean {
  return (
    pageRaw.slice(0, 100).includes("<html") ||
    contentType.includes("text/html") ||
    !contentType
  );
}

/**
 * Format documentation result with pagination information
 * Matches Python's format_documentation_result function
 */
function formatDocumentationResult(
  url: string,
  content: string,
  startIndex: number,
  maxLength: number,
): string {
  const originalLength = content.length;

  if (startIndex >= originalLength) {
    return `AWS Documentation from ${url}:\n\n<e>No more content available.</e>`;
  }

  const endIndex = Math.min(startIndex + maxLength, originalLength);
  const truncatedContent = content.slice(startIndex, endIndex);

  if (!truncatedContent) {
    return `AWS Documentation from ${url}:\n\n<e>No more content available.</e>`;
  }

  const actualContentLength = truncatedContent.length;
  const remainingContent = originalLength - (startIndex + actualContentLength);

  let result = `AWS Documentation from ${url}:\n\n${truncatedContent}`;

  if (remainingContent > 0) {
    const nextStart = startIndex + actualContentLength;
    result += `\n\n<e>Content truncated. Call the read_documentation tool with start_index=${nextStart} to get more content.</e>`;
  }

  return result;
}

/**
 * Parse recommendation API response into RecommendationResult objects
 * Matches Python's parse_recommendation_results function
 */
function parseRecommendationResults(
  data: Record<string, unknown>,
): RecommendationResult[] {
  const results: RecommendationResult[] = [];

  // Process highly rated recommendations
  const highlyRated = data.highlyRated as
    | {
        items?: Array<{ url?: string; assetTitle?: string; abstract?: string }>;
      }
    | undefined;
  if (highlyRated?.items) {
    for (const item of highlyRated.items) {
      results.push({
        url: item.url || "",
        title: item.assetTitle || "",
        context: item.abstract || null,
      });
    }
  }

  // Process journey recommendations (organized by intent)
  const journey = data.journey as
    | {
        items?: Array<{
          intent?: string;
          urls?: Array<{ url?: string; assetTitle?: string }>;
        }>;
      }
    | undefined;
  if (journey?.items) {
    for (const intentGroup of journey.items) {
      const intent = intentGroup.intent || "";
      if (intentGroup.urls) {
        for (const urlItem of intentGroup.urls) {
          results.push({
            url: urlItem.url || "",
            title: urlItem.assetTitle || "",
            context: intent ? `Intent: ${intent}` : null,
          });
        }
      }
    }
  }

  // Process new content recommendations
  const newContent = data.new as
    | {
        items?: Array<{
          url?: string;
          assetTitle?: string;
          dateCreated?: string;
        }>;
      }
    | undefined;
  if (newContent?.items) {
    for (const item of newContent.items) {
      const dateCreated = item.dateCreated || "";
      results.push({
        url: item.url || "",
        title: item.assetTitle || "",
        context: dateCreated
          ? `New content added on ${dateCreated}`
          : "New content",
      });
    }
  }

  // Process similar recommendations
  const similar = data.similar as
    | {
        items?: Array<{ url?: string; assetTitle?: string; abstract?: string }>;
      }
    | undefined;
  if (similar?.items) {
    for (const item of similar.items) {
      results.push({
        url: item.url || "",
        title: item.assetTitle || "",
        context: item.abstract || "Similar content",
      });
    }
  }

  return results;
}

/**
 * Add search_intent query parameter to search URL
 * Matches Python's add_search_intent_to_search_request function
 */
function addSearchIntentToSearchRequest(
  searchUrl: string,
  searchIntent: string,
): string {
  if (searchIntent && searchIntent.trim()) {
    // Remove all whitespaces, including tabs and returns
    const cleanedIntent = searchIntent.split(/\s+/).join(" ").trim();
    if (cleanedIntent) {
      const encodedIntent = encodeURIComponent(cleanedIntent);
      return `${searchUrl}&search_intent=${encodedIntent}`;
    }
  }
  return searchUrl;
}

/**
 * Fetch and convert an AWS documentation page to markdown format.
 *
 * ## Usage
 * This tool retrieves the content of an AWS documentation page and converts it to markdown format.
 * For long documents, you can make multiple calls with different start_index values to retrieve
 * the entire content in chunks.
 *
 * ## URL Requirements
 * - Must be from the docs.aws.amazon.com domain or other supported domains
 * - Must end with .html
 *
 * ## Handling Long Documents
 * If the response indicates the document was truncated, you have several options:
 * 1. Continue Reading: Make another call with start_index set to the end of the previous response
 * 2. Stop Early: For very long documents (>30,000 characters), if you've already found the specific information needed, you can stop reading
 */
export async function read_documentation(
  request: { url: string; max_length?: number; start_index?: number },
  env: Environment,
): Promise<MCPResult> {
  try {
    const { url, max_length = 5000, start_index = 0 } = request;

    // Validate URL
    if (!url) {
      return {
        content: [{ type: "text", text: "URL is required" }],
        isError: true,
      };
    }

    if (!isValidDocumentationUrl(url)) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid URL: ${url}. URL must be from list of supported domains`,
          },
        ],
        isError: true,
      };
    }

    if (!url.endsWith(".html")) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid URL: ${url}. URL must end with .html`,
          },
        ],
        isError: true,
      };
    }

    // Validate parameters
    if (max_length <= 0 || max_length >= 1000000) {
      return {
        content: [
          { type: "text", text: "max_length must be between 1 and 1000000" },
        ],
        isError: true,
      };
    }

    if (start_index < 0) {
      return {
        content: [{ type: "text", text: "start_index must be non-negative" }],
        isError: true,
      };
    }

    // Build URL with session and optional query_id from cache
    let urlWithSession = `${url}?session=${SESSION_UUID}`;
    const queryId = getQueryIdFromCache(url);
    if (queryId) {
      urlWithSession += `&query_id=${queryId}`;
    }

    // Fetch the documentation page
    const response = await fetch(urlWithSession, {
      headers: {
        "User-Agent": env.MCP_USER_AGENT || DEFAULT_USER_AGENT,
        "X-MCP-Session-Id": SESSION_UUID,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch ${url} - status code ${response.status}`,
          },
        ],
        isError: true,
      };
    }

    const pageRaw = await response.text();
    const contentType = response.headers.get("content-type") || "";

    // Convert to markdown if HTML
    let content: string;
    if (isHtmlContent(pageRaw, contentType)) {
      content = html2markdown(pageRaw);
    } else {
      content = pageRaw;
    }

    const result = formatDocumentationResult(
      url,
      content,
      start_index,
      max_length,
    );

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Search AWS documentation using the official AWS Documentation Search API.
 *
 * ## Usage
 * This tool searches across all AWS documentation for pages matching your search phrase.
 * Use it to find relevant documentation when you don't have a specific URL.
 *
 * ## Search Tips
 * - Use specific technical terms rather than general phrases
 * - Include service names to narrow results (e.g., "S3 bucket versioning" instead of just "versioning")
 * - Use quotes for exact phrase matching (e.g., "AWS Lambda function URLs")
 * - Use guide_types and product_types filters found from a SearchResponse's "facets" property
 *
 * ## Result Interpretation
 * Each SearchResponse includes:
 * - search_results: List of documentation pages with rank_order, url, title, context
 * - facets: Available filters (product_types, guide_types) for refining searches
 * - query_id: Unique identifier for this search session
 */
export async function search_documentation(
  request: {
    search_phrase: string;
    search_intent?: string;
    limit?: number;
    product_types?: string[];
    guide_types?: string[];
  },
  env: Environment,
): Promise<MCPResult> {
  try {
    const {
      search_phrase,
      search_intent = "",
      limit = 10,
      product_types,
      guide_types,
    } = request;

    if (!search_phrase || !search_phrase.trim()) {
      return {
        content: [{ type: "text", text: "search_phrase is required" }],
        isError: true,
      };
    }

    const validLimit = Math.min(Math.max(1, limit), 50);

    // Build search request body matching Python implementation
    const requestBody: {
      textQuery: { input: string };
      contextAttributes: { key: string; value: string }[];
      acceptSuggestionBody: string;
      locales: string[];
    } = {
      textQuery: {
        input: search_phrase.trim(),
      },
      contextAttributes: [{ key: "domain", value: "docs.aws.amazon.com" }],
      acceptSuggestionBody: "RawText",
      locales: ["en_us"],
    };

    // Add domain modifiers based on search terms
    for (const modifier of SEARCH_TERM_DOMAIN_MODIFIERS) {
      if (
        modifier.terms.some((term) =>
          search_phrase.toLowerCase().includes(term),
        )
      ) {
        requestBody.contextAttributes.push(...modifier.domains);
      }
    }

    // Add product and guide filters if provided
    if (product_types) {
      for (const product of product_types) {
        requestBody.contextAttributes.push({
          key: "aws-docs-search-product",
          value: product,
        });
      }
    }
    if (guide_types) {
      for (const guide of guide_types) {
        requestBody.contextAttributes.push({
          key: "aws-docs-search-guide",
          value: guide,
        });
      }
    }

    // Build search URL with session
    let searchUrl = `${SEARCH_API_URL}?session=${SESSION_UUID}`;
    searchUrl = addSearchIntentToSearchRequest(searchUrl, search_intent);

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": env.MCP_USER_AGENT || DEFAULT_USER_AGENT,
        "X-MCP-Session-Id": SESSION_UUID,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorMsg = `Error searching AWS docs - status code ${response.status}`;
      return {
        content: [{ type: "text", text: errorMsg }],
        isError: true,
      };
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch (e) {
      const errorMsg = `Error parsing search results: ${e instanceof Error ? e.message : String(e)}`;
      return {
        content: [{ type: "text", text: errorMsg }],
        isError: true,
      };
    }

    const queryId = (data.queryId as string) || "";
    const rawFacets = data.facets as Record<string, string[]> | undefined;

    // Parse facets to rename keys
    const facets: { product_types?: string[]; guide_types?: string[] } = {};
    if (rawFacets) {
      if (rawFacets["aws-docs-search-product"]) {
        facets.product_types = rawFacets["aws-docs-search-product"];
      }
      if (rawFacets["aws-docs-search-guide"]) {
        facets.guide_types = rawFacets["aws-docs-search-guide"];
      }
    }

    // Parse search results from suggestions
    const results: SearchResult[] = [];
    const suggestions = data.suggestions as
      | Array<{
          textExcerptSuggestion?: {
            link?: string;
            title?: string;
            summary?: string;
            suggestionBody?: string;
            metadata?: {
              seo_abstract?: string;
              abstract?: string;
            };
          };
        }>
      | undefined;

    if (suggestions) {
      for (let i = 0; i < Math.min(suggestions.length, validLimit); i++) {
        const suggestion = suggestions[i];
        if (suggestion.textExcerptSuggestion) {
          const textSuggestion = suggestion.textExcerptSuggestion;
          let context: string | null = null;

          // Use SEO abstract if available, as it is designed for this task explicitly
          // If not available, try Intelligent Summary Abstract, then authored summary, then content body
          const metadata = textSuggestion.metadata || {};
          if (metadata.seo_abstract) {
            context = metadata.seo_abstract;
          } else if (metadata.abstract) {
            context = metadata.abstract;
          } else if (textSuggestion.summary) {
            context = textSuggestion.summary;
          } else if (textSuggestion.suggestionBody) {
            context = textSuggestion.suggestionBody;
          }

          results.push({
            rank_order: i + 1,
            url: textSuggestion.link || "",
            title: textSuggestion.title || "",
            context: context,
          });
        }
      }
    }

    // Add to cache
    const searchResponse: SearchResponse = {
      search_results: results,
      facets: Object.keys(facets).length > 0 ? facets : null,
      query_id: queryId,
    };
    addSearchResultCacheItem(searchResponse);

    // Format results as markdown
    let markdown = `# Search Results for: "${search_phrase}"\n\n`;
    markdown += `Query ID: ${queryId}\n\n`;

    if (results.length === 0) {
      markdown += "No results found.\n";
    } else {
      markdown += `Found ${results.length} result(s)\n\n`;

      for (const result of results) {
        markdown += `## ${result.rank_order}. ${result.title}\n`;
        markdown += `**URL:** ${result.url}\n\n`;
        if (result.context) {
          markdown += `${result.context}\n\n`;
        }
        markdown += "---\n\n";
      }
    }

    // Add facets information if available
    if (searchResponse.facets) {
      markdown += "## Available Filters\n\n";
      if (searchResponse.facets.product_types) {
        markdown += `**Product Types:** ${searchResponse.facets.product_types.join(", ")}\n\n`;
      }
      if (searchResponse.facets.guide_types) {
        markdown += `**Guide Types:** ${searchResponse.facets.guide_types.join(", ")}\n\n`;
      }
    }

    return {
      content: [{ type: "text", text: markdown }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get content recommendations for an AWS documentation page.
 *
 * ## Usage
 * This tool provides recommendations for related AWS documentation pages based on a given URL.
 * Use it to discover additional relevant content that might not appear in search results.
 *
 * ## Recommendation Types
 * The recommendations include four categories:
 * 1. Highly Rated: Popular pages within the same AWS service
 * 2. New: Recently added pages within the same AWS service - useful for finding newly released features
 * 3. Similar: Pages covering similar topics to the current page
 * 4. Journey: Pages commonly viewed next by other users
 *
 * ## When to Use
 * - After reading a documentation page to find related content
 * - When exploring a new AWS service to discover important pages
 * - To find alternative explanations of complex concepts
 * - To discover the most popular pages for a service
 * - To find newly released information by using a service's welcome page URL
 */
export async function recommend(
  request: { url: string },
  env: Environment,
): Promise<MCPResult> {
  try {
    const { url } = request;

    if (!url) {
      return {
        content: [{ type: "text", text: "URL is required" }],
        isError: true,
      };
    }

    // Build recommendations URL with path parameter (matching Python implementation)
    const recommendationUrl = `${RECOMMENDATIONS_API_URL}?path=${url}&session=${SESSION_UUID}`;

    const response = await fetch(recommendationUrl, {
      headers: {
        "User-Agent": env.MCP_USER_AGENT || DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting recommendations - status code ${response.status}`,
          },
        ],
        isError: true,
      };
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch (e) {
      const errorMsg = `Error parsing recommendations: ${e instanceof Error ? e.message : String(e)}`;
      return {
        content: [{ type: "text", text: errorMsg }],
        isError: true,
      };
    }

    const results = parseRecommendationResults(data);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No recommendations found for: ${url}`,
          },
        ],
      };
    }

    // Group results by context type for better organization
    const highlyRated: RecommendationResult[] = [];
    const journey: RecommendationResult[] = [];
    const newContent: RecommendationResult[] = [];
    const similar: RecommendationResult[] = [];

    for (const result of results) {
      if (result.context?.startsWith("Intent:")) {
        journey.push(result);
      } else if (result.context?.startsWith("New content")) {
        newContent.push(result);
      } else if (result.context === "Similar content") {
        similar.push(result);
      } else {
        highlyRated.push(result);
      }
    }

    // Format as markdown
    let markdown = `# Recommendations for: ${url}\n\n`;
    markdown += `Found ${results.length} recommendation(s)\n\n`;

    if (highlyRated.length > 0) {
      markdown += "## Highly Rated\n\n";
      for (const item of highlyRated) {
        markdown += `- [${item.title}](${item.url})`;
        if (item.context) {
          markdown += ` - ${item.context}`;
        }
        markdown += "\n";
      }
      markdown += "\n";
    }

    if (journey.length > 0) {
      markdown += "## Journey (Next Steps)\n\n";
      for (const item of journey) {
        markdown += `- [${item.title}](${item.url})`;
        if (item.context) {
          markdown += ` - ${item.context}`;
        }
        markdown += "\n";
      }
      markdown += "\n";
    }

    if (newContent.length > 0) {
      markdown += "## New Content\n\n";
      for (const item of newContent) {
        markdown += `- [${item.title}](${item.url})`;
        if (item.context) {
          markdown += ` - ${item.context}`;
        }
        markdown += "\n";
      }
      markdown += "\n";
    }

    if (similar.length > 0) {
      markdown += "## Similar\n\n";
      for (const item of similar) {
        markdown += `- [${item.title}](${item.url})`;
        if (item.context) {
          markdown += ` - ${item.context}`;
        }
        markdown += "\n";
      }
      markdown += "\n";
    }

    return {
      content: [{ type: "text", text: markdown }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get recommendations: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Export alias for backwards compatibility
export { recommend as get_recommendations };
