// Helper to build basic auth header
function getAuthHeader(env) {
    const credentials = btoa(`${env.CONFLUENCE_EMAIL}:${env.CONFLUENCE_API_TOKEN}`);
    return `Basic ${credentials}`;
}
// Helper to get the wiki API base URL
function getApiBaseUrl(env) {
    const baseUrl = env.CONFLUENCE_BASE_URL.replace(/\/+$/, "");
    return `${baseUrl}/wiki/rest/api`;
}
// Helper function to make Confluence API requests
async function makeConfluenceRequest(env, endpoint, options = {}) {
    if (!env.CONFLUENCE_API_TOKEN || !env.CONFLUENCE_EMAIL) {
        throw new Error("CONFLUENCE_API_TOKEN and CONFLUENCE_EMAIL are required");
    }
    if (!env.CONFLUENCE_BASE_URL) {
        throw new Error("CONFLUENCE_BASE_URL is required");
    }
    const apiBase = getApiBaseUrl(env);
    const url = `${apiBase}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: getAuthHeader(env),
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "jilebi-confluence-plugin",
            ...options.headers,
        },
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Confluence API error: ${response.status} ${response.statusText} - ${error}`);
    }
    // DELETE responses may have no body
    if (response.status === 204) {
        return null;
    }
    return response.json();
}
// Helper to convert storage format HTML to a cleaner text representation
function convertStorageToText(storageHtml) {
    if (!storageHtml)
        return "";
    // Use html2markdown if available (jilebi runtime global)
    if (typeof html2markdown === "function") {
        return html2markdown(storageHtml);
    }
    // Fallback: basic HTML tag stripping
    return storageHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
// Format a page result for output
function formatPage(page, convertToMarkdown = true, baseUrl = "") {
    const result = {
        id: page.id,
        title: page.title,
        type: page.type,
        status: page.status,
    };
    if (page.space) {
        result.space = {
            key: page.space.key,
            name: page.space.name,
        };
    }
    if (page.version) {
        result.version = {
            number: page.version.number,
            when: page.version.when,
            by: page.version.by?.displayName,
            message: page.version.message,
        };
    }
    if (page.body?.storage?.value) {
        if (convertToMarkdown) {
            result.content = convertStorageToText(page.body.storage.value);
        }
        else {
            result.content = page.body.storage.value;
        }
    }
    if (page.ancestors && page.ancestors.length > 0) {
        result.ancestors = page.ancestors.map((a) => ({
            id: a.id,
            title: a.title,
        }));
    }
    if (page.metadata?.labels?.results) {
        result.labels = page.metadata.labels.results.map((l) => ({
            name: l.name,
            prefix: l.prefix,
        }));
    }
    if (page._links?.webui && baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
        result.url = `${cleanBaseUrl}/wiki${page._links.webui}`;
    }
    return result;
}
// ============================================================
// Tool: search
// ============================================================
const search = async (params, env) => {
    let cql = params.query;
    // If it doesn't look like CQL, wrap it as a text search
    if (cql &&
        !["=", "~", ">", "<", " AND ", " OR ", "currentUser()"].some((x) => cql.includes(x))) {
        cql = `siteSearch ~ "${cql}"`;
    }
    // Apply space filter if provided
    if (params.spaces_filter) {
        const spaceKeys = params.spaces_filter
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (spaceKeys.length > 0) {
            const spaceClause = spaceKeys
                .map((k) => `space="${k}"`)
                .join(" OR ");
            cql = `(${cql}) AND (${spaceClause})`;
        }
    }
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const searchParams = new URLSearchParams({
        cql,
        limit: limit.toString(),
        expand: "version,space",
    });
    try {
        const result = await makeConfluenceRequest(env, `/content/search?${searchParams}`);
        const pages = result.results.map((page) => formatPage(page, true, env.CONFLUENCE_BASE_URL));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(pages, null, 2),
                },
            ],
        };
    }
    catch (error) {
        // If siteSearch fails, try fallback to text search
        if (params.query &&
            !["=", "~", ">", "<", " AND ", " OR ", "currentUser()"].some((x) => params.query.includes(x))) {
            let fallbackCql = `text ~ "${params.query}"`;
            if (params.spaces_filter) {
                const spaceKeys = params.spaces_filter
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (spaceKeys.length > 0) {
                    const spaceClause = spaceKeys
                        .map((k) => `space="${k}"`)
                        .join(" OR ");
                    fallbackCql = `(${fallbackCql}) AND (${spaceClause})`;
                }
            }
            const fallbackParams = new URLSearchParams({
                cql: fallbackCql,
                limit: limit.toString(),
                expand: "version,space",
            });
            const fallbackResult = await makeConfluenceRequest(env, `/content/search?${fallbackParams}`);
            const pages = fallbackResult.results.map((page) => formatPage(page, true, env.CONFLUENCE_BASE_URL));
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(pages, null, 2),
                    },
                ],
            };
        }
        throw error;
    }
};
// ============================================================
// Tool: get_page
// ============================================================
const get_page = async (params, env) => {
    const includeMetadata = params.include_metadata !== false;
    const convertToMarkdown = params.convert_to_markdown !== false;
    let page;
    if (params.page_id) {
        const expand = "body.storage,version,space,ancestors,metadata.labels";
        page = await makeConfluenceRequest(env, `/content/${params.page_id}?expand=${encodeURIComponent(expand)}`);
    }
    else if (params.title && params.space_key) {
        const searchParams = new URLSearchParams({
            title: params.title,
            spaceKey: params.space_key,
            expand: "body.storage,version,space,ancestors,metadata.labels",
        });
        const result = await makeConfluenceRequest(env, `/content?${searchParams}`);
        if (!result.results || result.results.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Page with title '${params.title}' not found in space '${params.space_key}'.`,
                        }, null, 2),
                    },
                ],
            };
        }
        page = result.results[0];
    }
    else {
        throw new Error("Either 'page_id' OR both 'title' and 'space_key' must be provided.");
    }
    let result;
    if (includeMetadata) {
        result = { metadata: formatPage(page, convertToMarkdown, env.CONFLUENCE_BASE_URL) };
    }
    else {
        const content = page.body?.storage?.value || "";
        result = {
            content: {
                value: convertToMarkdown
                    ? convertStorageToText(content)
                    : content,
            },
        };
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_page_children
// ============================================================
const get_page_children = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 50);
    const start = Math.max(params.start ?? 0, 0);
    const includeContent = params.include_content === true;
    const convertToMarkdown = params.convert_to_markdown !== false;
    let expand = params.expand || "version";
    if (includeContent && !expand.includes("body")) {
        expand = expand ? `${expand},body.storage` : "body.storage";
    }
    const searchParams = new URLSearchParams({
        expand,
        limit: limit.toString(),
        start: start.toString(),
    });
    try {
        const result = await makeConfluenceRequest(env, `/content/${params.parent_id}/child/page?${searchParams}`);
        const childPages = result.results.map((page) => formatPage(page, convertToMarkdown, env.CONFLUENCE_BASE_URL));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        parent_id: params.parent_id,
                        count: childPages.length,
                        limit_requested: limit,
                        start_requested: start,
                        results: childPages,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: `Failed to get child pages: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: get_comments
// ============================================================
const get_comments = async (params, env) => {
    const expand = "body.storage,version";
    const result = await makeConfluenceRequest(env, `/content/${params.page_id}/child/comment?expand=${encodeURIComponent(expand)}&depth=all`);
    const comments = result.results.map((comment) => {
        const formatted = {
            id: comment.id,
            title: comment.title,
        };
        if (comment.body?.storage?.value) {
            formatted.content = convertStorageToText(comment.body.storage.value);
        }
        if (comment.version) {
            formatted.version = {
                number: comment.version.number,
                when: comment.version.when,
                by: comment.version.by?.displayName,
            };
        }
        return formatted;
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(comments, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_labels
// ============================================================
const get_labels = async (params, env) => {
    const result = await makeConfluenceRequest(env, `/content/${params.page_id}/label`);
    const labels = result.results.map((label) => ({
        id: label.id,
        name: label.name,
        prefix: label.prefix,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(labels, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: add_label
// ============================================================
const add_label = async (params, env) => {
    const result = await makeConfluenceRequest(env, `/content/${params.page_id}/label`, {
        method: "POST",
        body: JSON.stringify([
            {
                prefix: "global",
                name: params.name,
            },
        ]),
    });
    const labels = result.results.map((label) => ({
        id: label.id,
        name: label.name,
        prefix: label.prefix,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(labels, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: create_page
// ============================================================
const create_page = async (params, env) => {
    const contentFormat = params.content_format || "storage";
    // Determine representation
    let representation;
    let body;
    if (contentFormat === "wiki") {
        representation = "wiki";
        body = params.content;
    }
    else if (contentFormat === "storage") {
        representation = "storage";
        body = params.content;
    }
    else {
        // For "markdown" or anything else, convert markdown to simple HTML storage
        representation = "storage";
        body = markdownToSimpleStorage(params.content);
    }
    const payload = {
        type: "page",
        title: params.title,
        space: {
            key: params.space_key,
        },
        body: {
            storage: {
                value: body,
                representation,
            },
        },
    };
    if (params.parent_id) {
        payload.ancestors = [{ id: params.parent_id }];
    }
    const page = await makeConfluenceRequest(env, "/content", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Page created successfully",
                    page: formatPage(page, true, env.CONFLUENCE_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: update_page
// ============================================================
const update_page = async (params, env) => {
    // First, get the current page to obtain the version number
    const currentPage = await makeConfluenceRequest(env, `/content/${params.page_id}?expand=version`);
    const currentVersion = currentPage.version?.number || 1;
    const contentFormat = params.content_format || "storage";
    let representation;
    let body;
    if (contentFormat === "wiki") {
        representation = "wiki";
        body = params.content;
    }
    else if (contentFormat === "storage") {
        representation = "storage";
        body = params.content;
    }
    else {
        representation = "storage";
        body = markdownToSimpleStorage(params.content);
    }
    const payload = {
        type: "page",
        title: params.title,
        version: {
            number: currentVersion + 1,
            minorEdit: params.is_minor_edit || false,
        },
        body: {
            storage: {
                value: body,
                representation,
            },
        },
    };
    if (params.version_comment) {
        payload.version.message = params.version_comment;
    }
    if (params.parent_id) {
        payload.ancestors = [{ id: params.parent_id }];
    }
    const updatedPage = await makeConfluenceRequest(env, `/content/${params.page_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Page updated successfully",
                    page: formatPage(updatedPage, true, env.CONFLUENCE_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: delete_page
// ============================================================
const delete_page = async (params, env) => {
    try {
        await makeConfluenceRequest(env, `/content/${params.page_id}`, {
            method: "DELETE",
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Page ${params.page_id} deleted successfully`,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        message: `Error deleting page ${params.page_id}`,
                        error: error instanceof Error
                            ? error.message
                            : String(error),
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: add_comment
// ============================================================
const add_comment = async (params, env) => {
    // Convert content to storage format if it looks like plain text / markdown
    let storageContent;
    if (params.content.trim().startsWith("<")) {
        storageContent = params.content;
    }
    else {
        storageContent = markdownToSimpleStorage(params.content);
    }
    const payload = {
        type: "comment",
        container: {
            id: params.page_id,
            type: "page",
        },
        body: {
            storage: {
                value: storageContent,
                representation: "storage",
            },
        },
    };
    try {
        const comment = await makeConfluenceRequest(env, "/content", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: "Comment added successfully",
                        comment: {
                            id: comment.id,
                            title: comment.title,
                            type: comment.type,
                        },
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        message: `Error adding comment to page ${params.page_id}`,
                        error: error instanceof Error
                            ? error.message
                            : String(error),
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: search_user
// ============================================================
const search_user = async (params, env) => {
    let cql = params.query;
    // If it doesn't look like CQL, wrap as a user fullname search
    if (cql &&
        !["=", "~", ">", "<", " AND ", " OR ", "user."].some((x) => cql.includes(x))) {
        cql = `user.fullname ~ "${cql}"`;
    }
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const searchParams = new URLSearchParams({
        cql,
        limit: limit.toString(),
    });
    try {
        const result = await makeConfluenceRequest(env, `/search/user?${searchParams}`);
        const users = result.results.map((item) => {
            const user = item.user || item;
            return {
                accountId: user.accountId,
                displayName: user.displayName,
                email: user.email,
                username: user.username,
                type: user.type,
            };
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(users, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: `Failed to search users: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: get_spaces
// ============================================================
const get_spaces = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
    const start = Math.max(params.start ?? 0, 0);
    const searchParams = new URLSearchParams({
        limit: limit.toString(),
        start: start.toString(),
    });
    if (params.type) {
        searchParams.append("type", params.type);
    }
    const result = await makeConfluenceRequest(env, `/space?${searchParams}`);
    const spaces = result.results.map((space) => ({
        id: space.id,
        key: space.key,
        name: space.name,
        type: space.type,
        status: space.status,
        description: space.description?.plain?.value || null,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    count: spaces.length,
                    start,
                    limit,
                    results: spaces,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_page_views
// ============================================================
const get_page_views = async (params, env) => {
    const baseUrl = env.CONFLUENCE_BASE_URL.replace(/\/+$/, "");
    try {
        const viewsUrl = `${baseUrl}/wiki/rest/api/analytics/content/${params.page_id}/views`;
        const response = await fetch(viewsUrl, {
            headers: {
                Authorization: getAuthHeader(env),
                Accept: "application/json",
                "User-Agent": "jilebi-confluence-plugin",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const viewData = await response.json();
        const result = {
            page_id: params.page_id,
            count: viewData.count ?? viewData.totalViews ?? null,
        };
        if (params.include_title !== false) {
            try {
                const page = await makeConfluenceRequest(env, `/content/${params.page_id}?expand=version`);
                result.title = page.title;
            }
            catch {
                // Don't fail if title lookup fails
            }
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: `Failed to get page views: ${error instanceof Error ? error.message : String(error)}`,
                        page_id: params.page_id,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Utility: Simple markdown to Confluence storage format converter
// ============================================================
function markdownToSimpleStorage(markdown) {
    if (!markdown)
        return "";
    const lines = markdown.split("\n");
    const result = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        // Empty line — skip
        if (!trimmed) {
            i++;
            continue;
        }
        // Fenced code block
        const codeMatch = trimmed.match(/^```(\w*)$/);
        if (codeMatch) {
            const lang = codeMatch[1] || "text";
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            result.push(`<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${lang}</ac:parameter><ac:plain-text-body><![CDATA[${codeLines.join("\n")}]]></ac:plain-text-body></ac:structured-macro>`);
            continue;
        }
        // Headings (h1-h6)
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = convertInlineFormatting(headingMatch[2]);
            result.push(`<h${level}>${text}</h${level}>`);
            i++;
            continue;
        }
        // Horizontal rule
        if (/^[-*_]{3,}$/.test(trimmed)) {
            result.push("<hr/>");
            i++;
            continue;
        }
        // Blockquote — collect consecutive lines
        if (/^>\s?/.test(trimmed)) {
            const quoteLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                i++;
            }
            const quoteContent = convertInlineFormatting(quoteLines.join(" "));
            result.push(`<blockquote><p>${quoteContent}</p></blockquote>`);
            continue;
        }
        // Unordered list — collect consecutive items
        if (/^[-*+]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
                const itemText = lines[i].trim().replace(/^[-*+]\s+/, "");
                items.push(`<li>${convertInlineFormatting(itemText)}</li>`);
                i++;
            }
            result.push(`<ul>${items.join("")}</ul>`);
            continue;
        }
        // Ordered list — collect consecutive items
        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
                items.push(`<li>${convertInlineFormatting(itemText)}</li>`);
                i++;
            }
            result.push(`<ol>${items.join("")}</ol>`);
            continue;
        }
        // Line already starts with HTML tag — pass through
        if (/^</.test(trimmed)) {
            result.push(trimmed);
            i++;
            continue;
        }
        // Regular paragraph
        result.push(`<p>${convertInlineFormatting(trimmed)}</p>`);
        i++;
    }
    return result.join("\n");
}
// Convert inline markdown formatting to HTML
function convertInlineFormatting(text) {
    let html = text;
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    // Italic (*text* or _text_)
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return html;
}

export { add_comment, add_label, create_page, delete_page, get_comments, get_labels, get_page, get_page_children, get_page_views, get_spaces, search, search_user, update_page };
//# sourceMappingURL=index.js.map
