// Jilebi Machines plugin.
//
// Exposes Jilebi microVM lifecycle, routes and SSH keys as MCP tools.
// Runs inside the Jilebi plugin runtime (deno_core), so this file must not
// import Node.js or npm modules. Use the global `fetch` only.

type MachinesEnv = Environment & { JILEBI_API_KEY?: string };
type ToolArgs = Record<string, any>;

interface McpTextContent {
	type: "text";
	text: string;
}

interface McpResult {
	content: McpTextContent[];
	isError?: boolean;
}

interface ApiVm {
	id: string;
	user_id: string;
	machine_name: string;
	network_name: string | null;
	node_name: string;
	hypervisor_socket: string | null;
	ip_address: string | null;
	cpu_count: number;
	memory_size: number;
	disk_size_gb: number;
	state: "active" | "paused" | "offline";
	created_at: string;
	updated_at: string;
}

interface ApiVmGetResponse extends ApiVm {
	vm_info: {
		config: Record<string, unknown>;
		state: "Created" | "Running" | "Shutdown" | "Paused";
		memory_actual_size?: number | null;
		device_tree?: Record<string, unknown> | null;
	};
}

interface ApiVmCreateResponse {
	id: string;
	node_name: string;
	network_name: string;
	hypervisor_socket: string;
}

interface ApiVmCloneResponse extends ApiVmCreateResponse {
	new_name: string;
}

interface ApiSuccess {
	success?: boolean;
	message?: string;
}

interface ApiRoute {
	id: string;
	name: string;
	microvm_id: string;
	privacy: "private" | "public" | "shared";
	port: number;
	user_ids: string[];
	machine_name: string;
	machine_user_id: string;
	node_name: string;
	ip_address: string | null;
	owner_username: string | null;
	owner_email: string;
	created_at: string;
	updated_at: string;
	url: string;
	shared_users: Array<{ email?: string; name?: string }>;
}

interface ApiRouteListResponse {
	owned: ApiRoute[];
	shared: ApiRoute[];
}

interface ApiRouteCreateResponse {
	id: string;
	name: string;
	microvm_id: string;
	privacy: "private" | "public" | "shared";
	port: number;
	url: string;
	shared_users: Array<{ email?: string; name?: string }>;
}

interface ApiSshKey {
	id: string;
	name: string | null;
	publicKey: string;
	fingerprint: string | null;
	type: string | null;
	createdAt: string;
}

interface ApiSshKeyCreateResponse {
	id: string;
	type: "uploaded" | "generated";
	publicKey: string;
	fingerprint: string;
	privateKey?: string;
}

const API_BASE = "https://jilebi.ai";
const MACHINE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;
const CLONE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ROUTE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class UserError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserError";
	}
}

class ApiError extends Error {
	status: number;
	code?: string;
	body?: unknown;

	constructor(status: number, message: string, code?: string, body?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.body = body;
	}
}

const HTTP_HINTS: Record<number, string> = {
	400: "The request was rejected as invalid. Check the machine/route names, sizes, ports and email addresses.",
	401: "The JILEBI_API_KEY is missing or invalid. Set it with `jilebi plugins env jilebi-machines` and restart the Jilebi server.",
	402: "The account has an overdue unpaid invoice. Settle it at https://jilebi.ai before creating or starting machines.",
	404: "The machine, route or key was not found. Use the list tools to see what currently exists.",
	409: "The name is already taken, or no node has free capacity. Choose another name or retry.",
	500: "The Jilebi API hit an internal error. Retry in a moment.",
};

function asArgs(request: unknown): ToolArgs {
	if (request && typeof request === "object" && !Array.isArray(request)) {
		return request as ToolArgs;
	}
	return {};
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function ok(text: string): McpResult {
	return { content: [{ type: "text", text }] };
}

function failure(error: unknown): McpResult {
	let text: string;
	if (error instanceof ApiError) {
		const hint = HTTP_HINTS[error.status];
		text = `${error.message}${error.code ? ` (${error.code})` : ""}${hint ? `\n\n${hint}` : ""}`;
	} else {
		text = errorMessage(error);
	}
	return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}

async function apiRequest<T = any>(
	env: MachinesEnv,
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	const apiKey = env.JILEBI_API_KEY;
	if (typeof apiKey !== "string" || apiKey.trim() === "") {
		throw new UserError(
			"JILEBI_API_KEY is not configured. Create an API key at https://jilebi.ai and set it with `jilebi plugins env jilebi-machines`, then restart the Jilebi server.",
		);
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${apiKey.trim()}`,
		Accept: "application/json",
	};
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}

	let response: Response;
	try {
		response = await fetch(`${API_BASE}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch (error) {
		throw new UserError(`Could not reach ${API_BASE}: ${errorMessage(error)}`);
	}

	const raw = await response.text();
	let data: any = undefined;
	if (raw.length > 0) {
		try {
			data = JSON.parse(raw);
		} catch {
			data = raw;
		}
	}

	if (!response.ok) {
		const message =
			data && typeof data === "object" && typeof data.error === "string"
				? data.error
				: `Jilebi API returned HTTP ${response.status} ${response.statusText}`;
		const code =
			data && typeof data === "object" && typeof data.code === "string"
				? data.code
				: undefined;
		throw new ApiError(response.status, message, code, data);
	}

	return data as T;
}

function requiredString(args: ToolArgs, field: string): string {
	const value = args[field];
	if (typeof value !== "string" || value.trim() === "") {
		throw new UserError(`${field} is required.`);
	}
	return value.trim();
}

function optionalString(args: ToolArgs, field: string): string | undefined {
	const value = args[field];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string") {
		throw new UserError(`${field} must be a string.`);
	}
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function optionalInteger(
	args: ToolArgs,
	field: string,
	min: number,
	max: number,
): number | undefined {
	const value = args[field];
	if (value === undefined || value === null || value === "") return undefined;
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed)) {
		throw new UserError(`${field} must be an integer.`);
	}
	if (parsed < min || parsed > max) {
		throw new UserError(`${field} must be between ${min} and ${max}.`);
	}
	return parsed;
}

function integerOrDefault(
	args: ToolArgs,
	field: string,
	fallback: number,
	min: number,
	max: number,
): number {
	return optionalInteger(args, field, min, max) ?? fallback;
}

function stringArray(args: ToolArgs, field: string): string[] | undefined {
	const value = args[field];
	if (value === undefined || value === null) return undefined;
	const list = Array.isArray(value) ? value : [value];
	return list.map((item) => {
		if (typeof item !== "string" || item.trim() === "") {
			throw new UserError(`${field} must be an array of non-empty strings.`);
		}
		return item;
	});
}

function emailArray(args: ToolArgs, field: string): string[] | undefined {
	const list = stringArray(args, field);
	if (list === undefined) return undefined;
	for (const email of list) {
		if (!EMAIL_PATTERN.test(email)) {
			throw new UserError(`${field} contains an invalid email address: ${email}`);
		}
	}
	return list;
}

function optionalEnum<T extends string>(
	args: ToolArgs,
	field: string,
	allowed: readonly T[],
	fallback?: T,
): T | undefined {
	const value = args[field];
	if (value === undefined || value === null || value === "") return fallback;
	if (typeof value !== "string" || !allowed.includes(value as T)) {
		throw new UserError(`${field} must be one of: ${allowed.join(", ")}.`);
	}
	return value as T;
}

function machineName(args: ToolArgs, field = "machine_name"): string {
	const value = requiredString(args, field);
	if (!MACHINE_NAME_PATTERN.test(value)) {
		throw new UserError(
			`${field} must be 1-63 characters and use only letters, digits, hyphens or underscores.`,
		);
	}
	return value;
}

function routeName(args: ToolArgs): string {
	const value = requiredString(args, "name");
	if (!ROUTE_NAME_PATTERN.test(value)) {
		throw new UserError(
			"name must be 1-63 characters, use lowercase letters, digits and hyphens, and start/end with a letter or digit.",
		);
	}
	return value;
}

function machineSummary(machine: ApiVm): string {
	const ip = machine.ip_address ? ` ip=${machine.ip_address}` : "";
	return `- ${machine.machine_name} [${machine.state}] ${machine.cpu_count} vCPU / ${machine.memory_size} MiB / ${machine.disk_size_gb} GiB${ip} (id: ${machine.id})`;
}

async function resolveMachineId(env: MachinesEnv, name: string): Promise<string> {
	const machines = await apiRequest<ApiVm[]>(env, "GET", "/api/v1/vmm");
	const match =
		machines.find((machine) => machine.machine_name === name) ??
		machines.find(
			(machine) => machine.machine_name.toLowerCase() === name.toLowerCase(),
		);
	if (!match) {
		const available = machines.map((machine) => machine.machine_name);
		throw new UserError(
			`No machine named "${name}". Available machines: ${available.length > 0 ? available.join(", ") : "(none)"}.`,
		);
	}
	return match.id;
}

async function resolvePublicKey(env: MachinesEnv, args: ToolArgs): Promise<string> {
	const publicKey = optionalString(args, "public_key");
	if (publicKey) return publicKey;

	const keyId = optionalString(args, "ssh_key_id");
	const keys = await apiRequest<ApiSshKey[]>(env, "GET", "/api/v1/keys");
	if (keyId) {
		const key = keys.find((candidate) => candidate.id === keyId);
		if (!key) {
			throw new UserError(
				`No SSH key with id "${keyId}". Use list-ssh-keys to see the available keys.`,
			);
		}
		return key.publicKey;
	}

	if (keys.length === 1) {
		return keys[0].publicKey;
	}

	throw new UserError(
		keys.length === 0
			? "No SSH key is available. Add one with add-ssh-key (upload a public key or generate a key pair), then create the machine with its ssh_key_id."
			: "Provide ssh_key_id (from list-ssh-keys) or public_key. The account has multiple saved keys, so the plugin will not guess.",
	);
}

// ---------------------------------------------------------------------------
// MicroVMs
// ---------------------------------------------------------------------------

export const list_machines = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const state = optionalEnum(args, "state", [
			"active",
			"paused",
			"offline",
		] as const);
		const machines = await apiRequest<ApiVm[]>(
			env as MachinesEnv,
			"GET",
			"/api/v1/vmm",
		);
		const filtered = state
			? machines.filter((machine) => machine.state === state)
			: machines;
		const summary =
			filtered.length === 0
				? "No machines found."
				: `Found ${filtered.length} machine(s):\n${filtered.map(machineSummary).join("\n")}`;
		return ok(`${summary}\n\n${JSON.stringify(filtered, null, 2)}`);
	} catch (error) {
		return failure(error);
	}
};

export const get_machine = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const name = machineName(asArgs(request));
		const machine = await apiRequest<ApiVmGetResponse>(
			env as MachinesEnv,
			"GET",
			`/api/v1/vmm/${encodeURIComponent(name)}`,
		);
		return ok(JSON.stringify(machine, null, 2));
	} catch (error) {
		return failure(error);
	}
};

export const create_machine = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const name = machineName(args);
		const publicKey = await resolvePublicKey(env as MachinesEnv, args);
		const body: Record<string, unknown> = {
			cloudinit_user_data: stringArray(args, "cloudinit_user_data") ?? [],
			public_key: publicKey,
			cpu_count: integerOrDefault(args, "cpu_count", 2, 1, 16),
			memory_size: integerOrDefault(args, "memory_size", 2048, 128, 16384),
			disk_size_gb: integerOrDefault(args, "disk_size_gb", 50, 1, 65),
		};
		const softwareIds = stringArray(args, "software_ids");
		if (softwareIds && softwareIds.length > 0) {
			body.software_ids = softwareIds;
		}

		const machine = await apiRequest<ApiVmCreateResponse>(
			env as MachinesEnv,
			"POST",
			`/api/v1/vmm/${encodeURIComponent(name)}`,
			body,
		);
		return ok(
			`Created microVM "${name}".\n\n${JSON.stringify(machine, null, 2)}\n\nProvisioning is asynchronous. Use get-machine to check when its state becomes active.`,
		);
	} catch (error) {
		return failure(error);
	}
};

export const resize_machine = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const name = machineName(args);
		const body: Record<string, number> = {};
		const cpu = optionalInteger(args, "cpu_count", 1, 16);
		const memory = optionalInteger(args, "memory_size", 128, 16384);
		const disk = optionalInteger(args, "disk_size_gb", 1, 65);
		if (cpu !== undefined) body.cpu_count = cpu;
		if (memory !== undefined) body.memory_size = memory;
		if (disk !== undefined) body.disk_size_gb = disk;
		if (Object.keys(body).length === 0) {
			throw new UserError(
				"Provide at least one of cpu_count, memory_size or disk_size_gb.",
			);
		}

		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"PUT",
			`/api/v1/vmm/${encodeURIComponent(name)}`,
			body,
		);
		return ok(result?.message ?? `Resized machine "${name}".`);
	} catch (error) {
		return failure(error);
	}
};

async function machineAction(
	action: "start" | "pause" | "restart" | "shutdown",
	request: unknown,
	env: Environment,
): Promise<McpResult> {
	try {
		const name = machineName(asArgs(request));
		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"PUT",
			`/api/v1/vmm/${encodeURIComponent(name)}/${action}`,
		);
		const verb =
			action === "shutdown"
				? "shut down"
				: action === "start"
					? "started"
					: action === "pause"
						? "paused"
						: "restarted";
		return ok(result?.message ?? `Machine "${name}" ${verb}.`);
	} catch (error) {
		return failure(error);
	}
}

export const start_machine = (request: unknown, env: Environment) =>
	machineAction("start", request, env);

export const pause_machine = (request: unknown, env: Environment) =>
	machineAction("pause", request, env);

export const restart_machine = (request: unknown, env: Environment) =>
	machineAction("restart", request, env);

export const shutdown_machine = (request: unknown, env: Environment) =>
	machineAction("shutdown", request, env);

export const clone_machine = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const source = machineName(args);
		const newName = requiredString(args, "new_name");
		if (!CLONE_NAME_PATTERN.test(newName)) {
			throw new UserError(
				"new_name may only contain letters, digits, hyphens and underscores.",
			);
		}
		const body: Record<string, unknown> = { new_name: newName };
		const publicKey = optionalString(args, "public_key");
		if (publicKey) body.public_key = publicKey;

		const clone = await apiRequest<ApiVmCloneResponse>(
			env as MachinesEnv,
			"POST",
			`/api/v1/vmm/${encodeURIComponent(source)}/clone`,
			body,
		);
		return ok(
			`Cloned "${source}" to "${newName}".\n\n${JSON.stringify(clone, null, 2)}\n\nProvisioning is asynchronous. Use get-machine to check when it becomes active.`,
		);
	} catch (error) {
		return failure(error);
	}
};

export const delete_machine = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const name = machineName(asArgs(request));
		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"DELETE",
			`/api/v1/vmm/${encodeURIComponent(name)}`,
		);
		return ok(result?.message ?? `Deleted machine "${name}".`);
	} catch (error) {
		return failure(error);
	}
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const list_routes = async (
	_request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const routes = await apiRequest<ApiRouteListResponse>(
			env as MachinesEnv,
			"GET",
			"/api/v1/routes",
		);
		const owned = routes.owned ?? [];
		const shared = routes.shared ?? [];
		const ownedText =
			owned.length === 0
				? "Owned routes: none."
				: `Owned routes:\n${owned
						.map(
							(route) =>
								`- ${route.name}: ${route.url} -> ${route.machine_name}:${route.port} (${route.privacy})`,
						)
						.join("\n")}`;
		const sharedText =
			shared.length === 0
				? "Shared with you: none."
				: `Shared with you:\n${shared
						.map(
							(route) =>
								`- ${route.name}: ${route.url} -> ${route.machine_name}:${route.port} (${route.privacy}, owner ${route.owner_email})`,
						)
						.join("\n")}`;
		return ok(`${ownedText}\n\n${sharedText}\n\n${JSON.stringify(routes, null, 2)}`);
	} catch (error) {
		return failure(error);
	}
};

export const create_route = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const name = routeName(args);
		const port = optionalInteger(args, "port", 1, 65535);
		if (port === undefined) throw new UserError("port is required.");
		const privacy = optionalEnum(
			args,
			"privacy",
			["private", "public", "shared"] as const,
			"private",
		) as "private" | "public" | "shared";
		const emails = emailArray(args, "emails");
		if (privacy === "shared" && (!emails || emails.length === 0)) {
			throw new UserError("emails is required when privacy is 'shared'.");
		}

		let microvmId = optionalString(args, "microvm_id");
		const targetMachine = optionalString(args, "machine_name");
		if (!microvmId) {
			if (!targetMachine) {
				throw new UserError(
					"Provide machine_name (or microvm_id) so the route knows which machine to forward to.",
				);
			}
			microvmId = await resolveMachineId(env as MachinesEnv, targetMachine);
		}

		const body: Record<string, unknown> = {
			name,
			microvm_id: microvmId,
			port,
			privacy,
		};
		if (emails && emails.length > 0) body.emails = emails;

		const route = await apiRequest<ApiRouteCreateResponse>(
			env as MachinesEnv,
			"POST",
			"/api/v1/routes",
			body,
		);
		return ok(
			`Created route "${route.name}": ${route.url} -> ${targetMachine ?? route.microvm_id}:${route.port} (${route.privacy}).\n\n${JSON.stringify(route, null, 2)}`,
		);
	} catch (error) {
		return failure(error);
	}
};

export const update_route = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const name = routeName(args);
		const body: Record<string, unknown> = {};
		const port = optionalInteger(args, "port", 1, 65535);
		const privacy = optionalEnum(args, "privacy", [
			"private",
			"public",
			"shared",
		] as const);
		const emails = emailArray(args, "emails");
		if (port !== undefined) body.port = port;
		if (privacy !== undefined) body.privacy = privacy;
		if (emails !== undefined) body.emails = emails;
		if (Object.keys(body).length === 0) {
			throw new UserError(
				"Provide at least one of port, privacy or emails.",
			);
		}

		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"PUT",
			`/api/v1/routes/${encodeURIComponent(name)}`,
			body,
		);

		let updated: ApiRoute | undefined;
		try {
			const routes = await apiRequest<ApiRouteListResponse>(
				env as MachinesEnv,
				"GET",
				"/api/v1/routes",
			);
			updated = [...(routes.owned ?? []), ...(routes.shared ?? [])].find(
				(route) => route.name === name,
			);
		} catch {
			// The update succeeded; returning the fresh record is best-effort.
		}

		return ok(
			updated
				? `Updated route "${name}".\n\n${JSON.stringify(updated, null, 2)}`
				: (result?.message ?? `Updated route "${name}".`),
		);
	} catch (error) {
		return failure(error);
	}
};

export const delete_route = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const name = routeName(asArgs(request));
		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"DELETE",
			`/api/v1/routes/${encodeURIComponent(name)}`,
		);
		return ok(result?.message ?? `Deleted route "${name}".`);
	} catch (error) {
		return failure(error);
	}
};

// ---------------------------------------------------------------------------
// SSH keys
// ---------------------------------------------------------------------------

export const list_ssh_keys = async (
	_request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const keys = await apiRequest<ApiSshKey[]>(
			env as MachinesEnv,
			"GET",
			"/api/v1/keys",
		);
		const summary =
			keys.length === 0
				? "No SSH keys saved."
				: `Saved SSH keys:\n${keys
						.map(
							(key) =>
								`- ${key.id} ${key.name ?? "(no label)"} [${key.type ?? "unknown"}] ${key.fingerprint ?? ""}`,
						)
						.join("\n")}`;
		return ok(`${summary}\n\n${JSON.stringify(keys, null, 2)}`);
	} catch (error) {
		return failure(error);
	}
};

export const add_ssh_key = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const requestedType = optionalString(args, "type");
		const publicKey = optionalString(args, "public_key");

		let type: "upload" | "generate";
		if (requestedType !== undefined) {
			if (requestedType !== "upload" && requestedType !== "generate") {
				throw new UserError("type must be 'upload' or 'generate'.");
			}
			type = requestedType;
		} else if (publicKey) {
			type = "upload";
		} else {
			throw new UserError(
				"Provide public_key to upload an existing key, or set type to 'generate' to create a new key pair.",
			);
		}
		if (type === "upload" && !publicKey) {
			throw new UserError("public_key is required when type is 'upload'.");
		}

		const body: Record<string, unknown> = { type };
		const name = optionalString(args, "name");
		if (name) body.name = name;
		if (type === "upload") body.publicKey = publicKey;

		const key = await apiRequest<ApiSshKeyCreateResponse>(
			env as MachinesEnv,
			"POST",
			"/api/v1/keys",
			body,
		);

		if (key.privateKey) {
			return ok(
				`Generated SSH key "${key.id}".\n\nPRIVATE KEY (shown once, store it securely now):\n${key.privateKey}\n\nPublic key: ${key.publicKey}\nFingerprint: ${key.fingerprint}\n\nSave the private key to a file with mode 600 (or add it to your SSH agent). It cannot be retrieved again. Do not share it.`,
			);
		}

		return ok(
			`Added SSH key "${key.id}".\n\n${JSON.stringify({ ...key, privateKey: undefined }, null, 2)}`,
		);
	} catch (error) {
		return failure(error);
	}
};

export const rename_ssh_key = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const args = asArgs(request);
		const id = requiredString(args, "id");
		if (typeof args.name !== "string") {
			throw new UserError(
				"name is required. Use an empty string to clear the label.",
			);
		}
		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"PUT",
			`/api/v1/keys/${encodeURIComponent(id)}`,
			{ name: args.name },
		);
		return ok(result?.message ?? `Renamed SSH key "${id}".`);
	} catch (error) {
		return failure(error);
	}
};

export const delete_ssh_key = async (
	request: unknown,
	env: Environment,
): Promise<McpResult> => {
	try {
		const id = requiredString(asArgs(request), "id");
		const result = await apiRequest<ApiSuccess>(
			env as MachinesEnv,
			"DELETE",
			`/api/v1/keys/${encodeURIComponent(id)}`,
		);
		return ok(result?.message ?? `Deleted SSH key "${id}".`);
	} catch (error) {
		return failure(error);
	}
};
