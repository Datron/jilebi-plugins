// Jilebi Fetch Plugin - Deno Implementation with MCP Compatible Returns
// Converts the MCP fetch server to jilebi plugin format
// All functions take (request, env) parameters as required by jilebi
const DEFAULT_USER_AGENT = "jilebi-server";
/**
 * Validate URL format
 */
function is_valid_url(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:";
    }
    catch {
        return false;
    }
}
/**
 * Fetch a URL and return its content
 * Tool function for the fetch tool
 */
async function fetch_url(request, _env) {
    try {
        const { url, max_length = 5000, start_index = 0, raw = false } = request;
        // Validate URL
        if (!url) {
            return {
                content: [
                    {
                        type: "text",
                        text: "URL is required",
                    },
                ],
                isError: true,
            };
        }
        if (!is_valid_url(url)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Invalid URL: ${url}. URL must be a valid HTTP or HTTPS URL.`,
                    },
                ],
                isError: true,
            };
        }
        // Validate parameters
        if (max_length <= 0 || max_length > 1000000) {
            return {
                content: [
                    {
                        type: "text",
                        text: "max_length must be between 1 and 1000000",
                    },
                ],
                isError: true,
            };
        }
        if (start_index < 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "start_index must be non-negative",
                    },
                ],
                isError: true,
            };
        }
        // Fetch the URL
        let response;
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent": DEFAULT_USER_AGENT,
                },
                redirect: "follow",
            });
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
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
        // Determine if content is HTML
        const isPageHtml = pageRaw.slice(0, 100).toLowerCase().includes("<html") ||
            contentType.includes("text/html") ||
            !contentType;
        let content;
        let prefix = "";
        if (isPageHtml && !raw) {
            content = html2markdown(pageRaw);
            if (!content) {
                content = "<error>Page failed to be simplified from HTML</error>";
            }
        }
        else {
            content = pageRaw;
            if (!isPageHtml) {
                prefix = `Content type ${contentType} cannot be simplified to markdown, but here is the raw content:\n`;
            }
        }
        // Handle pagination
        const originalLength = content.length;
        if (start_index >= originalLength) {
            return {
                content: [
                    {
                        type: "text",
                        text: "<error>No more content available.</error>",
                    },
                ],
            };
        }
        let truncatedContent = content.slice(start_index, start_index + max_length);
        if (!truncatedContent) {
            return {
                content: [
                    {
                        type: "text",
                        text: "<error>No more content available.</error>",
                    },
                ],
            };
        }
        const actualContentLength = truncatedContent.length;
        const remainingContent = originalLength - (start_index + actualContentLength);
        // Add truncation notice if there's more content
        if (actualContentLength === max_length && remainingContent > 0) {
            const nextStart = start_index + actualContentLength;
            truncatedContent += `\n\n<error>Content truncated. Call the fetch tool with a start_index of ${nextStart} to get more content.</error>`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: `${prefix}Contents of ${url}:\n${truncatedContent}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
}

export { fetch_url };
//# sourceMappingURL=index.js.map
