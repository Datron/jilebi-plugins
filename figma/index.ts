/**
 * Figma Jilebi Plugin
 *
 * Minimal client for the Figma REST API
 * (https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml).
 * Covers files, images, comments, components, styles, folders,
 * variables and dev resources. Auth via personal access token.
 */

const BASE_URL = "https://api.figma.com";

interface FigmaEnv extends Record<string, any> {
	FIGMA_TOKEN?: string;
}

function authHeaders(env: FigmaEnv): Record<string, string> {
	const token = env.FIGMA_TOKEN;
	if (!token) {
		throw new Error("FIGMA_TOKEN secret is required");
	}
	return { "X-Figma-Token": String(token) };
}

function withQuery(path: string, query: Record<string, any>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === "") continue;
		params.append(key, String(value));
	}
	const qs = params.toString();
	return qs ? `${path}?${qs}` : path;
}

async function api(path: string, env: FigmaEnv, options: RequestInit = {}) {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers: { ...authHeaders(env), ...(options.headers as Record<string, string>) },
	});
	const text = await response.text();
	let body = text;
	try {
		body = JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		/* keep raw text */
	}
	if (!response.ok) {
		return {
			content: [{ type: "text", text: `Figma API error ${response.status} ${response.statusText}:\n${body}` }],
			isError: true,
		};
	}
	return { content: [{ type: "text", text: body }] };
}

function jsonBody(): Record<string, string> {
	return { "Content-Type": "application/json" };
}

// --- Files ---

export const get_file = async (
	params: { file_key: string; version?: string; ids?: string; depth?: number; geometry?: string; plugin_data?: string; branch_data?: boolean },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}`, {
		version: params.version,
		ids: params.ids,
		depth: params.depth,
		geometry: params.geometry,
		plugin_data: params.plugin_data,
		branch_data: params.branch_data,
	});
	return api(path, env);
};

export const get_file_nodes = async (
	params: { file_key: string; ids: string; version?: string; depth?: number; geometry?: string; plugin_data?: string },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}/nodes`, {
		ids: params.ids,
		version: params.version,
		depth: params.depth,
		geometry: params.geometry,
		plugin_data: params.plugin_data,
	});
	return api(path, env);
};

export const get_images = async (
	params: {
		file_key: string;
		ids: string;
		version?: string;
		scale?: number;
		format?: "jpg" | "png" | "svg" | "pdf";
		svg_outline_text?: boolean;
		svg_include_id?: boolean;
		svg_include_node_id?: boolean;
		svg_simplify_stroke?: boolean;
		contents_only?: boolean;
		use_absolute_bounds?: boolean;
	},
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/images/${encodeURIComponent(params.file_key)}`, params);
	return api(path, env);
};

export const get_image_fills = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/images`, env);
};

export const get_file_meta = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/meta`, env);
};

export const get_file_versions = async (
	params: { file_key: string; page_size?: number; before?: number; after?: number },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}/versions`, params);
	return api(path, env);
};

// --- Comments ---

export const get_comments = async (params: { file_key: string; as_md?: boolean }, env: FigmaEnv) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}/comments`, { as_md: params.as_md });
	return api(path, env);
};

export const post_comment = async (
	params: { file_key: string; message: string; comment_id?: string; client_meta?: unknown },
	env: FigmaEnv,
) => {
	const body: Record<string, unknown> = { message: params.message };
	if (params.comment_id) body.comment_id = params.comment_id;
	if (params.client_meta !== undefined) body.client_meta = params.client_meta;
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/comments`, env, {
		method: "POST",
		headers: jsonBody(),
		body: JSON.stringify(body),
	});
};

export const delete_comment = async (params: { file_key: string; comment_id: string }, env: FigmaEnv) => {
	return api(
		`/v1/files/${encodeURIComponent(params.file_key)}/comments/${encodeURIComponent(params.comment_id)}`,
		env,
		{ method: "DELETE" },
	);
};

// --- Users ---

export const get_me = async (_params: Record<string, never>, env: FigmaEnv) => {
	return api("/v1/me", env);
};

// --- Components & styles ---

export const get_team_components = async (
	params: { team_id: string; page_size?: number; after?: number; before?: number },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/teams/${encodeURIComponent(params.team_id)}/components`, {
		page_size: params.page_size,
		after: params.after,
		before: params.before,
	});
	return api(path, env);
};

export const get_file_components = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/components`, env);
};

export const get_component = async (params: { key: string }, env: FigmaEnv) => {
	return api(`/v1/components/${encodeURIComponent(params.key)}`, env);
};

export const get_team_styles = async (
	params: { team_id: string; page_size?: number; after?: number; before?: number },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/teams/${encodeURIComponent(params.team_id)}/styles`, {
		page_size: params.page_size,
		after: params.after,
		before: params.before,
	});
	return api(path, env);
};

export const get_file_styles = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/styles`, env);
};

export const get_style = async (params: { key: string }, env: FigmaEnv) => {
	return api(`/v1/styles/${encodeURIComponent(params.key)}`, env);
};

// --- Folders ---

export const get_team_folders = async (params: { team_id: string }, env: FigmaEnv) => {
	return api(`/v2/teams/${encodeURIComponent(params.team_id)}/folders`, env);
};

export const get_folder_files = async (params: { folder_id: string; branch_data?: boolean }, env: FigmaEnv) => {
	const path = withQuery(`/v2/folders/${encodeURIComponent(params.folder_id)}/files`, {
		branch_data: params.branch_data,
	});
	return api(path, env);
};

export const get_folder_subfolders = async (params: { folder_id: string }, env: FigmaEnv) => {
	return api(`/v2/folders/${encodeURIComponent(params.folder_id)}/folders`, env);
};

export const get_folder_meta = async (params: { folder_id: string }, env: FigmaEnv) => {
	return api(`/v2/folders/${encodeURIComponent(params.folder_id)}/meta`, env);
};

// --- Comment reactions ---

export const get_comment_reactions = async (
	params: { file_key: string; comment_id: string; cursor?: string },
	env: FigmaEnv,
) => {
	const path = withQuery(
		`/v1/files/${encodeURIComponent(params.file_key)}/comments/${encodeURIComponent(params.comment_id)}/reactions`,
		{ cursor: params.cursor },
	);
	return api(path, env);
};

export const post_comment_reaction = async (
	params: { file_key: string; comment_id: string; emoji: string },
	env: FigmaEnv,
) => {
	return api(
		`/v1/files/${encodeURIComponent(params.file_key)}/comments/${encodeURIComponent(params.comment_id)}/reactions`,
		env,
		{ method: "POST", headers: jsonBody(), body: JSON.stringify({ emoji: params.emoji }) },
	);
};

export const delete_comment_reaction = async (
	params: { file_key: string; comment_id: string; emoji: string },
	env: FigmaEnv,
) => {
	const path = withQuery(
		`/v1/files/${encodeURIComponent(params.file_key)}/comments/${encodeURIComponent(params.comment_id)}/reactions`,
		{ emoji: params.emoji },
	);
	return api(path, env, { method: "DELETE" });
};

// --- Component sets ---

export const get_team_component_sets = async (
	params: { team_id: string; page_size?: number; after?: number; before?: number },
	env: FigmaEnv,
) => {
	const path = withQuery(`/v1/teams/${encodeURIComponent(params.team_id)}/component_sets`, {
		page_size: params.page_size,
		after: params.after,
		before: params.before,
	});
	return api(path, env);
};

export const get_file_component_sets = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/component_sets`, env);
};

export const get_component_set = async (params: { key: string }, env: FigmaEnv) => {
	return api(`/v1/component_sets/${encodeURIComponent(params.key)}`, env);
};

// --- Webhooks ---

export const get_webhooks = async (
	params: { context?: string; context_id?: string; plan_api_id?: string; cursor?: string },
	env: FigmaEnv,
) => {
	return api(withQuery("/v2/webhooks", params), env);
};

export const post_webhook = async (
	params: {
		event_type: string;
		endpoint: string;
		passcode: string;
		context: string;
		context_id: string;
		status?: string;
		description?: string;
	},
	env: FigmaEnv,
) => {
	const { event_type, endpoint, passcode, context, context_id, status, description } = params;
	const body: Record<string, unknown> = { event_type, endpoint, passcode, context, context_id };
	if (status !== undefined) body.status = status;
	if (description !== undefined) body.description = description;
	return api("/v2/webhooks", env, { method: "POST", headers: jsonBody(), body: JSON.stringify(body) });
};

export const get_webhook = async (params: { webhook_id: string }, env: FigmaEnv) => {
	return api(`/v2/webhooks/${encodeURIComponent(params.webhook_id)}`, env);
};

export const update_webhook = async (
	params: {
		webhook_id: string;
		event_type?: string;
		endpoint?: string;
		passcode?: string;
		status?: string;
		description?: string;
	},
	env: FigmaEnv,
) => {
	const { webhook_id, ...fields } = params;
	const body: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined) body[key] = value;
	}
	return api(`/v2/webhooks/${encodeURIComponent(webhook_id)}`, env, {
		method: "PUT",
		headers: jsonBody(),
		body: JSON.stringify(body),
	});
};

export const delete_webhook = async (params: { webhook_id: string }, env: FigmaEnv) => {
	return api(`/v2/webhooks/${encodeURIComponent(params.webhook_id)}`, env, { method: "DELETE" });
};

export const get_webhook_requests = async (params: { webhook_id: string }, env: FigmaEnv) => {
	return api(`/v2/webhooks/${encodeURIComponent(params.webhook_id)}/requests`, env);
};

// --- Activity & developer logs, AI usage, payments ---

export const get_activity_logs = async (
	params: { events?: string; start_time?: number; end_time?: number; limit?: number; order?: string },
	env: FigmaEnv,
) => {
	return api(withQuery("/v1/activity_logs", params), env);
};

export const get_developer_logs = async (
	params: {
		token_type?: string;
		token?: string;
		token_name?: string;
		user_email?: string;
		ip_address?: string;
		event_source?: string;
		date_range?: string;
		limit?: number;
		cursor?: string;
	},
	env: FigmaEnv,
) => {
	const body: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) body[key] = value;
	}
	return api("/v1/developer_logs", env, { method: "POST", headers: jsonBody(), body: JSON.stringify(body) });
};

export const get_ai_usage_daily = async (
	params: { start_date: string; end_date: string; user_email?: string; limit?: number; cursor?: string },
	env: FigmaEnv,
) => {
	return api(withQuery("/v1/ai_usage/daily", params), env);
};

export const get_payments = async (
	params: {
		plugin_payment_token?: string;
		user_id?: string;
		community_file_id?: string;
		plugin_id?: string;
		widget_id?: string;
	},
	env: FigmaEnv,
) => {
	return api(withQuery("/v1/payments", params), env);
};

// --- Library analytics ---

async function library_analytics(
	params: { file_key: string; cursor?: string; group_by: string; start_date?: string; end_date?: string },
	env: FigmaEnv,
	kind: string,
	action: string,
) {
	const path = withQuery(`/v1/analytics/libraries/${encodeURIComponent(params.file_key)}/${kind}/${action}`, {
		cursor: params.cursor,
		group_by: params.group_by,
		start_date: params.start_date,
		end_date: params.end_date,
	});
	return api(path, env);
}

export const get_library_analytics_component_actions = async (
	params: { file_key: string; cursor?: string; group_by: string; start_date?: string; end_date?: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "component", "actions");
};

export const get_library_analytics_component_usages = async (
	params: { file_key: string; cursor?: string; group_by: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "component", "usages");
};

export const get_library_analytics_style_actions = async (
	params: { file_key: string; cursor?: string; group_by: string; start_date?: string; end_date?: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "style", "actions");
};

export const get_library_analytics_style_usages = async (
	params: { file_key: string; cursor?: string; group_by: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "style", "usages");
};

export const get_library_analytics_variable_actions = async (
	params: { file_key: string; cursor?: string; group_by: string; start_date?: string; end_date?: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "variable", "actions");
};

export const get_library_analytics_variable_usages = async (
	params: { file_key: string; cursor?: string; group_by: string },
	env: FigmaEnv,
) => {
	return library_analytics(params, env, "variable", "usages");
};

// --- oEmbed ---

export const get_oembed = async (
	params: { url: string; maxwidth?: number; maxheight?: number },
	env: FigmaEnv,
) => {
	return api(withQuery("/v1/oembed", params), env);
};

// --- Variables & dev resources ---

export const get_local_variables = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/variables/local`, env);
};

export const get_published_variables = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/variables/published`, env);
};

export const post_variables = async (
	params: {
		file_key: string;
		variable_collections?: unknown[];
		variable_modes?: unknown[];
		variables?: unknown[];
		variable_mode_values?: unknown[];
	},
	env: FigmaEnv,
) => {
	const body: Record<string, unknown> = {};
	if (params.variable_collections !== undefined) body.variableCollections = params.variable_collections;
	if (params.variable_modes !== undefined) body.variableModes = params.variable_modes;
	if (params.variables !== undefined) body.variables = params.variables;
	if (params.variable_mode_values !== undefined) body.variableModeValues = params.variable_mode_values;
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/variables`, env, {
		method: "POST",
		headers: jsonBody(),
		body: JSON.stringify(body),
	});
};

export const get_dev_resources = async (params: { file_key: string; node_ids?: string }, env: FigmaEnv) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}/dev_resources`, {
		node_ids: params.node_ids,
	});
	return api(path, env);
};

export const post_dev_resources = async (
	params: { dev_resources: { name: string; url: string; file_key: string; node_id: string }[] },
	env: FigmaEnv,
) => {
	return api("/v1/dev_resources", env, {
		method: "POST",
		headers: jsonBody(),
		body: JSON.stringify({ dev_resources: params.dev_resources }),
	});
};

export const update_dev_resources = async (
	params: { dev_resources: { id: string; name?: string; url?: string }[] },
	env: FigmaEnv,
) => {
	return api("/v1/dev_resources", env, {
		method: "PUT",
		headers: jsonBody(),
		body: JSON.stringify({ dev_resources: params.dev_resources }),
	});
};

export const delete_dev_resource = async (
	params: { file_key: string; dev_resource_id: string },
	env: FigmaEnv,
) => {
	return api(
		`/v1/files/${encodeURIComponent(params.file_key)}/dev_resources/${encodeURIComponent(params.dev_resource_id)}`,
		env,
		{ method: "DELETE" },
	);
};
