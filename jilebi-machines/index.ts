// Jilebi Machines plugin.
//
// Uses the generated Jilebi TypeScript SDK (@jilebi/sdk) for microVMs, routes
// and SSH keys. Runs inside the Jilebi plugin runtime (deno_core), so the SDK
// is bundled into index.js by Rollup and only global web APIs are used.

import {
	Configuration,
	FetchError,
	MicroVMsApi,
	ResponseError,
	RoutesApi,
	SSHKeysApi,
} from "@jilebi/sdk";
import type {
	ApiRoute,
	ApiRouteCreateRequest,
	ApiRouteCreateResponse,
	ApiRouteListResponse,
	ApiRouteUpdateRequest,
	ApiSshKey,
	ApiSshKeyCreateRequest,
	ApiSshKeyCreateResponse,
	ApiSuccess,
	ApiVm,
	ApiVmCloneRequest,
	ApiVmCloneResponse,
	ApiVmCreateRequest,
	ApiVmCreateResponse,
	ApiVmGetResponse,
	ApiVmUpdateRequest,
} from "@jilebi/sdk";

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

interface Clients {
	microVms: MicroVMsApi;
	routes: RoutesApi;
	sshKeys: SSHKeysApi;
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

async function failure(error: unknown): Promise<McpResult> {
	if (error instanceof ResponseError) {
		let message =
			`Jilebi API returned HTTP ${error.response.status} ${error.response.statusText}`.trim();
		let code: string | undefined;
		try {
			const raw = await error.response.text();
			if (raw) {
				const body: any = JSON.parse(raw);
				if (body && typeof body === "object") {
					if (typeof body.error === "string") message = body.error;
					else if (typeof body.detail === "string") message = body.detail;
					if (typeof body.code === "string") code = body.code;
				}
			}
		} catch {
			// Keep the HTTP fallback when the error body is empty or not JSON.
		}
		const hint = HTTP_HINTS[error.response.status];
		return {
			content: [
				{
					type: "text",
					text: `Error: ${message}${code ? ` (${code})` : ""}${hint ? `\n\n${hint}` : ""}`,
				},
			],
			isError: true,
		};
	}

	if (error instanceof FetchError) {
		return {
			content: [
				{
					type: "text",
					text: `Error: Could not reach ${API_BASE}: ${errorMessage(error.cause)}`,
				},
			],
			isError: true,
		};
	}

	return {
		content: [{ type: "text", text: `Error: ${errorMessage(error)}` }],
		isError: true,
	};
}

function createClient(env: MachinesEnv): Clients {
	const apiKey = env.JILEBI_API_KEY;
	if (typeof apiKey !== "string" || apiKey.trim() === "") {
		throw new UserError(
			"JILEBI_API_KEY is not configured. Create an API key at https://jilebi.ai and set it with `jilebi plugins env jilebi-machines`, then restart the Jilebi server.",
		);
	}

	const configuration = new Configuration({
		basePath: API_BASE,
		apiKey: apiKey.trim(),
	});

	return {
		microVms: new MicroVMsApi(configuration),
		routes: new RoutesApi(configuration),
		sshKeys: new SSHKeysApi(configuration),
	};
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
	const ip = machine.ipAddress ? ` ip=${machine.ipAddress}` : "";
	return `- ${machine.machineName} [${machine.state}] ${machine.cpuCount} vCPU / ${machine.memorySize} MiB / ${machine.diskSizeGb} GiB${ip} (id: ${machine.id})`;
}

async function resolveMachineId(
	microVms: MicroVMsApi,
	name: string,
): Promise<string> {
	const machines = await microVms.getApiV1Vmm();
	const match =
		machines.find((machine) => machine.machineName === name) ??
		machines.find(
			(machine) => machine.machineName.toLowerCase() === name.toLowerCase(),
		);
	if (!match) {
		const available = machines.map((machine) => machine.machineName);
		throw new UserError(
			`No machine named "${name}". Available machines: ${available.length > 0 ? available.join(", ") : "(none)"}.`,
		);
	}
	return match.id;
}

async function resolvePublicKey(
	sshKeys: SSHKeysApi,
	args: ToolArgs,
): Promise<string> {
	const publicKey = optionalString(args, "public_key");
	if (publicKey) return publicKey;

	const keyId = optionalString(args, "ssh_key_id");
	const keys = await sshKeys.getApiV1Keys();
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
		const api = createClient(env as MachinesEnv);
		const machines = await api.microVms.getApiV1Vmm();
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
		const api = createClient(env as MachinesEnv);
		const machine: ApiVmGetResponse =
			await api.microVms.getApiV1VmmByMachineName({ machineName: name });
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
		const api = createClient(env as MachinesEnv);
		const publicKey = await resolvePublicKey(api.sshKeys, args);

		const createRequest: ApiVmCreateRequest = {
			cloudinitUserData: stringArray(args, "cloudinit_user_data") ?? [],
			publicKey,
			cpuCount: integerOrDefault(args, "cpu_count", 2, 1, 16),
			memorySize: integerOrDefault(args, "memory_size", 2048, 128, 16384),
			diskSizeGb: integerOrDefault(args, "disk_size_gb", 50, 1, 65),
		};
		const softwareIds = stringArray(args, "software_ids");
		if (softwareIds && softwareIds.length > 0) {
			createRequest.softwareIds = softwareIds;
		}

		const machine: ApiVmCreateResponse =
			await api.microVms.postApiV1VmmByMachineName({
				machineName: name,
				apiVmCreateRequest: createRequest,
			});
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
		const updateRequest: ApiVmUpdateRequest = {};
		const cpu = optionalInteger(args, "cpu_count", 1, 16);
		const memory = optionalInteger(args, "memory_size", 128, 16384);
		const disk = optionalInteger(args, "disk_size_gb", 1, 65);
		if (cpu !== undefined) updateRequest.cpuCount = cpu;
		if (memory !== undefined) updateRequest.memorySize = memory;
		if (disk !== undefined) updateRequest.diskSizeGb = disk;
		if (Object.keys(updateRequest).length === 0) {
			throw new UserError(
				"Provide at least one of cpu_count, memory_size or disk_size_gb.",
			);
		}

		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess = await api.microVms.putApiV1VmmByMachineName({
			machineName: name,
			apiVmUpdateRequest: updateRequest,
		});
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
		const api = createClient(env as MachinesEnv);
		const call = {
			start: () =>
				api.microVms.putApiV1VmmByMachineNameStart({ machineName: name }),
			pause: () =>
				api.microVms.putApiV1VmmByMachineNamePause({ machineName: name }),
			restart: () =>
				api.microVms.putApiV1VmmByMachineNameRestart({ machineName: name }),
			shutdown: () =>
				api.microVms.putApiV1VmmByMachineNameShutdown({ machineName: name }),
		}[action];
		const result: ApiSuccess = await call();
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
		const cloneRequest: ApiVmCloneRequest = { newName };
		const publicKey = optionalString(args, "public_key");
		if (publicKey) cloneRequest.publicKey = publicKey;

		const api = createClient(env as MachinesEnv);
		const clone: ApiVmCloneResponse =
			await api.microVms.postApiV1VmmByMachineNameClone({
				machineName: source,
				apiVmCloneRequest: cloneRequest,
			});
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
		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess =
			await api.microVms.deleteApiV1VmmByMachineName({ machineName: name });
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
		const api = createClient(env as MachinesEnv);
		const routes: ApiRouteListResponse = await api.routes.getApiV1Routes();
		const owned = routes.owned ?? [];
		const shared = routes.shared ?? [];
		const ownedText =
			owned.length === 0
				? "Owned routes: none."
				: `Owned routes:\n${owned
						.map(
							(route) =>
								`- ${route.name}: ${route.url} -> ${route.machineName}:${route.port} (${route.privacy})`,
						)
						.join("\n")}`;
		const sharedText =
			shared.length === 0
				? "Shared with you: none."
				: `Shared with you:\n${shared
						.map(
							(route) =>
								`- ${route.name}: ${route.url} -> ${route.machineName}:${route.port} (${route.privacy}, owner ${route.ownerEmail})`,
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
		const privacy =
			optionalEnum(
				args,
				"privacy",
				["private", "public", "shared"] as const,
				"private",
			) ?? "private";
		const emails = emailArray(args, "emails");
		if (privacy === "shared" && (!emails || emails.length === 0)) {
			throw new UserError("emails is required when privacy is 'shared'.");
		}

		const api = createClient(env as MachinesEnv);
		let microvmId = optionalString(args, "microvm_id");
		const targetMachine = optionalString(args, "machine_name");
		if (!microvmId) {
			if (!targetMachine) {
				throw new UserError(
					"Provide machine_name (or microvm_id) so the route knows which machine to forward to.",
				);
			}
			microvmId = await resolveMachineId(api.microVms, targetMachine);
		}

		const routeRequest: ApiRouteCreateRequest = {
			name,
			microvmId,
			port,
			privacy,
		};
		if (emails && emails.length > 0) routeRequest.emails = emails;

		const route: ApiRouteCreateResponse =
			await api.routes.postApiV1Routes({
				apiRouteCreateRequest: routeRequest,
			});
		return ok(
			`Created route "${route.name}": ${route.url} -> ${targetMachine ?? route.microvmId}:${route.port} (${route.privacy}).\n\n${JSON.stringify(route, null, 2)}`,
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
		const updateRequest: ApiRouteUpdateRequest = {};
		const port = optionalInteger(args, "port", 1, 65535);
		const privacy = optionalEnum(args, "privacy", [
			"private",
			"public",
			"shared",
		] as const);
		const emails = emailArray(args, "emails");
		if (port !== undefined) updateRequest.port = port;
		if (privacy !== undefined) updateRequest.privacy = privacy;
		if (emails !== undefined) updateRequest.emails = emails;
		if (Object.keys(updateRequest).length === 0) {
			throw new UserError("Provide at least one of port, privacy or emails.");
		}

		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess = await api.routes.putApiV1RoutesByName({
			name,
			apiRouteUpdateRequest: updateRequest,
		});

		let updated: ApiRoute | undefined;
		try {
			const routes = await api.routes.getApiV1Routes();
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
		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess = await api.routes.deleteApiV1RoutesByName({
			name,
		});
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
		const api = createClient(env as MachinesEnv);
		const keys = await api.sshKeys.getApiV1Keys();
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

		const createRequest: ApiSshKeyCreateRequest = { type };
		const name = optionalString(args, "name");
		if (name) createRequest.name = name;
		if (type === "upload") createRequest.publicKey = publicKey;

		const api = createClient(env as MachinesEnv);
		const key: ApiSshKeyCreateResponse = await api.sshKeys.postApiV1Keys({
			apiSshKeyCreateRequest: createRequest,
		});

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
		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess = await api.sshKeys.putApiV1KeysById({
			id,
			apiSshKeyUpdateRequest: { name: args.name },
		});
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
		const api = createClient(env as MachinesEnv);
		const result: ApiSuccess = await api.sshKeys.deleteApiV1KeysById({ id });
		return ok(result?.message ?? `Deleted SSH key "${id}".`);
	} catch (error) {
		return failure(error);
	}
};
