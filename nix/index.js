/**
 * NixOS Jilebi Plugin
 * Provides comprehensive NixOS, Home Manager, nix-darwin, and NixHub API access
 *
 * Ported from mcp-nixos Python MCP server to Jilebi plugin format
 */
// API Configuration
const NIXOS_API = "https://search.nixos.org/backend";
const NIXOS_AUTH_USER = "aWVSALXpZv";
const NIXOS_AUTH_PASS = "X8gPHnzL52wFEekuxsfQ9cSh";
// Base channel patterns
const BASE_CHANNELS = {
    unstable: "nixos-unstable",
    "24.11": "nixos-24.11",
    "25.05": "nixos-25.05",
};
// Fallback channels when API discovery fails
const FALLBACK_CHANNELS = {
    unstable: "latest-44-nixos-unstable",
    stable: "latest-44-nixos-25.05",
    "25.05": "latest-44-nixos-25.05",
    "25.11": "latest-44-nixos-25.11",
    beta: "latest-44-nixos-25.05",
};
const HOME_MANAGER_URL = "https://nix-community.github.io/home-manager/options.xhtml";
const DARWIN_URL = "https://nix-darwin.github.io/nix-darwin/manual/index.html";
// Channel Cache Class
class ChannelCache {
    availableChannels = null;
    resolvedChannels = null;
    usingFallback = false;
    async getAvailable() {
        console.log(' getAvailable: checking cache');
        if (this.availableChannels === null) {
            console.log(' getAvailable: cache miss, discovering channels');
            this.availableChannels = await this.discoverAvailableChannels();
        }
        else {
            console.log(' getAvailable: cache hit');
        }
        return this.availableChannels || {};
    }
    async getResolved() {
        console.log(' getResolved: checking cache');
        if (this.resolvedChannels === null) {
            console.log(' getResolved: cache miss, resolving channels');
            this.resolvedChannels = await this.resolveChannels();
        }
        else {
            console.log(' getResolved: cache hit');
        }
        return this.resolvedChannels || {};
    }
    isUsingFallback() {
        return this.usingFallback;
    }
    async discoverAvailableChannels() {
        console.log(' discoverAvailableChannels: starting channel discovery');
        const generations = [43, 44, 45, 46];
        const versions = ["unstable", "25.05", "25.11", "26.05", "30.05"];
        const available = {};
        for (const gen of generations) {
            for (const version of versions) {
                const pattern = `latest-${gen}-nixos-${version}`;
                try {
                    const url = `${NIXOS_API}/${pattern}/_count`;
                    const auth = btoa(`${NIXOS_AUTH_USER}:${NIXOS_AUTH_PASS}`);
                    console.log(` discoverAvailableChannels: checking pattern ${pattern}`);
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            Authorization: `Basic ${auth}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query: { match_all: {} } }),
                    });
                    if (response.status === 200) {
                        const data = await response.json();
                        const count = data.count || 0;
                        if (count > 0) {
                            console.log(` discoverAvailableChannels: found ${pattern} with ${count} documents`);
                            available[pattern] = `${count.toLocaleString()} documents`;
                        }
                    }
                }
                catch (error) {
                    console.log(` discoverAvailableChannels: pattern ${pattern} unavailable - ${error}`);
                    continue;
                }
            }
        }
        console.log(` discoverAvailableChannels: discovery complete, found ${Object.keys(available).length} channels`);
        return available;
    }
    async resolveChannels() {
        console.log(' resolveChannels: starting channel resolution');
        const available = await this.getAvailable();
        const resolved = {};
        if (Object.keys(available).length === 0) {
            console.warn(' resolveChannels: no channels discovered, using fallback');
            this.usingFallback = true;
            return FALLBACK_CHANNELS;
        }
        // Map user-friendly names to actual indices
        for (const [name, baseChannel] of Object.entries(BASE_CHANNELS)) {
            let found = false;
            for (const [pattern, _] of Object.entries(available)) {
                if (pattern.includes(baseChannel)) {
                    console.log(` resolveChannels: mapped ${name} -> ${pattern}`);
                    resolved[name] = pattern;
                    found = true;
                    break;
                }
            }
            if (!found && FALLBACK_CHANNELS[name]) {
                console.log(` resolveChannels: using fallback for ${name} -> ${FALLBACK_CHANNELS[name]}`);
                resolved[name] = FALLBACK_CHANNELS[name];
            }
        }
        // Find current stable
        const stableVersions = Object.keys(available)
            .filter((k) => k.match(/latest-\d+-nixos-\d+\.\d+$/))
            .sort()
            .reverse();
        if (stableVersions.length > 0) {
            console.log(` resolveChannels: mapped stable -> ${stableVersions[0]}`);
            resolved["stable"] = stableVersions[0];
        }
        else if (FALLBACK_CHANNELS["stable"]) {
            console.log(` resolveChannels: using fallback for stable`);
            resolved["stable"] = FALLBACK_CHANNELS["stable"];
        }
        console.log(` resolveChannels: resolution complete, ${Object.keys(resolved).length} channels resolved`);
        return resolved;
    }
}
// Global channel cache instance
const channelCache = new ChannelCache();
// Helper Functions
function createError(message, errorType) {
    return errorType ? `ERROR [${errorType}]: ${message}` : `ERROR: ${message}`;
}
async function getChannels() {
    console.log(' getChannels: fetching resolved channels');
    return await channelCache.getResolved();
}
function getChannelSuggestions(channel, channels) {
    const available = Object.keys(channels).join(", ");
    return `Available channels: ${available}`;
}
async function esQuery(index, query, size = 20) {
    console.log(` esQuery: querying index="${index}" with size=${size}`);
    try {
        const url = `${NIXOS_API}/${index}/_search`;
        const auth = btoa(`${NIXOS_AUTH_USER}:${NIXOS_AUTH_PASS}`);
        console.log(` esQuery: url=${url}`);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, size }),
        });
        const data = await response.json();
        if (data && data.hits && data.hits.hits) {
            console.log(` esQuery: retrieved ${data.hits.hits.length} hits from index ${index}`);
            return data.hits.hits;
        }
        console.warn(` esQuery: no hits found in response from index ${index}`);
        return [];
    }
    catch (error) {
        console.error(` esQuery: API error for index ${index}:`, error);
        throw new Error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function parseHtmlOptions(url, query = "", prefix = "", limit = 100) {
    console.log(` parseHtmlOptions: fetching from ${url}, query="${query}", prefix="${prefix}", limit=${limit}`);
    try {
        const response = await fetch(url);
        const html = await response.text();
        // Convert HTML to markdown for easier parsing
        const markdown = html2markdown(html);
        // Parse options from the HTML
        // This is a simplified version - in production, you'd want more robust parsing
        const options = [];
        // Match option patterns in the HTML
        const optionPattern = /id="opt-([^"]+)"/g;
        let match;
        while ((match = optionPattern.exec(html)) !== null &&
            options.length < limit) {
            let name = match[1];
            // Convert underscores back to <name> placeholders
            name = name.replace(/_name_/g, "<name>");
            // Filter by query or prefix
            if (query && !name.toLowerCase().includes(query.toLowerCase())) {
                continue;
            }
            if (prefix && !name.startsWith(prefix + ".") && name !== prefix) {
                continue;
            }
            // Extract description and type (simplified)
            const descMatch = html.match(new RegExp(`id="opt-${match[1]}"[^>]*>.*?<dd[^>]*>(.*?)</dd>`, "s"));
            let description = "";
            let type = "";
            if (descMatch) {
                const ddContent = descMatch[1];
                // Remove HTML tags for description
                description = ddContent
                    .replace(/<[^>]+>/g, " ")
                    .trim()
                    .substring(0, 200);
                // Try to extract type
                const typeMatch = ddContent.match(/Type:\s*([^<\n]+)/);
                if (typeMatch) {
                    type = typeMatch[1].trim();
                }
            }
            options.push({ name, description, type });
        }
        return options;
    }
    catch (error) {
        throw new Error(`Failed to fetch docs: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function stripHtmlTags(text) {
    if (!text)
        return "";
    let result = text
        .replace(/<rendered-html>/g, "")
        .replace(/<\/rendered-html>/g, "");
    result = result.replace(/<[^>]+>/g, "");
    return result.trim();
}
function versionKey(version) {
    const parts = version.split(/[.-]/).map((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) ? 0 : num;
    });
    return parts;
}
function compareVersions(a, b) {
    const aKey = versionKey(a);
    const bKey = versionKey(b);
    for (let i = 0; i < Math.max(aKey.length, bKey.length); i++) {
        const aPart = aKey[i] || 0;
        const bPart = bKey[i] || 0;
        if (aPart !== bPart) {
            return bPart - aPart;
        }
    }
    return 0;
}
// Tool Functions
async function nixos_search(request, env) {
    console.log(` nixos_search: starting search - query="${request.query}", type=${request.search_type || 'packages'}, channel=${request.channel || 'unstable'}, limit=${request.limit || 20}`);
    try {
        const { query, search_type = "packages", limit = 20, channel = "unstable", } = request;
        if (!["packages", "options", "programs", "flakes"].includes(search_type)) {
            console.warn(` nixos_search: invalid search_type "${search_type}"`);
            return {
                content: [
                    { type: "text", text: createError(`Invalid type '${search_type}'`) },
                ],
                isError: true,
            };
        }
        const channels = await getChannels();
        if (!(channel in channels)) {
            console.warn(` nixos_search: invalid channel "${channel}"`);
            const suggestions = getChannelSuggestions(channel, channels);
            return {
                content: [
                    {
                        type: "text",
                        text: createError(`Invalid channel '${channel}'. ${suggestions}`),
                    },
                ],
                isError: true,
            };
        }
        console.log(` nixos_search: using channel "${channel}" -> "${channels[channel]}"`);
        if (limit < 1 || limit > 100) {
            console.warn(` nixos_search: invalid limit ${limit}`);
            return {
                content: [{ type: "text", text: createError("Limit must be 1-100") }],
                isError: true,
            };
        }
        if (search_type === "flakes") {
            console.log(` nixos_search: delegating to nixos_flakes_search`);
            return await nixos_flakes_search(request, env);
        }
        let esQueryObj;
        if (search_type === "packages") {
            esQueryObj = {
                bool: {
                    must: [{ term: { type: "package" } }],
                    should: [
                        { match: { package_pname: { query, boost: 3 } } },
                        { match: { package_description: query } },
                    ],
                    minimum_should_match: 1,
                },
            };
        }
        else if (search_type === "options") {
            esQueryObj = {
                bool: {
                    must: [{ term: { type: "option" } }],
                    should: [
                        { wildcard: { option_name: `*${query}*` } },
                        { match: { option_description: query } },
                    ],
                    minimum_should_match: 1,
                },
            };
        }
        else {
            esQueryObj = {
                bool: {
                    must: [{ term: { type: "package" } }],
                    should: [
                        { match: { package_programs: { query, boost: 2 } } },
                        { match: { package_pname: query } },
                    ],
                    minimum_should_match: 1,
                },
            };
        }
        const hits = await esQuery(channels[channel], esQueryObj, limit);
        if (hits.length === 0) {
            console.log(` nixos_search: no results found for query="${query}" in ${search_type}`);
            return {
                content: [
                    { type: "text", text: `No ${search_type} found matching '${query}'` },
                ],
            };
        }
        console.log(` nixos_search: found ${hits.length} results for query="${query}"`);
        const results = [];
        results.push(`Found ${hits.length} ${search_type} matching '${query}':\n`);
        for (const hit of hits) {
            const src = hit._source || {};
            if (search_type === "packages") {
                const name = src.package_pname || "";
                const version = src.package_pversion || "";
                const desc = src.package_description || "";
                results.push(`• ${name} (${version})`);
                if (desc) {
                    results.push(`  ${desc}`);
                }
                results.push("");
            }
            else if (search_type === "options") {
                const name = src.option_name || "";
                const optType = src.option_type || "";
                let desc = src.option_description || "";
                desc = stripHtmlTags(desc);
                results.push(`• ${name}`);
                if (optType) {
                    results.push(`  Type: ${optType}`);
                }
                if (desc) {
                    results.push(`  ${desc}`);
                }
                results.push("");
            }
            else {
                const programs = src.package_programs || [];
                const pkgName = src.package_pname || "";
                const queryLower = query.toLowerCase();
                const matchedPrograms = programs.filter((p) => p.toLowerCase() === queryLower);
                for (const prog of matchedPrograms) {
                    results.push(`• ${prog} (provided by ${pkgName})`);
                    results.push("");
                }
            }
        }
        console.log(` nixos_search: returning ${results.length} formatted results`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' nixos_search: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixos_info(request, env) {
    console.log(` nixos_info: getting info for name="${request.name}", type=${request.type || 'package'}, channel=${request.channel || 'unstable'}`);
    try {
        const { name, type = "package", channel = "unstable" } = request;
        if (!["package", "option"].includes(type)) {
            console.warn(` nixos_info: invalid type "${type}"`);
            return {
                content: [
                    {
                        type: "text",
                        text: createError("Type must be 'package' or 'option'"),
                    },
                ],
                isError: true,
            };
        }
        const channels = await getChannels();
        if (!(channel in channels)) {
            console.warn(` nixos_info: invalid channel "${channel}"`);
            const suggestions = getChannelSuggestions(channel, channels);
            return {
                content: [
                    {
                        type: "text",
                        text: createError(`Invalid channel '${channel}'. ${suggestions}`),
                    },
                ],
                isError: true,
            };
        }
        const field = type === "package" ? "package_pname" : "option_name";
        const query = {
            bool: {
                must: [{ term: { type } }, { term: { [field]: name } }],
            },
        };
        const hits = await esQuery(channels[channel], query, 1);
        if (hits.length === 0) {
            console.log(` nixos_info: ${type} "${name}" not found`);
            return {
                content: [
                    {
                        type: "text",
                        text: createError(`${type.charAt(0).toUpperCase() + type.slice(1)} '${name}' not found`, "NOT_FOUND"),
                    },
                ],
                isError: true,
            };
        }
        const src = hits[0]._source || {};
        const info = [];
        if (type === "package") {
            info.push(`Package: ${src.package_pname || ""}`);
            info.push(`Version: ${src.package_pversion || ""}`);
            const desc = src.package_description || "";
            if (desc) {
                info.push(`Description: ${desc}`);
            }
            let homepage = src.package_homepage || [];
            if (homepage.length > 0) {
                if (Array.isArray(homepage)) {
                    homepage = homepage[0] || "";
                }
                info.push(`Homepage: ${homepage}`);
            }
            const licenses = src.package_license_set || [];
            if (licenses.length > 0) {
                info.push(`License: ${licenses.join(", ")}`);
            }
        }
        else {
            info.push(`Option: ${src.option_name || ""}`);
            const optType = src.option_type || "";
            if (optType) {
                info.push(`Type: ${optType}`);
            }
            let desc = src.option_description || "";
            desc = stripHtmlTags(desc);
            if (desc) {
                info.push(`Description: ${desc}`);
            }
            const defaultVal = src.option_default || "";
            if (defaultVal) {
                info.push(`Default: ${defaultVal}`);
            }
            const example = src.option_example || "";
            if (example) {
                info.push(`Example: ${example}`);
            }
        }
        return {
            content: [{ type: "text", text: info.join("\n") }],
        };
    }
    catch (error) {
        console.error(' nixos_info: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixos_channels(request, env) {
    console.log(' nixos_channels: listing available channels');
    try {
        const configured = await getChannels();
        const available = await channelCache.getAvailable();
        const results = [];
        if (channelCache.isUsingFallback()) {
            results.push("WARNING: Using fallback channels (API discovery failed)");
            results.push("    Check network connectivity to search.nixos.org");
            results.push("");
            results.push("NixOS Channels (fallback mode):\n");
        }
        else {
            results.push("NixOS Channels (auto-discovered):\n");
        }
        for (const [name, index] of Object.entries(configured).sort()) {
            const status = index in available ? "✓ Available" : "✗ Unavailable";
            const docCount = available[index] || "Unknown";
            let label = `• ${name}`;
            if (name === "stable") {
                const parts = index.split("-");
                if (parts.length >= 4) {
                    const version = parts[3];
                    label = `• ${name} (current: ${version})`;
                }
            }
            results.push(`${label} → ${index}`);
            if (index in available) {
                results.push(`  Status: ${status} (${docCount})`);
            }
            else {
                if (channelCache.isUsingFallback()) {
                    results.push("  Status: Fallback (may not be current)");
                }
                else {
                    results.push(`  Status: ${status}`);
                }
            }
            results.push("");
        }
        if (!channelCache.isUsingFallback()) {
            const configuredValues = new Set(Object.values(configured));
            const discoveredOnly = Object.keys(available).filter((k) => !configuredValues.has(k));
            if (discoveredOnly.length > 0) {
                results.push("Additional available channels:");
                for (const index of discoveredOnly.sort()) {
                    results.push(`• ${index} (${available[index]})`);
                }
            }
        }
        results.push("\nNote: Channels are dynamically discovered.");
        results.push("'stable' always points to the current stable release.");
        if (channelCache.isUsingFallback()) {
            results.push("\nWARNING: Fallback channels may not reflect the latest available versions.");
            results.push("   Please check your network connection to search.nixos.org.");
        }
        console.log(` nixos_channels: found ${Object.keys(configured).length} configured channels`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' nixos_channels: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixos_stats(request, env) {
    console.log(` nixos_stats: getting stats for channel=${request.channel || 'unstable'}`);
    try {
        const { channel = "unstable" } = request;
        const channels = await getChannels();
        if (!(channel in channels)) {
            const suggestions = getChannelSuggestions(channel, channels);
            return {
                content: [
                    {
                        type: "text",
                        text: createError(`Invalid channel '${channel}'. ${suggestions}`),
                    },
                ],
                isError: true,
            };
        }
        const index = channels[channel];
        const url = `${NIXOS_API}/${index}/_count`;
        const auth = btoa(`${NIXOS_AUTH_USER}:${NIXOS_AUTH_PASS}`);
        let pkgCount = 0;
        let optCount = 0;
        try {
            const pkgResp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: { term: { type: "package" } } }),
            });
            const pkgData = await pkgResp.json();
            pkgCount = pkgData.count || 0;
        }
        catch (error) {
            // Ignore
        }
        try {
            const optResp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: { term: { type: "option" } } }),
            });
            const optData = await optResp.json();
            optCount = optData.count || 0;
        }
        catch (error) {
            // Ignore
        }
        if (pkgCount === 0 && optCount === 0) {
            return {
                content: [
                    { type: "text", text: createError("Failed to retrieve statistics") },
                ],
                isError: true,
            };
        }
        const result = `NixOS Statistics for ${channel} channel:\n• Packages: ${pkgCount.toLocaleString()}\n• Options: ${optCount.toLocaleString()}`;
        console.log(` nixos_stats: retrieved stats - packages: ${pkgCount}, options: ${optCount}`);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        console.error(' nixos_stats: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function home_manager_search(request, env) {
    console.log(` home_manager_search: searching for query="${request.query}", limit=${request.limit || 20}`);
    try {
        const { query, limit = 20 } = request;
        if (limit < 1 || limit > 100) {
            console.warn(` home_manager_search: invalid limit ${limit}`);
            return {
                content: [{ type: "text", text: createError("Limit must be 1-100") }],
                isError: true,
            };
        }
        const options = await parseHtmlOptions(HOME_MANAGER_URL, query, "", limit);
        if (options.length === 0) {
            console.log(` home_manager_search: no results found for query="${query}"`);
            return {
                content: [
                    {
                        type: "text",
                        text: `No Home Manager options found matching '${query}'`,
                    },
                ],
            };
        }
        console.log(` home_manager_search: found ${options.length} results for query="${query}"`);
        const results = [];
        results.push(`Found ${options.length} Home Manager options matching '${query}':\n`);
        for (const opt of options) {
            results.push(`• ${opt.name}`);
            if (opt.type) {
                results.push(`  Type: ${opt.type}`);
            }
            if (opt.description) {
                results.push(`  ${opt.description}`);
            }
            results.push("");
        }
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' home_manager_search: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function home_manager_info(request, env) {
    console.log(` home_manager_info: getting info for name="${request.name}"`);
    try {
        const { name } = request;
        const options = await parseHtmlOptions(HOME_MANAGER_URL, name, "", 100);
        for (const opt of options) {
            if (opt.name === name) {
                const info = [];
                info.push(`Option: ${name}`);
                if (opt.type) {
                    info.push(`Type: ${opt.type}`);
                }
                if (opt.description) {
                    info.push(`Description: ${opt.description}`);
                }
                return {
                    content: [{ type: "text", text: info.join("\n") }],
                };
            }
        }
        if (options.length > 0) {
            const suggestions = [];
            for (const opt of options.slice(0, 5)) {
                if (name.toLowerCase().includes(opt.name.toLowerCase()) ||
                    opt.name.startsWith(name + ".")) {
                    suggestions.push(opt.name);
                }
            }
            if (suggestions.length > 0) {
                const msg = `Option '${name}' not found. Did you mean one of these?\n${suggestions.map((s) => `  • ${s}`).join("\n")}\n\nTip: Use home_manager_options_by_prefix('${name}') to browse all options with this prefix.`;
                return {
                    content: [{ type: "text", text: createError(msg, "NOT_FOUND") }],
                    isError: true,
                };
            }
        }
        const msg = `Option '${name}' not found.\nTip: Use home_manager_options_by_prefix('${name}') to browse available options.`;
        return {
            content: [{ type: "text", text: createError(msg, "NOT_FOUND") }],
            isError: true,
        };
    }
    catch (error) {
        console.error(' home_manager_info: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function home_manager_stats(request, env) {
    console.log(' home_manager_stats: getting Home Manager statistics');
    try {
        const options = await parseHtmlOptions(HOME_MANAGER_URL, "", "", 10000);
        const categories = new Set();
        for (const opt of options) {
            const parts = opt.name.split(".");
            if (parts.length > 0) {
                categories.add(parts[0]);
            }
        }
        const result = `Home Manager Statistics:\n• Total options: ${options.length.toLocaleString()}\n• Top-level categories: ${categories.size}`;
        console.log(` home_manager_stats: found ${options.length} options in ${categories.size} categories`);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        console.error(' home_manager_stats: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function home_manager_list_options(request, env) {
    console.log(' home_manager_list_options: listing all option categories');
    try {
        const options = await parseHtmlOptions(HOME_MANAGER_URL, "", "", 10000);
        const categories = new Map();
        for (const opt of options) {
            const parts = opt.name.split(".");
            if (parts.length > 0) {
                const cat = parts[0];
                categories.set(cat, (categories.get(cat) || 0) + 1);
            }
        }
        const results = [];
        results.push(`Home Manager Option Categories (${categories.size} total):\n`);
        for (const [cat, count] of Array.from(categories.entries()).sort()) {
            results.push(`• ${cat} (${count} options)`);
        }
        console.log(` home_manager_list_options: found ${categories.size} categories`);
        return {
            content: [{ type: "text", text: results.join("\n") }],
        };
    }
    catch (error) {
        console.error(' home_manager_list_options: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function home_manager_options_by_prefix(request, env) {
    console.log(` home_manager_options_by_prefix: getting options with prefix="${request.prefix}", limit=${request.limit || 50}`);
    try {
        const { prefix, limit = 50 } = request;
        const options = await parseHtmlOptions(HOME_MANAGER_URL, "", prefix, limit);
        if (options.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Home Manager options found with prefix '${prefix}'`,
                    },
                ],
            };
        }
        const results = [];
        results.push(`Home Manager options with prefix '${prefix}' (showing ${options.length}):\n`);
        for (const opt of options) {
            results.push(`• ${opt.name}`);
            if (opt.type) {
                results.push(`  Type: ${opt.type}`);
            }
            if (opt.description) {
                results.push(`  ${opt.description}`);
            }
            results.push("");
        }
        console.log(` home_manager_options_by_prefix: found ${results.length} options with prefix "${prefix}"`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' home_manager_options_by_prefix: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function darwin_search(request, env) {
    console.log(` darwin_search: searching for query="${request.query}", limit=${request.limit || 20}`);
    try {
        const { query, limit = 20 } = request;
        if (limit < 1 || limit > 100) {
            console.warn(` darwin_search: invalid limit ${limit}`);
            return {
                content: [{ type: "text", text: createError("Limit must be 1-100") }],
                isError: true,
            };
        }
        const options = await parseHtmlOptions(DARWIN_URL, query, "", limit);
        if (options.length === 0) {
            console.log(` darwin_search: no results found for query="${query}"`);
            return {
                content: [
                    {
                        type: "text",
                        text: `No nix-darwin options found matching '${query}'`,
                    },
                ],
            };
        }
        console.log(` darwin_search: found ${options.length} results for query="${query}"`);
        const results = [];
        results.push(`Found ${options.length} nix-darwin options matching '${query}':\n`);
        for (const opt of options) {
            results.push(`• ${opt.name}`);
            if (opt.type) {
                results.push(`  Type: ${opt.type}`);
            }
            if (opt.description) {
                results.push(`  ${opt.description}`);
            }
            results.push("");
        }
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' darwin_search: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function darwin_info(request, env) {
    console.log(` darwin_info: getting info for name="${request.name}"`);
    try {
        const { name } = request;
        const options = await parseHtmlOptions(DARWIN_URL, name, "", 100);
        for (const opt of options) {
            if (opt.name === name) {
                const info = [];
                info.push(`Option: ${name}`);
                if (opt.type) {
                    info.push(`Type: ${opt.type}`);
                }
                if (opt.description) {
                    info.push(`Description: ${opt.description}`);
                }
                return {
                    content: [{ type: "text", text: info.join("\n") }],
                };
            }
        }
        if (options.length > 0) {
            const suggestions = [];
            for (const opt of options.slice(0, 5)) {
                if (name.toLowerCase().includes(opt.name.toLowerCase()) ||
                    opt.name.startsWith(name + ".")) {
                    suggestions.push(opt.name);
                }
            }
            if (suggestions.length > 0) {
                const msg = `Option '${name}' not found. Did you mean one of these?\n${suggestions.map((s) => `  • ${s}`).join("\n")}\n\nTip: Use darwin_options_by_prefix('${name}') to browse all options with this prefix.`;
                return {
                    content: [{ type: "text", text: createError(msg, "NOT_FOUND") }],
                    isError: true,
                };
            }
        }
        const msg = `Option '${name}' not found.\nTip: Use darwin_options_by_prefix('${name}') to browse available options.`;
        return {
            content: [{ type: "text", text: createError(msg, "NOT_FOUND") }],
            isError: true,
        };
    }
    catch (error) {
        console.error(' darwin_info: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function darwin_stats(request, env) {
    console.log(' darwin_stats: getting darwin statistics');
    try {
        const options = await parseHtmlOptions(DARWIN_URL, "", "", 10000);
        const categories = new Set();
        for (const opt of options) {
            const parts = opt.name.split(".");
            if (parts.length > 0) {
                categories.add(parts[0]);
            }
        }
        const result = `nix-darwin Statistics:\n• Total options: ${options.length.toLocaleString()}\n• Top-level categories: ${categories.size}`;
        console.log(` darwin_stats: found ${options.length} options in ${categories.size} categories`);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        console.error(' darwin_stats: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function darwin_list_options(request, env) {
    console.log(' darwin_list_options: listing all darwin option categories');
    try {
        const options = await parseHtmlOptions(DARWIN_URL, "", "", 10000);
        const categories = new Map();
        for (const opt of options) {
            const parts = opt.name.split(".");
            if (parts.length > 0) {
                const cat = parts[0];
                categories.set(cat, (categories.get(cat) || 0) + 1);
            }
        }
        const results = [];
        results.push(`nix-darwin Option Categories (${categories.size} total):\n`);
        for (const [cat, count] of Array.from(categories.entries()).sort()) {
            results.push(`• ${cat} (${count} options)`);
        }
        console.log(` darwin_list_options: found ${categories.size} categories`);
        return {
            content: [{ type: "text", text: results.join("\n") }],
        };
    }
    catch (error) {
        console.error(' darwin_list_options: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function darwin_options_by_prefix(request, env) {
    console.log(` darwin_options_by_prefix: getting options with prefix="${request.prefix}", limit=${request.limit || 50}`);
    try {
        const { prefix, limit = 50 } = request;
        const options = await parseHtmlOptions(DARWIN_URL, "", prefix, limit);
        if (options.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No nix-darwin options found with prefix '${prefix}'`,
                    },
                ],
            };
        }
        const results = [];
        results.push(`nix-darwin options with prefix '${prefix}' (showing ${options.length}):\n`);
        for (const opt of options) {
            results.push(`• ${opt.name}`);
            if (opt.type) {
                results.push(`  Type: ${opt.type}`);
            }
            if (opt.description) {
                results.push(`  ${opt.description}`);
            }
            results.push("");
        }
        console.log(` darwin_options_by_prefix: found ${results.length} options with prefix "${prefix}"`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' darwin_options_by_prefix: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixos_flakes_stats(request, env) {
    console.log(' nixos_flakes_stats: getting flakes statistics');
    try {
        const flakeIndex = "latest-43-group-manual";
        const auth = btoa(`${NIXOS_AUTH_USER}:${NIXOS_AUTH_PASS}`);
        const countResp = await fetch(`${NIXOS_API}/${flakeIndex}/_count`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: { term: { type: "package" } } }),
        });
        const countData = await countResp.json();
        const totalPackages = countData.count || 0;
        const results = [];
        results.push("NixOS Flakes Statistics:");
        results.push(`• Available flakes: ${totalPackages.toLocaleString()}`);
        results.push("\nNote: Flakes are community-contributed and indexed separately from official packages.");
        console.log(` nixos_flakes_stats: found ${totalPackages} flakes`);
        return {
            content: [{ type: "text", text: results.join("\n") }],
        };
    }
    catch (error) {
        console.error(' nixos_flakes_stats: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixos_flakes_search(request, env) {
    console.log(` nixos_flakes_search: searching flakes for query="${request.query}", limit=${request.limit || 20}`);
    try {
        const { query, limit = 20 } = request;
        if (limit < 1 || limit > 100) {
            console.warn(` nixos_flakes_search: invalid limit ${limit}`);
            return {
                content: [{ type: "text", text: createError("Limit must be 1-100") }],
                isError: true,
            };
        }
        const flakeIndex = "latest-43-group-manual";
        const esQueryObj = {
            bool: {
                must: [{ term: { type: "package" } }],
                should: [
                    { match: { package_pname: { query, boost: 3 } } },
                    { match: { package_description: query } },
                    { match: { flake_name: { query, boost: 2 } } },
                ],
                minimum_should_match: 1,
            },
        };
        const hits = await esQuery(flakeIndex, esQueryObj, limit * 2);
        if (hits.length === 0) {
            console.log(` nixos_flakes_search: no results found for query="${query}"`);
            return {
                content: [
                    { type: "text", text: `No flakes found matching '${query}'` },
                ],
            };
        }
        console.log(` nixos_flakes_search: found ${hits.length} results for query="${query}"`);
        // Deduplicate by flake name
        const seenFlakes = new Set();
        const uniqueHits = [];
        for (const hit of hits) {
            const src = hit._source || {};
            const flakeName = src.flake_name || "";
            if (flakeName && !seenFlakes.has(flakeName)) {
                seenFlakes.add(flakeName);
                uniqueHits.push(hit);
                if (uniqueHits.length >= limit)
                    break;
            }
        }
        const results = [];
        results.push(`Found ${uniqueHits.length} flakes matching '${query}':\n`);
        for (const hit of uniqueHits) {
            const src = hit._source || {};
            const flakeName = src.flake_name || "";
            const desc = src.package_description || "";
            const resolved = src.flake_resolved || {};
            const url = resolved.url || "";
            results.push(`• ${flakeName}`);
            if (desc) {
                results.push(`  ${desc}`);
            }
            if (url) {
                results.push(`  URL: ${url}`);
            }
            results.push("");
        }
        console.log(` nixos_flakes_search: returning ${uniqueHits.length} unique flakes`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' nixos_flakes_search: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixhub_package_versions(request, env) {
    console.log(` nixhub_package_versions: getting versions for package="${request.package_name}", limit=${request.limit || 10}`);
    try {
        const { package_name, limit = 10 } = request;
        if (!package_name || !package_name.trim()) {
            return {
                content: [
                    { type: "text", text: createError("Package name is required") },
                ],
                isError: true,
            };
        }
        if (!/^[a-zA-Z0-9\-_.]+$/.test(package_name)) {
            return {
                content: [
                    {
                        type: "text",
                        text: createError("Invalid package name. Only letters, numbers, hyphens, underscores, and dots are allowed"),
                    },
                ],
                isError: true,
            };
        }
        if (limit < 1 || limit > 50) {
            return {
                content: [
                    { type: "text", text: createError("Limit must be between 1 and 50") },
                ],
                isError: true,
            };
        }
        const url = `https://www.nixhub.io/packages/${package_name}?_data=routes%2F_nixhub.packages.%24pkg._index`;
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "jilebi-server",
            },
        });
        if (response.status === 404) {
            return {
                content: [
                    {
                        type: "text",
                        text: createError(`Package '${package_name}' not found in NixHub`, "NOT_FOUND"),
                    },
                ],
                isError: true,
            };
        }
        if (response.status >= 500) {
            return {
                content: [
                    {
                        type: "text",
                        text: createError("NixHub service temporarily unavailable", "SERVICE_ERROR"),
                    },
                ],
                isError: true,
            };
        }
        const data = await response.json();
        if (typeof data !== "object") {
            return {
                content: [
                    {
                        type: "text",
                        text: createError("Invalid response format from NixHub"),
                    },
                ],
                isError: true,
            };
        }
        const summary = data.summary || "";
        const releases = data.releases || [];
        if (releases.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Package: ${package_name}\nNo version history available in NixHub`,
                    },
                ],
            };
        }
        const results = [];
        results.push(`Package: ${package_name}`);
        if (summary) {
            results.push(`Description: ${summary}`);
        }
        results.push(`Total versions: ${releases.length}`);
        results.push("");
        const shownReleases = releases.slice(0, limit);
        results.push(`Version history (showing ${shownReleases.length} of ${releases.length}):\n`);
        for (const release of shownReleases) {
            const version = release.version || "";
            const platforms = release.platforms || [];
            results.push(`• Version: ${version}`);
            if (platforms.length > 0) {
                for (const platform of platforms) {
                    const arch = platform.system || "";
                    const commit = platform.commit_hash || "";
                    const attrPath = platform.attr_path || "";
                    if (arch) {
                        results.push(`  Platform: ${arch}`);
                    }
                    if (commit) {
                        results.push(`  Commit: ${commit}`);
                    }
                    if (attrPath) {
                        results.push(`  Attribute: ${attrPath}`);
                    }
                }
            }
            results.push("");
        }
        if (shownReleases.some((r) => r.platforms?.[0]?.commit_hash)) {
            results.push("To use a specific version in your Nix configuration:");
            results.push("1. Pin nixpkgs to the commit hash");
            results.push("2. Use the attribute path to install the package");
        }
        console.log(` nixhub_package_versions: returning ${results.length} version entries`);
        return {
            content: [{ type: "text", text: results.join("\n").trim() }],
        };
    }
    catch (error) {
        console.error(' nixhub_package_versions: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}
async function nixhub_find_version(request, env) {
    console.log(` nixhub_find_version: finding package="${request.package_name}", version="${request.version}"`);
    try {
        const { package_name, version } = request;
        if (!package_name || !package_name.trim()) {
            return {
                content: [
                    { type: "text", text: createError("Package name is required") },
                ],
                isError: true,
            };
        }
        if (!version || !version.trim()) {
            return {
                content: [{ type: "text", text: createError("Version is required") }],
                isError: true,
            };
        }
        if (!/^[a-zA-Z0-9\-_.]+$/.test(package_name)) {
            return {
                content: [
                    {
                        type: "text",
                        text: createError("Invalid package name. Only letters, numbers, hyphens, underscores, and dots are allowed"),
                    },
                ],
                isError: true,
            };
        }
        const limitsToTry = [10, 25, 50];
        let foundVersion = null;
        const allVersions = [];
        for (const limit of limitsToTry) {
            const url = `https://www.nixhub.io/packages/${package_name}?_data=routes%2F_nixhub.packages.%24pkg._index`;
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json",
                    "User-Agent": "jilebi-server",
                },
            });
            if (response.status === 404) {
                return {
                    content: [
                        {
                            type: "text",
                            text: createError(`Package '${package_name}' not found in NixHub`, "NOT_FOUND"),
                        },
                    ],
                    isError: true,
                };
            }
            if (response.status >= 500) {
                return {
                    content: [
                        {
                            type: "text",
                            text: createError("NixHub service temporarily unavailable", "SERVICE_ERROR"),
                        },
                    ],
                    isError: true,
                };
            }
            const data = await response.json();
            const releases = data.releases || [];
            for (const release of releases.slice(0, limit)) {
                const releaseVersion = release.version || "";
                if (releaseVersion &&
                    !allVersions.find((v) => v.version === releaseVersion)) {
                    allVersions.push({ version: releaseVersion, release });
                }
                if (releaseVersion === version) {
                    foundVersion = release;
                    break;
                }
            }
            if (foundVersion)
                break;
        }
        if (foundVersion) {
            const results = [];
            results.push(`✓ Found ${package_name} version ${version}\n`);
            const platforms = foundVersion.platforms || [];
            if (platforms.length > 0) {
                for (const platform of platforms) {
                    const arch = platform.system || "";
                    const commit = platform.commit_hash || "";
                    const attrPath = platform.attr_path || "";
                    if (arch) {
                        results.push(`Platform: ${arch}`);
                    }
                    if (commit) {
                        results.push(`Commit: ${commit}`);
                    }
                    if (attrPath) {
                        results.push(`Attribute: ${attrPath}`);
                    }
                    results.push("");
                }
            }
            results.push("Usage:");
            results.push("1. Pin nixpkgs to the commit hash above");
            results.push("2. Install using the attribute path");
            return {
                content: [{ type: "text", text: results.join("\n").trim() }],
            };
        }
        const results = [];
        results.push(`✗ ${package_name} version ${version} not found in NixHub\n`);
        if (allVersions.length > 0) {
            results.push(`Available versions (checked ${allVersions.length} total):`);
            const sortedVersions = allVersions.sort((a, b) => compareVersions(a.version, b.version));
            const newest = sortedVersions[0].version;
            const oldest = sortedVersions[sortedVersions.length - 1].version;
            results.push(`• Newest: ${newest}`);
            results.push(`• Oldest: ${oldest}`);
            const majorVersions = new Set();
            for (const v of allVersions) {
                const parts = v.version.split(".");
                if (parts.length > 0) {
                    majorVersions.add(parts[0]);
                }
            }
            if (majorVersions.size > 0) {
                results.push(`• Major versions available: ${Array.from(majorVersions)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .join(", ")}`);
            }
            results.push("\nAlternatives:");
            results.push("• Use a newer version if possible");
            results.push("• Build from source with a custom derivation");
            results.push("• Use Docker/containers with the specific version");
            results.push("• Find an old nixpkgs commit from before the version was removed");
        }
        console.log(` nixhub_find_version: completed search for ${package_name}@${version}`);
        return {
            content: [{ type: "text", text: results.join("\n") }],
        };
    }
    catch (error) {
        console.error(' nixhub_find_version: error occurred:', error);
        return {
            content: [
                {
                    type: "text",
                    text: createError(error instanceof Error ? error.message : String(error)),
                },
            ],
            isError: true,
        };
    }
}

export { darwin_info, darwin_list_options, darwin_options_by_prefix, darwin_search, darwin_stats, home_manager_info, home_manager_list_options, home_manager_options_by_prefix, home_manager_search, home_manager_stats, nixhub_find_version, nixhub_package_versions, nixos_channels, nixos_flakes_search, nixos_flakes_stats, nixos_info, nixos_search, nixos_stats };
//# sourceMappingURL=index.js.map
