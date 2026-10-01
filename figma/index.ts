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

// --- Variables & dev resources ---

export const get_local_variables = async (params: { file_key: string }, env: FigmaEnv) => {
	return api(`/v1/files/${encodeURIComponent(params.file_key)}/variables/local`, env);
};

export const get_dev_resources = async (params: { file_key: string; node_ids?: string }, env: FigmaEnv) => {
	const path = withQuery(`/v1/files/${encodeURIComponent(params.file_key)}/dev_resources`, {
		node_ids: params.node_ids,
	});
	return api(path, env);
};
