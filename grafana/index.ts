
/**
 * Grafana MCP Plugin for Jilebi
 * 
 * This plugin provides comprehensive Grafana integration including:
 * - Dashboard management (get, update, search)
 * - Datasource operations (Prometheus, Loki)
 * - Prometheus querying and metadata
 * - Loki log querying and statistics
 * - Alerting and contact points
 * - Incident management
 * - OnCall schedule management
 * - Health and version information
 * - Search functionality
 */

// Jilebi Plugin Types
interface ToolRequest {
	[key: string]: any;
}

interface ToolResponse {
	content: Array<{
		type: 'text' | 'resource';
		text?: string;
		resource?: string;
		mimeType?: string;
	}>;
	isError?: boolean;
}

// Environment configuration interface
interface GrafanaConfig {
	url: string;
	serviceAccountToken?: string;
	apiKey?: string;
	username?: string;
	password?: string;
}

// Common interfaces
interface DashboardSummary {
	uid: string;
	title: string;
	url: string;
	tags: string[];
	folderTitle?: string;
	folderUid?: string;
}

interface DatasourceInfo {
	uid: string;
	name: string;
	type: string;
	url: string;
	isDefault: boolean;
}

interface AlertRule {
	uid: string;
	title: string;
	condition: string;
	noDataState: string;
	execErrState: string;
	folderUID: string;
}

interface ContactPoint {
	uid: string;
	name: string;
	type?: string;
}

interface Incident {
	id: string;
	title: string;
	description?: string;
	status: string;
	severity?: string;
	createdAt: string;
}

interface LogEntry {
	timestamp: string;
	line?: string;
	value?: number;
	labels: Record<string, string>;
}

interface LokiStats {
	streams: number;
	chunks: number;
	entries: number;
	bytes: number;
}

// Utility function to get Grafana configuration
function getGrafanaConfig(env: Environment): GrafanaConfig {
	return {
		url: env.GRAFANA_URL || 'http://localhost:3000',
		serviceAccountToken: env.GRAFANA_SERVICE_ACCOUNT_TOKEN,
		apiKey: env.GRAFANA_API_KEY,
		username: env.GRAFANA_USERNAME,
		password: env.GRAFANA_PASSWORD
	};
}

// Utility function to handle errors consistently
function handleError(error: unknown, operation: string): ToolResponse {
	const message = error instanceof Error ? error.message : String(error);
	return {
		content: [{ type: 'text', text: `Error ${operation}: ${message}` }],
		isError: true
	};
}

// Utility function to make HTTP requests to Grafana
async function makeGrafanaRequest(
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
	config: GrafanaConfig,
	body?: any
): Promise<any> {
	const url = `${config.url.replace(/\/$/, '')}${endpoint}`;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	};

	// Authentication
	if (config.serviceAccountToken) {
		headers['Authorization'] = `Bearer ${config.serviceAccountToken}`;
	} else if (config.apiKey) {
		headers['Authorization'] = `Bearer ${config.apiKey}`;
	} else if (config.username && config.password) {
		const auth = btoa(`${config.username}:${config.password}`);
		headers['Authorization'] = `Basic ${auth}`;
	}

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

// Dashboard Tools
export async function get_dashboard_by_uid(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.uid) {
		return {
			content: [{ type: 'text', text: 'Error: uid parameter is required' }],
			isError: true
		};
	}

	const { uid } = request;

	try {
		const dashboard = await makeGrafanaRequest(`/api/dashboards/uid/${uid}`, 'GET', config);
		return {
			content: [{ type: 'text', text: JSON.stringify(dashboard, null, 2) }]
		};
	} catch (error: any) {
		return {
			content: [{ type: 'text', text: `Error fetching dashboard: ${error?.message || String(error)}` }],
			isError: true
		};
	}
}

export async function update_dashboard(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract parameters with proper validation
	const {
		dashboard,
		uid,
		operations,
		folderUid,
		message,
		overwrite = false,
		userId
	} = request;

	try {
		let dashboardData;

		if (operations && uid) {
			// Patch-based update
			const existingDashboard = await makeGrafanaRequest(`/api/dashboards/uid/${uid}`, 'GET', config);
			dashboardData = existingDashboard.dashboard;

			// Apply operations (simplified implementation)
			for (const op of operations) {
				if (op.op === 'replace' && op.path === '$.title') {
					dashboardData.title = op.value;
				}
				// Add more operation handling as needed
			}
		} else if (dashboard) {
			dashboardData = dashboard;
		} else {
			return {
				content: [{ type: 'text', text: 'Error: Either dashboard object or (uid + operations) must be provided' }],
				isError: true
			};
		}

		const payload: any = {
			dashboard: dashboardData,
			overwrite
		};

		if (folderUid) payload.folderUid = folderUid;
		if (message) payload.message = message;
		if (userId) payload.userId = userId;

		const result = await makeGrafanaRequest('/api/dashboards/db', 'POST', config, payload);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error: any) {
		return {
			content: [{ type: 'text', text: `Error updating dashboard: ${error?.message || String(error)}` }],
			isError: true
		};
	}
}

export async function search_dashboards(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { query, limit = 20 } = request;

	try {
		const params = new URLSearchParams({
			type: 'dash-db',
			...(query && { query }),
			limit: limit.toString()
		});

		const results = await makeGrafanaRequest(`/api/search?${params}`, 'GET', config);

		const dashboards: DashboardSummary[] = results.map((item: any) => ({
			uid: item.uid,
			title: item.title,
			url: item.url,
			tags: item.tags || [],
			folderTitle: item.folderTitle,
			folderUid: item.folderUid
		}));

		return {
			content: [{ type: 'text', text: JSON.stringify(dashboards, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'searching dashboards');
	}
}

// Datasource Tools
export async function get_datasource_by_uid(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.uid) {
		return {
			content: [{ type: 'text', text: 'Error: uid parameter is required' }],
			isError: true
		};
	}

	const { uid } = request;

	try {
		const datasource = await makeGrafanaRequest(`/api/datasources/uid/${uid}`, 'GET', config);
		return {
			content: [{ type: 'text', text: JSON.stringify(datasource, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching datasource');
	}
}

export async function get_datasource_by_name(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.name) {
		return {
			content: [{ type: 'text', text: 'Error: name parameter is required' }],
			isError: true
		};
	}

	const { name } = request;

	try {
		const datasource = await makeGrafanaRequest(`/api/datasources/name/${encodeURIComponent(name)}`, 'GET', config);
		return {
			content: [{ type: 'text', text: JSON.stringify(datasource, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching datasource');
	}
}

// Prometheus Tools
export async function query_prometheus(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.datasourceUid) {
		return {
			content: [{ type: 'text', text: 'Error: datasourceUid parameter is required' }],
			isError: true
		};
	}

	if (!request.query) {
		return {
			content: [{ type: 'text', text: 'Error: query parameter is required' }],
			isError: true
		};
	}

	const {
		datasourceUid,
		query,
		queryType = 'range',
		startTime,
		endTime,
		stepSeconds
	} = request;

	try {
		const params = new URLSearchParams({ query });

		if (queryType === 'range') {
			params.append('start', startTime || new Date(Date.now() - 3600000).toISOString());
			params.append('end', endTime || new Date().toISOString());
			params.append('step', (stepSeconds || 60).toString());
		} else {
			params.append('time', endTime || new Date().toISOString());
		}

		const endpoint = queryType === 'range' ? '/api/v1/query_range' : '/api/v1/query';
		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}${endpoint}?${params}`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'querying Prometheus');
	}
}

export async function list_prometheus_metric_metadata(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { datasourceUid, limit, metric } = request;

	try {
		const params = new URLSearchParams();
		if (limit) params.append('limit', limit.toString());
		if (metric) params.append('metric', metric);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/api/v1/metadata?${params}`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Prometheus metadata');
	}
}

export async function list_prometheus_metric_names(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { datasourceUid, regex, limit } = request;

	try {
		const params = new URLSearchParams();
		if (regex) params.append('match[]', regex);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/api/v1/label/__name__/values?${params}`,
			'GET',
			config
		);

		let metrics = result.data || [];
		if (limit) metrics = metrics.slice(0, limit);

		return {
			content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Prometheus metric names');
	}
}

export async function list_prometheus_label_names(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { datasourceUid, startRfc3339, endRfc3339, limit } = request;

	try {
		const params = new URLSearchParams();
		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/api/v1/labels?${params}`,
			'GET',
			config
		);

		let labels = result.data || [];
		if (limit) labels = labels.slice(0, limit);

		return {
			content: [{ type: 'text', text: JSON.stringify(labels, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Prometheus label names');
	}
}

export async function list_prometheus_label_values(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.datasourceUid) {
		return {
			content: [{ type: 'text', text: 'Error: datasourceUid parameter is required' }],
			isError: true
		};
	}

	if (!request.labelName) {
		return {
			content: [{ type: 'text', text: 'Error: labelName parameter is required' }],
			isError: true
		};
	}

	const { datasourceUid, labelName, startRfc3339, endRfc3339, limit } = request;

	try {
		const params = new URLSearchParams();
		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/api/v1/label/${labelName}/values?${params}`,
			'GET',
			config
		);

		let values = result.data || [];
		if (limit) values = values.slice(0, limit);

		return {
			content: [{ type: 'text', text: JSON.stringify(values, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Prometheus label values');
	}
}

// Loki Tools
export async function query_loki_logs(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.datasourceUid) {
		return {
			content: [{ type: 'text', text: 'Error: datasourceUid parameter is required' }],
			isError: true
		};
	}

	if (!request.logql) {
		return {
			content: [{ type: 'text', text: 'Error: logql parameter is required' }],
			isError: true
		};
	}

	const {
		datasourceUid,
		logql,
		limit = 10,
		startRfc3339,
		endRfc3339,
		direction = 'backward'
	} = request;

	try {
		const params = new URLSearchParams({
			query: logql,
			limit: limit.toString(),
			direction
		});

		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/loki/api/v1/query_range?${params}`,
			'GET',
			config
		);

		// Transform to LogEntry format
		const logs: LogEntry[] = [];
		if (result.data && result.data.result) {
			for (const stream of result.data.result) {
				for (const entry of stream.values || []) {
					logs.push({
						timestamp: entry[0],
						line: entry[1],
						labels: stream.stream || {}
					});
				}
			}
		}

		return {
			content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'querying Loki logs');
	}
}

export async function list_loki_label_names(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { datasourceUid, startRfc3339, endRfc3339 } = request;

	try {
		const params = new URLSearchParams();
		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/loki/api/v1/labels?${params}`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result.data || [], null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Loki label names');
	}
}

export async function list_loki_label_values(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.datasourceUid) {
		return {
			content: [{ type: 'text', text: 'Error: datasourceUid parameter is required' }],
			isError: true
		};
	}

	if (!request.labelName) {
		return {
			content: [{ type: 'text', text: 'Error: labelName parameter is required' }],
			isError: true
		};
	}

	const { datasourceUid, labelName, startRfc3339, endRfc3339 } = request;

	try {
		const params = new URLSearchParams();
		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/loki/api/v1/label/${labelName}/values?${params}`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result.data || [], null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Loki label values');
	}
}

export async function query_loki_stats(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { datasourceUid, logql, startRfc3339, endRfc3339 } = request;

	try {
		const params = new URLSearchParams({ query: logql });
		if (startRfc3339) params.append('start', startRfc3339);
		if (endRfc3339) params.append('end', endRfc3339);

		const result = await makeGrafanaRequest(
			`/api/datasources/proxy/uid/${datasourceUid}/loki/api/v1/index/stats?${params}`,
			'GET',
			config
		);

		const stats: LokiStats = {
			streams: result.streams || 0,
			chunks: result.chunks || 0,
			entries: result.entries || 0,
			bytes: result.bytes || 0
		};

		return {
			content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching Loki stats');
	}
}

// Alerting Tools
export async function list_alert_rules(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { folderUid, limit } = request;

	try {
		const params = new URLSearchParams();
		if (folderUid) params.append('folderUID', folderUid);

		const result = await makeGrafanaRequest(`/api/ruler/grafana/api/v1/rules?${params}`, 'GET', config);

		const rules: AlertRule[] = [];
		Object.values(result).forEach((folder: any) => {
			folder.forEach((group: any) => {
				group.rules?.forEach((rule: any) => {
					rules.push({
						uid: rule.uid,
						title: rule.title,
						condition: rule.condition,
						noDataState: rule.noDataState,
						execErrState: rule.execErrState,
						folderUID: rule.folderUID
					});
				});
			});
		});

		const limitedRules = limit ? rules.slice(0, limit) : rules;

		return {
			content: [{ type: 'text', text: JSON.stringify(limitedRules, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching alert rules');
	}
}

export async function get_alert_rule_by_uid(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { uid } = request;

	try {
		const result = await makeGrafanaRequest(`/api/v1/provisioning/alert-rules/${uid}`, 'GET', config);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching alert rule');
	}
}

export async function list_contact_points(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { name, limit } = request;

	try {
		const params = new URLSearchParams();
		if (name) params.append('name', name);

		const result = await makeGrafanaRequest(`/api/v1/provisioning/contact-points?${params}`, 'GET', config);

		const contactPoints: ContactPoint[] = result.map((cp: any) => ({
			uid: cp.uid,
			name: cp.name,
			type: cp.type
		}));

		const limitedContactPoints = limit ? contactPoints.slice(0, limit) : contactPoints;

		return {
			content: [{ type: 'text', text: JSON.stringify(limitedContactPoints, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching contact points');
	}
}

// Incident Management Tools
export async function list_incidents(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { status, limit } = request;

	try {
		const params = new URLSearchParams();
		if (status) params.append('status', status);
		if (limit) params.append('limit', limit.toString());

		const result = await makeGrafanaRequest(`/api/plugins/grafana-incident-app/resources/api/v1/IncidentsService.SearchIncidents?${params}`, 'GET', config);

		return {
			content: [{ type: 'text', text: JSON.stringify(result.incidents || [], null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching incidents');
	}
}

export async function create_incident(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	// Extract and validate required parameters
	if (!request.title) {
		return {
			content: [{ type: 'text', text: 'Error: title parameter is required' }],
			isError: true
		};
	}

	const { title, description, severity } = request;

	try {
		const payload = {
			title,
			description: description || '',
			severity: severity || 'medium'
		};

		const result = await makeGrafanaRequest(
			'/api/plugins/grafana-incident-app/resources/api/v1/IncidentsService.CreateIncident',
			'POST',
			config,
			payload
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'creating incident');
	}
}

export async function get_incident(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { id } = request;

	try {
		const result = await makeGrafanaRequest(
			`/api/plugins/grafana-incident-app/resources/api/v1/IncidentsService.GetIncident?incidentID=${id}`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching incident');
	}
}

export async function add_activity_to_incident(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { id, message } = request;

	try {
		const payload = {
			incidentID: id,
			activityItem: {
				body: message,
				eventType: 'userNote'
			}
		};

		const result = await makeGrafanaRequest(
			'/api/plugins/grafana-incident-app/resources/api/v1/IncidentsService.AddActivity',
			'POST',
			config,
			payload
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'adding activity to incident');
	}
}

// OnCall Tools
export async function list_oncall_schedules(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { name, limit } = request;

	try {
		const params = new URLSearchParams();
		if (name) params.append('name', name);

		const result = await makeGrafanaRequest(
			`/api/plugins/grafana-oncall-app/resources/api/internal/v1/schedules/?${params}`,
			'GET',
			config
		);

		let schedules = result.results || [];
		if (limit) schedules = schedules.slice(0, limit);

		return {
			content: [{ type: 'text', text: JSON.stringify(schedules, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching OnCall schedules');
	}
}

export async function get_oncall_shift(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { scheduleId, shiftId } = request;

	try {
		const result = await makeGrafanaRequest(
			`/api/plugins/grafana-oncall-app/resources/api/internal/v1/schedules/${scheduleId}/shifts/${shiftId}/`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching OnCall shift');
	}
}

export async function get_current_oncall_users(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { scheduleId } = request;

	try {
		const result = await makeGrafanaRequest(
			`/api/plugins/grafana-oncall-app/resources/api/internal/v1/schedules/${scheduleId}/current-oncall/`,
			'GET',
			config
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching current on-call users');
	}
}

// Admin Tools
export async function get_health(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	try {
		const result = await makeGrafanaRequest('/api/health', 'GET', config);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'fetching health status');
	}
}

export async function get_version(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);

	try {
		const result = await makeGrafanaRequest('/api/frontend/settings', 'GET', config);
		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					version: result.buildInfo?.version,
					commit: result.buildInfo?.commit,
					buildstamp: result.buildInfo?.buildstamp,
					edition: result.buildInfo?.edition
				}, null, 2)
			}]
		};
	} catch (error) {
		return handleError(error, 'fetching version info');
	}
}

// Search Tools
export async function search(request: ToolRequest, env: any): Promise<ToolResponse> {
	const config = getGrafanaConfig(env);
	const { query, type, limit = 20 } = request;

	try {
		const params = new URLSearchParams({
			limit: limit.toString(),
			...(query && { query }),
			...(type && { type })
		});

		const result = await makeGrafanaRequest(`/api/search?${params}`, 'GET', config);

		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
		};
	} catch (error) {
		return handleError(error, 'performing search');
	}
}
