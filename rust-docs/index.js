const headers = {
    'User-Agent': 'jilebi-rust-docs-plugin/1.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};
// Helper function to get crate information from crates.io
async function fetchCrateInfo(crateName) {
    try {
        const response = await fetch(`https://crates.io/api/v1/crates?q=${crateName}`, { headers });
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Crates.io API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("fetched from crates.io = ", data);
        const crate = data.crates[0];
        const version = crate.versions?.[0];
        return {
            name: crate.name,
            version: version?.num,
            description: crate.description,
            documentation: crate.documentation,
            repository: crate.repository,
            homepage: crate.homepage,
            keywords: crate.keywords || [],
            categories: crate.categories || [],
            features: version?.features || {},
            dependencies: version?.dependencies?.reduce((acc, dep) => {
                acc[dep.name] = dep.version_req;
                return acc;
            }, {}) || {}
        };
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to fetch crate information");
    }
}
// Helper function to search crates
async function searchCrates(query, categories, limit = 10) {
    try {
        const params = new URLSearchParams({
            q: query,
            per_page: limit.toString(),
            sort: 'downloads'
        });
        // Add category filter if provided
        if (categories && categories.length > 0) {
            params.append('category', categories.join(','));
        }
        const response = await fetch(`https://crates.io/api/v1/crates?${params}`, { headers });
        if (!response.ok) {
            throw new Error(`Crates.io search API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.crates.map((crate) => ({
            name: crate.name,
            version: crate.newest_version,
            description: crate.description,
            downloads: crate.downloads,
            documentation: crate.documentation,
            repository: crate.repository,
            keywords: crate.keywords || [],
            categories: crate.categories || [],
            updated_at: crate.updated_at
        }));
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to search crates");
    }
}
export const get_crate_info = async (params, env) => {
    try {
        const { crate_name } = params;
        const crateInfo = await fetchCrateInfo(crate_name);
        if (!crateInfo) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: `Crate '${crate_name}' not found`,
                            suggestion: "Please check the crate name and try again"
                        })
                    }]
            };
        }
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        crate: crateInfo,
                        documentation_url: `https://docs.rs/${crate_name}`,
                        crates_io_url: `https://crates.io/crates/${crate_name}`,
                        usage_example: `cargo add ${crate_name}${crateInfo.version ? '@' + crateInfo.version : ''}`,
                        available_features: Object.keys(crateInfo.features || {}),
                        total_dependencies: Object.keys(crateInfo.dependencies || {}).length
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to get crate information");
    }
};
export const search_rust_docs = async (params, env) => {
    try {
        const { query, categories, limit = 10 } = params;
        const searchResults = await searchCrates(query, categories, limit);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        query,
                        total_results: searchResults.length,
                        results: searchResults.map(crate => ({
                            ...crate,
                            documentation_url: `https://docs.rs/${crate.name}`,
                            crates_io_url: `https://crates.io/crates/${crate.name}`,
                            usage_example: `cargo add ${crate.name}`,
                            relevance_note: `Found based on query: "${query}"`
                        })),
                        search_suggestions: [
                            "Try more specific keywords",
                            "Use category filters to narrow results",
                            "Check the crate documentation for detailed usage examples",
                            "Consider exploring related crates in the same category"
                        ]
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to search Rust documentation");
    }
};
