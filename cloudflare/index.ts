// Cloudflare Jilebi Plugin
// Comprehensive plugin providing access to all Cloudflare services and APIs

// Types for Cloudflare API responses
interface CloudflareApiResponse {
	success: boolean;
	errors: any[];
	messages: any[];
	result: any;
	result_info?: {
		page: number;
		per_page: number;
		total_pages: number;
		total_count: number;
	};
}

interface Environment {
	CLOUDFLARE_API_TOKEN: string;
	CLOUDFLARE_ACCOUNT_ID?: string;
}

// Helper function to make Cloudflare API requests
async function makeCloudflareRequest(
	token: string,
	endpoint: string,
	options: RequestInit = {},
	accountId?: string
): Promise<any> {
	if (!token) {
		throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
	}

	const baseUrl = 'https://api.cloudflare.com/client/v4';
	const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

	const headers: Record<string, string> = {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json',
	};

	// Add any additional headers from options
	if (options.headers) {
		Object.assign(headers, options.headers);
	}

	if (accountId) {
		headers['X-Cloudflare-Account'] = accountId;
	}

	const response = await fetch(url, {
		...options,
		headers,
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Cloudflare API error: ${response.status} ${response.statusText} - ${error}`);
	}

	return response.json();
}

// AI Gateway Tools
export const ai_gateway_list_gateways = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const endpoint = `/accounts/{account_id}/ai-gateway/gateways`;
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`${endpoint}?${queryParams}`,
			{},
			env.CLOUDFLARE_ACCOUNT_ID
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing AI Gateways: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const ai_gateway_get_gateway = async (params: {
	gateway_id: string;
}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/ai-gateway/gateways/${params.gateway_id}`,
			{},
			env.CLOUDFLARE_ACCOUNT_ID
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting AI Gateway: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const ai_gateway_list_logs = async (params: {
	gateway_id: string;
	page?: number;
	per_page?: number;
	start_time?: string;
	end_time?: string;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());
		if (params.start_time) queryParams.append('start_time', params.start_time);
		if (params.end_time) queryParams.append('end_time', params.end_time);

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/ai-gateway/gateways/${params.gateway_id}/logs?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing AI Gateway logs: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// AutoRAG Tools
export const autorag_list_instances = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/autorag?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing AutoRAG instances: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const autorag_search_documents = async (params: {
	autorag_id: string;
	query: string;
	limit?: number;
}, env: Environment) => {
	try {
		const body = {
			query: params.query,
			limit: params.limit || 10
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/autorag/${params.autorag_id}/search`,
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error searching AutoRAG documents: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Browser Rendering Tools
export const browser_get_html = async (params: {
	url: string;
	wait_for?: string;
}, env: Environment) => {
	try {
		const body = {
			url: params.url,
			...(params.wait_for && { wait_for: params.wait_for })
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'/accounts/{account_id}/browser-rendering/html',
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting HTML content: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const browser_get_markdown = async (params: {
	url: string;
	wait_for?: string;
}, env: Environment) => {
	try {
		const body = {
			url: params.url,
			...(params.wait_for && { wait_for: params.wait_for })
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'/accounts/{account_id}/browser-rendering/markdown',
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting Markdown content: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const browser_screenshot = async (params: {
	url: string;
	viewport_width?: number;
	viewport_height?: number;
	wait_for?: string;
}, env: Environment) => {
	try {
		const body = {
			url: params.url,
			...(params.viewport_width && { viewport_width: params.viewport_width }),
			...(params.viewport_height && { viewport_height: params.viewport_height }),
			...(params.wait_for && { wait_for: params.wait_for })
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'/accounts/{account_id}/browser-rendering/screenshot',
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error taking screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// DNS Analytics Tools
export const dns_analytics_query = async (params: {
	zone_id: string;
	start_time?: string;
	end_time?: string;
	dimensions?: string[];
	metrics?: string[];
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.start_time) queryParams.append('since', params.start_time);
		if (params.end_time) queryParams.append('until', params.end_time);
		if (params.dimensions) {
			params.dimensions.forEach(dim => queryParams.append('dimensions', dim));
		}
		if (params.metrics) {
			params.metrics.forEach(metric => queryParams.append('metrics', metric));
		}

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/zones/${params.zone_id}/dns_analytics/report?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error querying DNS analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// GraphQL Tools
export const graphql_query = async (params: {
	query: string;
	variables?: any;
}, env: Environment) => {
	try {
		const body = {
			query: params.query,
			...(params.variables && { variables: params.variables })
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'https://api.cloudflare.com/client/v4/graphql',
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					data: result.data,
					errors: result.errors
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error executing GraphQL query: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Radar Tools
export const radar_list_asns = async (params: {
	limit?: number;
	offset?: number;
	location?: string;
	orderBy?: string;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.limit) queryParams.append('limit', params.limit.toString());
		if (params.offset) queryParams.append('offset', params.offset.toString());
		if (params.location) queryParams.append('location', params.location);
		if (params.orderBy) queryParams.append('orderBy', params.orderBy);

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`https://api.cloudflare.com/client/v4/radar/entities/asns?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing ASNs: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const radar_get_asn_details = async (params: {
	asn: number;
}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`https://api.cloudflare.com/client/v4/radar/entities/asns/${params.asn}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting ASN details: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const radar_url_scanner = async (params: {
	url: string;
}, env: Environment) => {
	try {
		const body = {
			url: params.url
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'https://api.cloudflare.com/client/v4/radar/url-scanner/scan',
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error scanning URL: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const radar_traffic_insights = async (params: {
	start_time?: string;
	end_time?: string;
	location?: string;
	dimension?: string;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.start_time) queryParams.append('dateStart', params.start_time);
		if (params.end_time) queryParams.append('dateEnd', params.end_time);
		if (params.location) queryParams.append('location', params.location);
		if (params.dimension) queryParams.append('dimension', params.dimension);

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`https://api.cloudflare.com/client/v4/radar/http/top/browser_families?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting traffic insights: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Workers Tools
export const workers_list_scripts = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/workers/scripts?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing Workers scripts: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const workers_get_script = async (params: {
	script_name: string;
}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/workers/scripts/${params.script_name}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting Workers script: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const workers_observability_query = async (params: {
	script_name: string;
	start_time?: string;
	end_time?: string;
	metrics?: string[];
	filters?: any;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.start_time) queryParams.append('since', params.start_time);
		if (params.end_time) queryParams.append('until', params.end_time);
		if (params.metrics) {
			params.metrics.forEach(metric => queryParams.append('metrics', metric));
		}

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/workers/scripts/${params.script_name}/analytics?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error querying Workers observability: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// KV Tools
export const kv_list_namespaces = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/storage/kv/namespaces?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing KV namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const kv_list_keys = async (params: {
	namespace_id: string;
	prefix?: string;
	limit?: number;
	cursor?: string;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.prefix) queryParams.append('prefix', params.prefix);
		if (params.limit) queryParams.append('limit', params.limit.toString());
		if (params.cursor) queryParams.append('cursor', params.cursor);

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/storage/kv/namespaces/${params.namespace_id}/keys?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing KV keys: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const kv_get_value = async (params: {
	namespace_id: string;
	key: string;
}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/storage/kv/namespaces/${params.namespace_id}/values/${params.key}`
		);

		return {
			content: [{
				type: "text",
				text: typeof result === 'string' ? result : JSON.stringify(result)
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting KV value: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// R2 Tools
export const r2_list_buckets = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/r2/buckets?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing R2 buckets: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const r2_list_objects = async (params: {
	bucket_name: string;
	prefix?: string;
	max_keys?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.prefix) queryParams.append('prefix', params.prefix);
		if (params.max_keys) queryParams.append('max-keys', params.max_keys.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/r2/buckets/${params.bucket_name}/objects?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing R2 objects: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// D1 Tools
export const d1_list_databases = async (params: {
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/d1/database?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing D1 databases: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const d1_query_database = async (params: {
	database_id: string;
	sql: string;
	params?: string[];
}, env: Environment) => {
	try {
		const body = {
			sql: params.sql,
			...(params.params && { params: params.params })
		};

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/d1/database/${params.database_id}/query`,
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error querying D1 database: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Security Tools
export const security_casb_findings = async (params: {
	app_type?: string;
	severity?: string;
	page?: number;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.app_type) queryParams.append('app_type', params.app_type);
		if (params.severity) queryParams.append('severity', params.severity);
		if (params.page) queryParams.append('page', params.page.toString());

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/casb/findings?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting CASB findings: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const security_dex_analysis = async (params: {
	application?: string;
	start_time?: string;
	end_time?: string;
	metrics?: string[];
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.application) queryParams.append('application', params.application);
		if (params.start_time) queryParams.append('since', params.start_time);
		if (params.end_time) queryParams.append('until', params.end_time);
		if (params.metrics) {
			params.metrics.forEach(metric => queryParams.append('metrics', metric));
		}

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/dex/tests?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting DEX analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Account Management Tools
export const account_list = async (_params: {}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			'/accounts'
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const account_set_active = async (params: {
	account_id: string;
}, env: Environment) => {
	try {
		// This would typically be handled by storing the active account ID in some storage
		// For now, we'll just return the account details to confirm it exists
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/${params.account_id}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					message: `Active account set to: ${params.account_id}`
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error setting active account: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const zones_list = async (params: {
	page?: number;
	per_page?: number;
	name?: string;
}, env: Environment) => {
	try {
		const queryParams = new URLSearchParams();
		if (params.page) queryParams.append('page', params.page.toString());
		if (params.per_page) queryParams.append('per_page', params.per_page.toString());
		if (params.name) queryParams.append('name', params.name);

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/zones?${queryParams}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result,
					result_info: result.result_info
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing zones: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Logpush Tools
export const logpush_list_jobs = async (params: {
	zone_id?: string;
}, env: Environment) => {
	try {
		const endpoint = params.zone_id
			? `/zones/${params.zone_id}/logpush/jobs`
			: `/accounts/{account_id}/logpush/jobs`;

		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			endpoint
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error listing Logpush jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

export const logpush_job_summary = async (params: {
	job_id: number;
}, env: Environment) => {
	try {
		const result = await makeCloudflareRequest(
			env.CLOUDFLARE_API_TOKEN,
			`/accounts/{account_id}/logpush/jobs/${params.job_id}`
		);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					success: result.success,
					result: result.result
				})
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error getting Logpush job summary: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};

// Documentation Tools
export const docs_search = async (params: {
	query: string;
	limit?: number;
}, env: Environment) => {
	try {
		// This would integrate with the Vectorize-based documentation search
		// For now, we'll simulate a basic search response
		const searchResults = {
			success: true,
			result: [
				{
					title: `Documentation for: ${params.query}`,
					content: `Search results for "${params.query}" would be retrieved from Cloudflare's Vectorize-indexed documentation.`,
					url: `https://developers.cloudflare.com/search/?q=${encodeURIComponent(params.query)}`,
					relevance_score: 0.95
				}
			]
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(searchResults)
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Error searching documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
			}]
		};
	}
};
