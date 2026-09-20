/**
 * Superposition Jilebi Plugin
 *
 * Generated from https://github.com/juspay/superposition/blob/main/docs/docs/api/Superposition.openapi.json
 * Provides tools for config resolution, contexts, dimensions, experiments,
 * default-configs, functions, workspaces, organisations, webhooks, secrets and more.
 */

interface MCPTextContent { type: "text"; text: string; }
interface MCPResult { content: MCPTextContent[]; isError?: boolean; }

interface SuperpositionEnv extends Record<string, any> {
  SUPERPOSITION_BASE_URL?: string;
  SUPERPOSITION_ORG_ID?: string;
  SUPERPOSITION_WORKSPACE?: string;
}

function get_base_url(env: SuperpositionEnv): string {
  const raw = (env.SUPERPOSITION_BASE_URL || "http://localhost:8080") as string;
  return raw.replace(/\/$/, "");
}

function resolve_org(request: any, env: SuperpositionEnv): string | undefined {
  return request.org_id || request.x_org_id || (env.SUPERPOSITION_ORG_ID as string | undefined);
}

function resolve_workspace(request: any, env: SuperpositionEnv): string | undefined {
  return request.workspace || request.x_workspace || (env.SUPERPOSITION_WORKSPACE as string | undefined);
}

async function handle_response(response: Response): Promise<MCPResult> {
  const text = await response.text();
  let body: string = text;
  try { const parsed = JSON.parse(text); body = JSON.stringify(parsed, null, 2); }
  catch { /* keep raw text */ }
  if (!response.ok) {
    return { content: [{ type: "text", text: `Superposition API error ${response.status} ${response.statusText}:\n${body}` }], isError: true };
  }
  return { content: [{ type: "text", text: body }] };
}

function append_query(params: URLSearchParams, key: string, value: any): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) { for (const v of value) { if (v !== undefined && v !== null) params.append(key, String(v)); } return; }
  if (typeof value === "object") { for (const [k, v] of Object.entries(value)) { if (v !== undefined && v !== null) params.append(k, String(v)); } return; }
  params.append(key, String(value));
}

/**
 * AddMembersToGroup: Adds members to an existing experiment group.
 * PATCH /experiment-groups/{id}/add-members
 */
export async function add_members_to_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    if (request.member_experiment_ids === undefined || request.member_experiment_ids === null) {
      return { content: [{ type: "text", text: "Missing required parameter: member_experiment_ids" }], isError: true };
    }
    let path = "/experiment-groups/{id}/add-members";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.member_experiment_ids !== undefined) { payload["member_experiment_ids"] = request.member_experiment_ids; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ApplicableVariants: Determines which experiment variants are applicable to a given context, used for experiment evaluation and variant selection.
 * POST /experiments/applicable-variants
 */
export async function applicable_variants(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.identifier === undefined || request.identifier === null) {
      return { content: [{ type: "text", text: "Missing required parameter: identifier" }], isError: true };
    }
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    let path = "/experiments/applicable-variants";
    const query = new URLSearchParams();
    append_query(query, "identifier", request.identifier);
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * BulkOperation: Executes multiple context operations (PUT, REPLACE, DELETE, MOVE) in a single atomic transaction for efficient batch processing.
 * PUT /context/bulk-operations
 */
export async function bulk_operation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.operations === undefined || request.operations === null) {
      return { content: [{ type: "text", text: "Missing required parameter: operations" }], isError: true };
    }
    let path = "/context/bulk-operations";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.operations !== undefined) { payload["operations"] = request.operations; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PUT", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ConcludeExperiment: Concludes an inprogress experiment by selecting a winning variant and transitioning the experiment to a concluded state.
 * PATCH /experiments/{id}/conclude
 */
export async function conclude_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.chosen_variant === undefined || request.chosen_variant === null) {
      return { content: [{ type: "text", text: "Missing required parameter: chosen_variant" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments/{id}/conclude";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.chosen_variant !== undefined) { payload["chosen_variant"] = request.chosen_variant; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateContext: Creates a new context with specified conditions and overrides. Contexts define conditional rules for config management.
 * PUT /context
 */
export async function create_context(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    if (request.override === undefined || request.override === null) {
      return { content: [{ type: "text", text: "Missing required parameter: override" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/context";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (request.override !== undefined) { payload["override"] = request.override; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PUT", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateDefaultConfig: Creates a new default config entry with specified key, value, schema, and metadata. Default configs serve as fallback values when no specific context matches.
 * POST /default-config
 */
export async function create_default_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.key === undefined || request.key === null) {
      return { content: [{ type: "text", text: "Missing required parameter: key" }], isError: true };
    }
    if (request.value === undefined || request.value === null) {
      return { content: [{ type: "text", text: "Missing required parameter: value" }], isError: true };
    }
    if (request.schema === undefined || request.schema === null) {
      return { content: [{ type: "text", text: "Missing required parameter: schema" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/default-config";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.key !== undefined) { payload["key"] = request.key; hasPayload = true; }
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.schema !== undefined) { payload["schema"] = request.schema; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.value_validation_function_name !== undefined) { payload["value_validation_function_name"] = request.value_validation_function_name; hasPayload = true; }
      if (request.value_compute_function_name !== undefined) { payload["value_compute_function_name"] = request.value_compute_function_name; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateDimension: Creates a new dimension with the specified json schema. Dimensions define categorical attributes used for context-based config management.
 * POST /dimension
 */
export async function create_dimension(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.dimension === undefined || request.dimension === null) {
      return { content: [{ type: "text", text: "Missing required parameter: dimension" }], isError: true };
    }
    if (request.position === undefined || request.position === null) {
      return { content: [{ type: "text", text: "Missing required parameter: position" }], isError: true };
    }
    if (request.schema === undefined || request.schema === null) {
      return { content: [{ type: "text", text: "Missing required parameter: schema" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/dimension";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.dimension !== undefined) { payload["dimension"] = request.dimension; hasPayload = true; }
      if (request.position !== undefined) { payload["position"] = request.position; hasPayload = true; }
      if (request.schema !== undefined) { payload["schema"] = request.schema; hasPayload = true; }
      if (request.value_validation_function_name !== undefined) { payload["value_validation_function_name"] = request.value_validation_function_name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.dimension_type !== undefined) { payload["dimension_type"] = request.dimension_type; hasPayload = true; }
      if (request.value_compute_function_name !== undefined) { payload["value_compute_function_name"] = request.value_compute_function_name; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateExperiment: Creates a new experiment with variants, context and conditions. You can optionally specify metrics and experiment group for tracking and analysis.
 * POST /experiments
 */
export async function create_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    if (request.variants === undefined || request.variants === null) {
      return { content: [{ type: "text", text: "Missing required parameter: variants" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.idempotency_key !== undefined && request.idempotency_key !== null) headers["idempotency-key"] = String(request.idempotency_key);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (request.experiment_type !== undefined) { payload["experiment_type"] = request.experiment_type; hasPayload = true; }
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (request.variants !== undefined) { payload["variants"] = request.variants; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.metrics !== undefined) { payload["metrics"] = request.metrics; hasPayload = true; }
      if (request.experiment_group_id !== undefined) { payload["experiment_group_id"] = request.experiment_group_id; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateExperimentGroup: Creates a new experiment group.
 * POST /experiment-groups
 */
export async function create_experiment_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    if (request.traffic_percentage === undefined || request.traffic_percentage === null) {
      return { content: [{ type: "text", text: "Missing required parameter: traffic_percentage" }], isError: true };
    }
    let path = "/experiment-groups";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (request.traffic_percentage !== undefined) { payload["traffic_percentage"] = request.traffic_percentage; hasPayload = true; }
      if (request.member_experiment_ids !== undefined) { payload["member_experiment_ids"] = request.member_experiment_ids; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateFunction: Creates a new custom function for value_validation, value_compute, context_validation or change_reason_validation with specified code, runtime version, and function type.
 * POST /function
 */
export async function create_function(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    if (request.function === undefined || request.function === null) {
      return { content: [{ type: "text", text: "Missing required parameter: function" }], isError: true };
    }
    if (request.runtime_version === undefined || request.runtime_version === null) {
      return { content: [{ type: "text", text: "Missing required parameter: runtime_version" }], isError: true };
    }
    if (request.function_type === undefined || request.function_type === null) {
      return { content: [{ type: "text", text: "Missing required parameter: function_type" }], isError: true };
    }
    let path = "/function";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.function_name !== undefined) { payload["function_name"] = request.function_name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.function !== undefined) { payload["function"] = request.function; hasPayload = true; }
      if (request.runtime_version !== undefined) { payload["runtime_version"] = request.runtime_version; hasPayload = true; }
      if (request.function_type !== undefined) { payload["function_type"] = request.function_type; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateOrganisation: Creates a new organisation with specified name and administrator email. This is the top-level entity that contains workspaces and manages organizational-level settings.
 * POST /superposition/organisations
 */
export async function create_organisation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.admin_email === undefined || request.admin_email === null) {
      return { content: [{ type: "text", text: "Missing required parameter: admin_email" }], isError: true };
    }
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/superposition/organisations";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (orgId) headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.country_code !== undefined) { payload["country_code"] = request.country_code; hasPayload = true; }
      if (request.contact_email !== undefined) { payload["contact_email"] = request.contact_email; hasPayload = true; }
      if (request.contact_phone !== undefined) { payload["contact_phone"] = request.contact_phone; hasPayload = true; }
      if (request.admin_email !== undefined) { payload["admin_email"] = request.admin_email; hasPayload = true; }
      if (request.sector !== undefined) { payload["sector"] = request.sector; hasPayload = true; }
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateSecret: Creates a new encrypted secret with the specified name and value. The secret is encrypted with the workspace's current encryption key. Secret values are never returned in responses for security.
 * POST /secrets
 */
export async function create_secret(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.value === undefined || request.value === null) {
      return { content: [{ type: "text", text: "Missing required parameter: value" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/secrets";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateTypeTemplates: Creates a new type template with specified schema definition, providing reusable type definitions for config validation.
 * POST /types
 */
export async function create_type_templates(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.type_name === undefined || request.type_name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: type_name" }], isError: true };
    }
    if (request.type_schema === undefined || request.type_schema === null) {
      return { content: [{ type: "text", text: "Missing required parameter: type_schema" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/types";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.type_name !== undefined) { payload["type_name"] = request.type_name; hasPayload = true; }
      if (request.type_schema !== undefined) { payload["type_schema"] = request.type_schema; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateVariable: Creates a new variable with the specified name and value.
 * POST /variables
 */
export async function create_variable(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.value === undefined || request.value === null) {
      return { content: [{ type: "text", text: "Missing required parameter: value" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/variables";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateWebhook: Creates a new webhook config to receive HTTP notifications when specified events occur in the system.
 * POST /webhook
 */
export async function create_webhook(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.description === undefined || request.description === null) {
      return { content: [{ type: "text", text: "Missing required parameter: description" }], isError: true };
    }
    if (request.enabled === undefined || request.enabled === null) {
      return { content: [{ type: "text", text: "Missing required parameter: enabled" }], isError: true };
    }
    if (request.url === undefined || request.url === null) {
      return { content: [{ type: "text", text: "Missing required parameter: url" }], isError: true };
    }
    if (request.method === undefined || request.method === null) {
      return { content: [{ type: "text", text: "Missing required parameter: method" }], isError: true };
    }
    if (request.events === undefined || request.events === null) {
      return { content: [{ type: "text", text: "Missing required parameter: events" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/webhook";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.name !== undefined) { payload["name"] = request.name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.enabled !== undefined) { payload["enabled"] = request.enabled; hasPayload = true; }
      if (request.url !== undefined) { payload["url"] = request.url; hasPayload = true; }
      if (request.method !== undefined) { payload["method"] = request.method; hasPayload = true; }
      if (request.version !== undefined) { payload["version"] = request.version; hasPayload = true; }
      if (request.custom_headers !== undefined) { payload["custom_headers"] = request.custom_headers; hasPayload = true; }
      if (request.events !== undefined) { payload["events"] = request.events; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * CreateWorkspace: Creates a new workspace within an organisation, including database schema setup and isolated environment for config management with specified admin and settings.
 * POST /workspaces
 */
export async function create_workspace(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.workspace_admin_email === undefined || request.workspace_admin_email === null) {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_admin_email" }], isError: true };
    }
    if (request.workspace_name === undefined || request.workspace_name === null) {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_name" }], isError: true };
    }
    let path = "/workspaces";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.workspace_admin_email !== undefined) { payload["workspace_admin_email"] = request.workspace_admin_email; hasPayload = true; }
      if (request.workspace_name !== undefined) { payload["workspace_name"] = request.workspace_name; hasPayload = true; }
      if (request.workspace_status !== undefined) { payload["workspace_status"] = request.workspace_status; hasPayload = true; }
      if (request.metrics !== undefined) { payload["metrics"] = request.metrics; hasPayload = true; }
      if (request.allow_experiment_self_approval !== undefined) { payload["allow_experiment_self_approval"] = request.allow_experiment_self_approval; hasPayload = true; }
      if (request.auto_populate_control !== undefined) { payload["auto_populate_control"] = request.auto_populate_control; hasPayload = true; }
      if (request.enable_context_validation !== undefined) { payload["enable_context_validation"] = request.enable_context_validation; hasPayload = true; }
      if (request.enable_change_reason_validation !== undefined) { payload["enable_change_reason_validation"] = request.enable_change_reason_validation; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteContext: Permanently removes a context from the workspace. This operation cannot be undone and will affect config resolution.
 * DELETE /context/{id}
 */
export async function delete_context(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/context/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteDefaultConfig: Permanently removes a default config entry from the workspace. This operation cannot be performed if it affects config resolution for contexts that rely on this fallback value.
 * DELETE /default-config/{key}
 */
export async function delete_default_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.key === undefined || request.key === null || request.key === "") {
      return { content: [{ type: "text", text: "Missing required parameter: key" }], isError: true };
    }
    let path = "/default-config/{key}";
    path = path.replace("{key}", encodeURIComponent(String(request.key)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteDimension: Permanently removes a dimension from the workspace. This operation will fail if the dimension has active dependencies or is referenced by existing configurations.
 * DELETE /dimension/{dimension}
 */
export async function delete_dimension(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.dimension === undefined || request.dimension === null || request.dimension === "") {
      return { content: [{ type: "text", text: "Missing required parameter: dimension" }], isError: true };
    }
    let path = "/dimension/{dimension}";
    path = path.replace("{dimension}", encodeURIComponent(String(request.dimension)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteExperimentGroup: Deletes an experiment group.
 * DELETE /experiment-groups/{id}
 */
export async function delete_experiment_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/experiment-groups/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteFunction: Permanently removes a function from the workspace, deleting both draft and published versions along with all associated code. It fails if already in use
 * DELETE /function/{function_name}
 */
export async function delete_function(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null || request.function_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    let path = "/function/{function_name}";
    path = path.replace("{function_name}", encodeURIComponent(String(request.function_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteSecret: Permanently deletes a secret from the workspace. The encrypted value is removed and cannot be recovered.
 * DELETE /secrets/{name}
 */
export async function delete_secret(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/secrets/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteTypeTemplates: Permanently removes a type template from the workspace. No checks performed while deleting
 * DELETE /types/{type_name}
 */
export async function delete_type_templates(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.type_name === undefined || request.type_name === null || request.type_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: type_name" }], isError: true };
    }
    let path = "/types/{type_name}";
    path = path.replace("{type_name}", encodeURIComponent(String(request.type_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteVariable: Permanently deletes a variable from the workspace.
 * DELETE /variables/{name}
 */
export async function delete_variable(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/variables/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DeleteWebhook: Permanently removes a webhook config from the workspace, stopping all future event notifications to that endpoint.
 * DELETE /webhook/{name}
 */
export async function delete_webhook(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/webhook/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "DELETE", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * DiscardExperiment: Discards an experiment without selecting a winner, effectively canceling the experiment and removing its effects.
 * PATCH /experiments/{id}/discard
 */
export async function discard_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments/{id}/discard";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetConfig: Retrieves config data with context evaluation, including applicable contexts, overrides, and default values based on provided conditions.
 * POST /config
 */
export async function get_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config";
    const query = new URLSearchParams();
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "version", request.version);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetConfigJson: Retrieves the full config in JSON format, including default configs with schemas, dimensions, and overrides. This endpoint is optimized for clients that prefer JSON format for configuration management
 * POST /config/json
 */
export async function get_config_json(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config/json";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetConfigToml: Retrieves the full config in TOML format, including default configs with schemas, dimensions, and overrides. This endpoint is optimized for clients that prefer TOML format for configuration management
 * POST /config/toml
 */
export async function get_config_toml(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config/toml";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetContext: Retrieves detailed information about a specific context by its unique identifier, including conditions, overrides, and metadata.
 * GET /context/{id}
 */
export async function get_context(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/context/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetContextFromCondition: Retrieves context information by matching against provided conditions. Used to find contexts that would apply to specific scenarios.
 * POST /context/get
 */
export async function get_context_from_condition(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/context/get";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    if (request.body !== undefined && request.body !== null) { headers["Content-Type"] = "application/json"; body = typeof request.body === "string" ? request.body : JSON.stringify(request.body); }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetDefaultConfig: Retrieves a specific default config entry by its key, including its value, schema, function mappings, and metadata.
 * GET /default-config/{key}
 */
export async function get_default_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.key === undefined || request.key === null || request.key === "") {
      return { content: [{ type: "text", text: "Missing required parameter: key" }], isError: true };
    }
    let path = "/default-config/{key}";
    path = path.replace("{key}", encodeURIComponent(String(request.key)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetDetailedResolvedConfig: Resolves config values and returns each key with default-config metadata.
 * POST /config/resolve/detailed
 */
export async function get_detailed_resolved_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config/resolve/detailed";
    const query = new URLSearchParams();
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "version", request.version);
    append_query(query, "show_reasoning", request.show_reasoning);
    append_query(query, "context_id", request.context_id);
    append_query(query, "resolve_remote", request.resolve_remote);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.merge_strategy !== undefined && request.merge_strategy !== null) headers["x-merge-strategy"] = String(request.merge_strategy);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetDimension: Retrieves detailed information about a specific dimension, including its schema, cohort dependency graph, and configuration metadata.
 * GET /dimension/{dimension}
 */
export async function get_dimension(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.dimension === undefined || request.dimension === null || request.dimension === "") {
      return { content: [{ type: "text", text: "Missing required parameter: dimension" }], isError: true };
    }
    let path = "/dimension/{dimension}";
    path = path.replace("{dimension}", encodeURIComponent(String(request.dimension)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetExperiment: Retrieves detailed information about a specific experiment, including its config, variants, status, and metrics.
 * GET /experiments/{id}
 */
export async function get_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/experiments/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetExperimentConfig: Retrieves the experiment configuration for a given workspace and organization. The response includes details of all experiment groups and experiments that match the specified filters.
 * POST /experiment-config
 */
export async function get_experiment_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/experiment-config";
    const query = new URLSearchParams();
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "dimension_match_strategy", request.dimension_match_strategy);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetExperimentGroup: Retrieves an existing experiment group by its ID.
 * GET /experiment-groups/{id}
 */
export async function get_experiment_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/experiment-groups/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetFunction: Retrieves detailed information about a specific function including its published and draft versions, code, and metadata.
 * GET /function/{function_name}
 */
export async function get_function(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null || request.function_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    let path = "/function/{function_name}";
    path = path.replace("{function_name}", encodeURIComponent(String(request.function_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetOrganisation: Retrieves detailed information about a specific organisation including its status, contact details, and administrative metadata.
 * GET /superposition/organisations/{id}
 */
export async function get_organisation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/superposition/organisations/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (orgId) headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetResolvedConfig: Resolves and merges config values based on context conditions, applying overrides and merge strategies to produce the final configuration.
 * POST /config/resolve
 */
export async function get_resolved_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config/resolve";
    const query = new URLSearchParams();
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "version", request.version);
    append_query(query, "show_reasoning", request.show_reasoning);
    append_query(query, "context_id", request.context_id);
    append_query(query, "resolve_remote", request.resolve_remote);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.merge_strategy !== undefined && request.merge_strategy !== null) headers["x-merge-strategy"] = String(request.merge_strategy);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetResolvedConfigExplanation: Explains how matching contexts affect a single resolved config key.
 * POST /config/resolve/explain/{key}
 */
export async function get_resolved_config_explanation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.key === undefined || request.key === null || request.key === "") {
      return { content: [{ type: "text", text: "Missing required parameter: key" }], isError: true };
    }
    let path = "/config/resolve/explain/{key}";
    path = path.replace("{key}", encodeURIComponent(String(request.key)));
    const query = new URLSearchParams();
    append_query(query, "version", request.version);
    append_query(query, "context_id", request.context_id);
    append_query(query, "resolve_remote", request.resolve_remote);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.merge_strategy !== undefined && request.merge_strategy !== null) headers["x-merge-strategy"] = String(request.merge_strategy);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetResolvedConfigWithIdentifier: Resolves and merges config values based on context conditions and identifier, applying overrides and merge strategies to produce the final configuration.
 * POST /resolve
 */
export async function get_resolved_config_with_identifier(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/resolve";
    const query = new URLSearchParams();
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "version", request.version);
    append_query(query, "show_reasoning", request.show_reasoning);
    append_query(query, "context_id", request.context_id);
    append_query(query, "resolve_remote", request.resolve_remote);
    append_query(query, "identifier", request.identifier);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.merge_strategy !== undefined && request.merge_strategy !== null) headers["x-merge-strategy"] = String(request.merge_strategy);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetSecret: Retrieves detailed information about a specific secret by its name. The value is masked for security.
 * GET /secrets/{name}
 */
export async function get_secret(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/secrets/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetTypeTemplate: Retrieves detailed information about a specific type template including its schema and metadata.
 * GET /types/{type_name}
 */
export async function get_type_template(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.type_name === undefined || request.type_name === null || request.type_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: type_name" }], isError: true };
    }
    let path = "/types/{type_name}";
    path = path.replace("{type_name}", encodeURIComponent(String(request.type_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetTypeTemplatesList: Retrieves a paginated list of all type templates in the workspace, including their schemas and metadata for type management.
 * GET /types
 */
export async function get_type_templates_list(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/types";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetVariable: Retrieves detailed information about a specific variable by its name.
 * GET /variables/{name}
 */
export async function get_variable(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/variables/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetVersion: Retrieves a specific config version along with its metadata for audit and rollback purposes.
 * GET /version/{id}
 */
export async function get_version(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/version/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetWebhook: Retrieves detailed information about a specific webhook config, including its events, headers, and trigger history.
 * GET /webhook/{name}
 */
export async function get_webhook(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    let path = "/webhook/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetWebhookByEvent: Retrieves a webhook configuration based on a specific event type, allowing users to find which webhook is set to trigger for that event.
 * GET /webhook/event/{event}
 */
export async function get_webhook_by_event(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.event === undefined || request.event === null || request.event === "") {
      return { content: [{ type: "text", text: "Missing required parameter: event" }], isError: true };
    }
    let path = "/webhook/event/{event}";
    path = path.replace("{event}", encodeURIComponent(String(request.event)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * GetWorkspace: Retrieves detailed information about a specific workspace including its configuration and metadata.
 * GET /workspaces/{workspace_name}
 */
export async function get_workspace(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.workspace_name === undefined || request.workspace_name === null || request.workspace_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_name" }], isError: true };
    }
    let path = "/workspaces/{workspace_name}";
    path = path.replace("{workspace_name}", encodeURIComponent(String(request.workspace_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListAuditLogs: Retrieves a paginated list of audit logs with support for filtering by date range, table names, actions, and usernames for compliance and monitoring purposes.
 * GET /audit
 */
export async function list_audit_logs(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/audit";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "from_date", request.from_date);
    append_query(query, "to_date", request.to_date);
    append_query(query, "table", request.table);
    append_query(query, "action", request.action);
    append_query(query, "username", request.username);
    append_query(query, "sort_by", request.sort_by);
    append_query(query, "dimension_params", request.dimension_params);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListContexts: Retrieves a paginated list of contexts with support for filtering by creation date, modification date, weight, and other criteria.
 * GET /context
 */
export async function list_contexts(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/context";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "sort_on", request.sort_on);
    append_query(query, "sort_by", request.sort_by);
    append_query(query, "created_by", request.created_by);
    append_query(query, "last_modified_by", request.last_modified_by);
    append_query(query, "plaintext", request.plaintext);
    append_query(query, "dimension_match_strategy", request.dimension_match_strategy);
    append_query(query, "dimension_params", request.dimension_params);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListDefaultConfigs: Retrieves a paginated list of all default config entries in the workspace, including their values, schemas, and metadata.
 * GET /default-config
 */
export async function list_default_configs(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/default-config";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "name", request.name);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListDimensions: Retrieves a paginated list of all dimensions in the workspace. Dimensions are returned with their details and metadata.
 * GET /dimension
 */
export async function list_dimensions(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/dimension";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListExperiment: Retrieves a paginated list of experiments with support for filtering by status, date range, name, creator, and experiment group.
 * POST /experiments/list
 */
export async function list_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/experiments/list";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "status", request.status);
    append_query(query, "from_date", request.from_date);
    append_query(query, "to_date", request.to_date);
    append_query(query, "experiment_name", request.experiment_name);
    append_query(query, "experiment_ids", request.experiment_ids);
    append_query(query, "experiment_group_ids", request.experiment_group_ids);
    append_query(query, "created_by", request.created_by);
    append_query(query, "sort_on", request.sort_on);
    append_query(query, "sort_by", request.sort_by);
    append_query(query, "global_experiments_only", request.global_experiments_only);
    append_query(query, "dimension_match_strategy", request.dimension_match_strategy);
    append_query(query, "prefix", request.prefix);
    append_query(query, "exclude_prefix", request.exclude_prefix);
    append_query(query, "dimension_params", request.dimension_params);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListExperimentGroups: Lists experiment groups, with support for filtering and pagination.
 * POST /experiment-groups/list
 */
export async function list_experiment_groups(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/experiment-groups/list";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "name", request.name);
    append_query(query, "created_by", request.created_by);
    append_query(query, "last_modified_by", request.last_modified_by);
    append_query(query, "sort_on", request.sort_on);
    append_query(query, "sort_by", request.sort_by);
    append_query(query, "group_type", request.group_type);
    append_query(query, "dimension_match_strategy", request.dimension_match_strategy);
    append_query(query, "dimension_params", request.dimension_params);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.if_modified_since !== undefined && request.if_modified_since !== null) headers["if-modified-since"] = String(request.if_modified_since);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListFunction: Retrieves a paginated list of all functions in the workspace with their basic information and current status.
 * GET /function
 */
export async function list_function(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/function";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "function_type", request.function_type);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListOrganisation: Retrieves a paginated list of all organisations with their basic information, creation details, and current status.
 * GET /superposition/organisations
 */
export async function list_organisation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/superposition/organisations";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (orgId) headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListSecrets: Retrieves a paginated list of all secrets in the workspace with optional filtering and sorting. All secret values are masked.
 * GET /secrets
 */
export async function list_secrets(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/secrets";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "name", request.name);
    append_query(query, "created_by", request.created_by);
    append_query(query, "last_modified_by", request.last_modified_by);
    append_query(query, "sort_on", request.sort_on);
    append_query(query, "sort_by", request.sort_by);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListVariables: Retrieves a paginated list of all variables in the workspace with optional filtering and sorting.
 * GET /variables
 */
export async function list_variables(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/variables";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    append_query(query, "name", request.name);
    append_query(query, "created_by", request.created_by);
    append_query(query, "last_modified_by", request.last_modified_by);
    append_query(query, "sort_on", request.sort_on);
    append_query(query, "sort_by", request.sort_by);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListVersions: Retrieves a paginated list of config versions with their metadata, hash values, and creation timestamps for audit and rollback purposes.
 * GET /config/versions
 */
export async function list_versions(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/config/versions";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListWebhook: Retrieves a paginated list of all webhook configs in the workspace, including their status and config details.
 * GET /webhook
 */
export async function list_webhook(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/webhook";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ListWorkspace: Retrieves a paginated list of all workspaces with optional filtering by workspace name, including their status, config details, and administrative information.
 * GET /workspaces
 */
export async function list_workspace(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/workspaces";
    const query = new URLSearchParams();
    append_query(query, "count", request.count);
    append_query(query, "page", request.page);
    append_query(query, "all", request.all);
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "GET", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * MigrateWorkspaceSchema: Migrates the workspace database schema to the new version of the template
 * POST /workspaces/{workspace_name}/db/migrate
 */
export async function migrate_workspace_schema(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.workspace_name === undefined || request.workspace_name === null || request.workspace_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_name" }], isError: true };
    }
    let path = "/workspaces/{workspace_name}/db/migrate";
    path = path.replace("{workspace_name}", encodeURIComponent(String(request.workspace_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * MoveContext: Updates the condition of the mentioned context, if a context with the new condition already exists, it merges the override and effectively deleting the old context
 * PUT /context/move/{id}
 */
export async function move_context(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/context/move/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PUT", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * PauseExperiment: Temporarily pauses an inprogress experiment, suspending its effects while preserving the experiment config for later resumption.
 * PATCH /experiments/{id}/pause
 */
export async function pause_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments/{id}/pause";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * Publish: Publishes the draft version of a function, making it the active version used for value_validation, value_compute, context_validation or change_reason_validation in the system.
 * PATCH /function/{function_name}/publish
 */
export async function publish(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null || request.function_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/function/{function_name}/publish";
    path = path.replace("{function_name}", encodeURIComponent(String(request.function_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * RampExperiment: Adjusts the traffic percentage allocation for an in-progress experiment, allowing gradual rollout or rollback of experimental features.
 * PATCH /experiments/{id}/ramp
 */
export async function ramp_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    if (request.traffic_percentage === undefined || request.traffic_percentage === null) {
      return { content: [{ type: "text", text: "Missing required parameter: traffic_percentage" }], isError: true };
    }
    let path = "/experiments/{id}/ramp";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.traffic_percentage !== undefined) { payload["traffic_percentage"] = request.traffic_percentage; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * RemoveMembersFromGroup: Removes members from an existing experiment group.
 * PATCH /experiment-groups/{id}/remove-members
 */
export async function remove_members_from_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    if (request.member_experiment_ids === undefined || request.member_experiment_ids === null) {
      return { content: [{ type: "text", text: "Missing required parameter: member_experiment_ids" }], isError: true };
    }
    let path = "/experiment-groups/{id}/remove-members";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.member_experiment_ids !== undefined) { payload["member_experiment_ids"] = request.member_experiment_ids; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ResumeExperiment: Resumes a previously paused experiment, restoring its in-progress state and re-enabling variant evaluation.
 * PATCH /experiments/{id}/resume
 */
export async function resume_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments/{id}/resume";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * RotateMasterEncryptionKey: Rotates the master encryption key across all workspaces
 * POST /master-encryption-key/rotate
 */
export async function rotate_master_encryption_key(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/master-encryption-key/rotate";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (orgId) headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * RotateWorkspaceEncryptionKey: Rotates the workspace encryption key. Generates a new encryption key and re-encrypts all secrets with the new key. This is a critical operation that should be done during low-traffic periods.
 * POST /workspaces/{workspace_name}/rotate-encryption-key
 */
export async function rotate_workspace_encryption_key(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.workspace_name === undefined || request.workspace_name === null || request.workspace_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_name" }], isError: true };
    }
    let path = "/workspaces/{workspace_name}/rotate-encryption-key";
    path = path.replace("{workspace_name}", encodeURIComponent(String(request.workspace_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * Test: Executes a function in test mode with provided input parameters to validate its behavior before publishing or deployment.
 * POST /function/{function_name}/{stage}/test
 */
export async function test(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null || request.function_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    if (request.stage === undefined || request.stage === null || request.stage === "") {
      return { content: [{ type: "text", text: "Missing required parameter: stage" }], isError: true };
    }
    if (request.body === undefined || request.body === null) {
      return { content: [{ type: "text", text: "Missing required parameter: body" }], isError: true };
    }
    let path = "/function/{function_name}/{stage}/test";
    path = path.replace("{function_name}", encodeURIComponent(String(request.function_name)));
    path = path.replace("{stage}", encodeURIComponent(String(request.stage)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    if (request.body !== undefined && request.body !== null) { headers["Content-Type"] = "application/json"; body = typeof request.body === "string" ? request.body : JSON.stringify(request.body); }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "POST", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateDefaultConfig: Updates an existing default config entry. Allows modification of value, schema, function mappings, and description while preserving the key identifier.
 * PATCH /default-config/{key}
 */
export async function update_default_config(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.key === undefined || request.key === null || request.key === "") {
      return { content: [{ type: "text", text: "Missing required parameter: key" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/default-config/{key}";
    path = path.replace("{key}", encodeURIComponent(String(request.key)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.schema !== undefined) { payload["schema"] = request.schema; hasPayload = true; }
      if (request.value_validation_function_name !== undefined) { payload["value_validation_function_name"] = request.value_validation_function_name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.value_compute_function_name !== undefined) { payload["value_compute_function_name"] = request.value_compute_function_name; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateDimension: Updates an existing dimension's configuration. Allows modification of schema, position, function mappings, and other properties while maintaining dependency relationships.
 * PATCH /dimension/{dimension}
 */
export async function update_dimension(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.dimension === undefined || request.dimension === null || request.dimension === "") {
      return { content: [{ type: "text", text: "Missing required parameter: dimension" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/dimension/{dimension}";
    path = path.replace("{dimension}", encodeURIComponent(String(request.dimension)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.schema !== undefined) { payload["schema"] = request.schema; hasPayload = true; }
      if (request.position !== undefined) { payload["position"] = request.position; hasPayload = true; }
      if (request.value_validation_function_name !== undefined) { payload["value_validation_function_name"] = request.value_validation_function_name; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.value_compute_function_name !== undefined) { payload["value_compute_function_name"] = request.value_compute_function_name; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateExperimentGroup: Updates an existing experiment group. Allows partial updates to specified fields.
 * PATCH /experiment-groups/{id}
 */
export async function update_experiment_group(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiment-groups/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.traffic_percentage !== undefined) { payload["traffic_percentage"] = request.traffic_percentage; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateFunction: Updates the draft version of an existing function with new code, runtime version, or description while preserving the published version.
 * PATCH /function/{function_name}
 */
export async function update_function(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.function_name === undefined || request.function_name === null || request.function_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: function_name" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/function/{function_name}";
    path = path.replace("{function_name}", encodeURIComponent(String(request.function_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.function !== undefined) { payload["function"] = request.function; hasPayload = true; }
      if (request.runtime_version !== undefined) { payload["runtime_version"] = request.runtime_version; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateOrganisation: Updates an existing organisation's information including contact details, status, and administrative properties.
 * PATCH /superposition/organisations/{id}
 */
export async function update_organisation(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    let path = "/superposition/organisations/{id}";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (orgId) headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.country_code !== undefined) { payload["country_code"] = request.country_code; hasPayload = true; }
      if (request.contact_email !== undefined) { payload["contact_email"] = request.contact_email; hasPayload = true; }
      if (request.contact_phone !== undefined) { payload["contact_phone"] = request.contact_phone; hasPayload = true; }
      if (request.admin_email !== undefined) { payload["admin_email"] = request.admin_email; hasPayload = true; }
      if (request.sector !== undefined) { payload["sector"] = request.sector; hasPayload = true; }
      if (request.status !== undefined) { payload["status"] = request.status; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateOverride: Updates the overrides for an existing context. Allows modification of override values while maintaining the context's conditions.
 * PATCH /context/overrides
 */
export async function update_override(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    if (request.override === undefined || request.override === null) {
      return { content: [{ type: "text", text: "Missing required parameter: override" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/context/overrides";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (request.override !== undefined) { payload["override"] = request.override; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateOverridesExperiment: Updates the overrides for specific variants within an experiment, allowing modification of experiment behavior Updates the overrides for specific variants within an experiment, allowing modification o
 * PATCH /experiments/{id}/overrides
 */
export async function update_overrides_experiment(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.id === undefined || request.id === null || request.id === "") {
      return { content: [{ type: "text", text: "Missing required parameter: id" }], isError: true };
    }
    if (request.variant_list === undefined || request.variant_list === null) {
      return { content: [{ type: "text", text: "Missing required parameter: variant_list" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/experiments/{id}/overrides";
    path = path.replace("{id}", encodeURIComponent(String(request.id)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.variant_list !== undefined) { payload["variant_list"] = request.variant_list; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (request.metrics !== undefined) { payload["metrics"] = request.metrics; hasPayload = true; }
      if (request.experiment_group_id !== undefined) { payload["experiment_group_id"] = request.experiment_group_id; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateSecret: Updates an existing secret's value or description. The value is re-encrypted with the current workspace encryption key. Returns masked value.
 * PATCH /secrets/{name}
 */
export async function update_secret(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/secrets/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateTypeTemplates: Updates an existing type template's schema definition and metadata while preserving its identifier and usage history.
 * PATCH /types/{type_name}
 */
export async function update_type_templates(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.type_name === undefined || request.type_name === null || request.type_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: type_name" }], isError: true };
    }
    if (request.type_schema === undefined || request.type_schema === null) {
      return { content: [{ type: "text", text: "Missing required parameter: type_schema" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/types/{type_name}";
    path = path.replace("{type_name}", encodeURIComponent(String(request.type_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.type_schema !== undefined) { payload["type_schema"] = request.type_schema; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateVariable: Updates an existing variable's value, description, or tags.
 * PATCH /variables/{name}
 */
export async function update_variable(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/variables/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.value !== undefined) { payload["value"] = request.value; hasPayload = true; }
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateWebhook: Updates an existing webhook config, allowing modification of URL, events, headers, and other webhook properties.
 * PATCH /webhook/{name}
 */
export async function update_webhook(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.name === undefined || request.name === null || request.name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: name" }], isError: true };
    }
    if (request.change_reason === undefined || request.change_reason === null) {
      return { content: [{ type: "text", text: "Missing required parameter: change_reason" }], isError: true };
    }
    let path = "/webhook/{name}";
    path = path.replace("{name}", encodeURIComponent(String(request.name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.description !== undefined) { payload["description"] = request.description; hasPayload = true; }
      if (request.enabled !== undefined) { payload["enabled"] = request.enabled; hasPayload = true; }
      if (request.url !== undefined) { payload["url"] = request.url; hasPayload = true; }
      if (request.method !== undefined) { payload["method"] = request.method; hasPayload = true; }
      if (request.version !== undefined) { payload["version"] = request.version; hasPayload = true; }
      if (request.custom_headers !== undefined) { payload["custom_headers"] = request.custom_headers; hasPayload = true; }
      if (request.events !== undefined) { payload["events"] = request.events; hasPayload = true; }
      if (request.change_reason !== undefined) { payload["change_reason"] = request.change_reason; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * UpdateWorkspace: Updates an existing workspace configuration, allowing modification of admin settings, mandatory dimensions, and workspace properties. Validates config version existence if provided.
 * PATCH /workspaces/{workspace_name}
 */
export async function update_workspace(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.workspace_name === undefined || request.workspace_name === null || request.workspace_name === "") {
      return { content: [{ type: "text", text: "Missing required parameter: workspace_name" }], isError: true };
    }
    let path = "/workspaces/{workspace_name}";
    path = path.replace("{workspace_name}", encodeURIComponent(String(request.workspace_name)));
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.workspace_admin_email !== undefined) { payload["workspace_admin_email"] = request.workspace_admin_email; hasPayload = true; }
      if (request.config_version !== undefined) { payload["config_version"] = request.config_version; hasPayload = true; }
      if (request.mandatory_dimensions !== undefined) { payload["mandatory_dimensions"] = request.mandatory_dimensions; hasPayload = true; }
      if (request.workspace_status !== undefined) { payload["workspace_status"] = request.workspace_status; hasPayload = true; }
      if (request.metrics !== undefined) { payload["metrics"] = request.metrics; hasPayload = true; }
      if (request.allow_experiment_self_approval !== undefined) { payload["allow_experiment_self_approval"] = request.allow_experiment_self_approval; hasPayload = true; }
      if (request.auto_populate_control !== undefined) { payload["auto_populate_control"] = request.auto_populate_control; hasPayload = true; }
      if (request.enable_context_validation !== undefined) { payload["enable_context_validation"] = request.enable_context_validation; hasPayload = true; }
      if (request.enable_change_reason_validation !== undefined) { payload["enable_change_reason_validation"] = request.enable_change_reason_validation; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PATCH", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * ValidateContext: Validates if a given context condition is well-formed
 * PUT /context/validate
 */
export async function validate_context(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    if (request.context === undefined || request.context === null) {
      return { content: [{ type: "text", text: "Missing required parameter: context" }], isError: true };
    }
    let path = "/context/validate";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    let body: string | undefined = undefined;
    {
      const payload: Record<string, any> = {};
      let hasPayload = false;
      if (request.context !== undefined) { payload["context"] = request.context; hasPayload = true; }
      if (hasPayload) { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
    }
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PUT", headers, body });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

/**
 * WeightRecompute: Recalculates and updates the priority weights for all contexts in the workspace based on their dimensions.
 * PUT /context/weight/recompute
 */
export async function weight_recompute(request: any, env: SuperpositionEnv): Promise<MCPResult> {
  try {
    const baseUrl = get_base_url(env);
    let path = "/context/weight/recompute";
    const query = new URLSearchParams();
    const qs = query.toString();
    const headers: Record<string, string> = { "Accept": "application/json" };
    const orgId = resolve_org(request, env);
    const workspace = resolve_workspace(request, env);
    if (!orgId) { return { content: [{ type: "text", text: "Organisation ID is required. Pass org_id or set SUPERPOSITION_ORG_ID env." }], isError: true }; }
    headers["x-org-id"] = String(orgId);
    if (workspace) headers["x-workspace"] = String(workspace);
    if (request.config_tags !== undefined && request.config_tags !== null) headers["x-config-tags"] = String(request.config_tags);
    const response = await fetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, { method: "PUT", headers });
    return handle_response(response);
  } catch (error) {
    return { content: [{ type: "text", text: `Error calling Superposition API: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}

