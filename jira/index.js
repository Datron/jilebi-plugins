// ============================================================
// Helper: formatDuration — converts minutes to "Xd Yh Zm" format
// ============================================================
function formatDuration(minutes) {
    if (minutes <= 0)
        return "0m";
    const days = Math.floor(minutes / 1440);
    const remaining = minutes % 1440;
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (days > 0 || hours > 0)
        parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(" ");
}
// ============================================================
// Helper: parseChangelogToStatusChanges
// ============================================================
function parseChangelogToStatusChanges(changelog, createdDate, currentStatus) {
    if (!changelog?.histories)
        return [];
    // Extract status transitions and sort ascending by timestamp
    const statusTransitions = [];
    for (const history of changelog.histories) {
        for (const item of history.items) {
            if (item.field.toLowerCase() === "status") {
                statusTransitions.push({
                    created: history.created,
                    fromString: item.fromString || "",
                    toString: item.toString || "",
                });
            }
        }
    }
    if (statusTransitions.length === 0) {
        // No transitions — issue has been in current status since creation
        return [
            {
                status: currentStatus,
                entered_at: createdDate,
                exited_at: null,
                duration_minutes: null,
                duration_formatted: null,
            },
        ];
    }
    // Sort by timestamp ascending
    statusTransitions.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    const changes = [];
    // Initial status entry (from first transition's fromString)
    const firstTransition = statusTransitions[0];
    const initialEnteredAt = new Date(createdDate).getTime();
    const initialExitedAt = new Date(firstTransition.created).getTime();
    const initialDuration = Math.floor((initialExitedAt - initialEnteredAt) / 60000);
    changes.push({
        status: firstTransition.fromString,
        entered_at: createdDate,
        exited_at: firstTransition.created,
        duration_minutes: initialDuration,
        duration_formatted: formatDuration(initialDuration),
    });
    // Each subsequent transition
    for (let i = 0; i < statusTransitions.length; i++) {
        const transition = statusTransitions[i];
        const nextTransition = statusTransitions[i + 1];
        if (nextTransition) {
            const enteredAt = new Date(transition.created).getTime();
            const exitedAt = new Date(nextTransition.created).getTime();
            const dur = Math.floor((exitedAt - enteredAt) / 60000);
            changes.push({
                status: transition.toString,
                entered_at: transition.created,
                exited_at: nextTransition.created,
                duration_minutes: dur,
                duration_formatted: formatDuration(dur),
            });
        }
        else {
            // Current/last status — no exit
            changes.push({
                status: transition.toString,
                entered_at: transition.created,
                exited_at: null,
                duration_minutes: null,
                duration_formatted: null,
            });
        }
    }
    return changes;
}
// ============================================================
// Helper: aggregateStatusTimes
// ============================================================
function aggregateStatusTimes(statusChanges) {
    const statusMap = new Map();
    for (const change of statusChanges) {
        const existing = statusMap.get(change.status) || {
            totalMinutes: 0,
            visitCount: 0,
        };
        existing.visitCount++;
        if (change.duration_minutes != null && change.duration_minutes > 0) {
            existing.totalMinutes += change.duration_minutes;
        }
        statusMap.set(change.status, existing);
    }
    const totalMinutes = Array.from(statusMap.values()).reduce((sum, v) => sum + v.totalMinutes, 0);
    const result = Array.from(statusMap.entries())
        .map(([status, data]) => ({
        status,
        total_duration_minutes: data.totalMinutes,
        total_duration_formatted: formatDuration(data.totalMinutes),
        visit_count: data.visitCount,
        percentage: totalMinutes > 0
            ? Math.round((data.totalMinutes / totalMinutes) * 10000) / 100
            : 0,
    }))
        .sort((a, b) => b.total_duration_minutes - a.total_duration_minutes);
    return result;
}
// ============================================================
// Tool: batch_get_changelogs
// ============================================================
const batch_get_changelogs = async (params, env) => {
    try {
        const issueIds = params.issue_ids_or_keys
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (issueIds.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: "No issue IDs or keys provided" }, null, 2),
                    },
                ],
                isError: true,
            };
        }
        const fieldIds = params.fields
            ? params.fields
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : null;
        const limit = params.limit ?? -1;
        // Accumulate changelogs keyed by issueId
        const changelogsByIssue = new Map();
        let nextPageToken = undefined;
        // Pagination loop
        do {
            const body = {
                issueIdsOrKeys: issueIds,
            };
            if (fieldIds) {
                body.fieldIds = fieldIds;
            }
            if (nextPageToken) {
                body.nextPageToken = nextPageToken;
            }
            const response = await makeRestRequest(env, "/changelog/bulkfetch", {
                method: "POST",
                body: JSON.stringify(body),
            });
            // Process each issue's changelogs from this page
            if (response.issueChangeLogs) {
                for (const issueLog of response.issueChangeLogs) {
                    const issueId = issueLog.issueId;
                    const existing = changelogsByIssue.get(issueId) || [];
                    for (const history of issueLog.changeHistories || []) {
                        existing.push({
                            id: history.id,
                            author: {
                                displayName: history.author?.displayName || "Unknown",
                                accountId: history.author?.accountId,
                            },
                            created: history.created,
                            items: (history.items || []).map((item) => ({
                                field: item.field,
                                fromString: item.fromString,
                                toString: item.toString,
                            })),
                        });
                    }
                    changelogsByIssue.set(issueId, existing);
                }
            }
            nextPageToken = response.nextPageToken || undefined;
        } while (nextPageToken);
        // Build output, applying limit per issue
        const result = Array.from(changelogsByIssue.entries()).map(([issueId, changelogs]) => ({
            issue_id: issueId,
            changelogs: limit > 0 ? changelogs.slice(0, limit) : changelogs,
        }));
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
                        error: `Failed to fetch changelogs: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: batch_create_versions
// ============================================================
const batch_create_versions = async (params, env) => {
    try {
        // Parse versions JSON array
        let versionsArray;
        try {
            versionsArray = JSON.parse(params.versions);
            if (!Array.isArray(versionsArray)) {
                throw new Error("versions must be a JSON array");
            }
        }
        catch (e) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Invalid versions JSON: ${e instanceof Error ? e.message : String(e)}`,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
        // Get project ID
        const project = await makeRestRequest(env, `/project/${encodeURIComponent(params.project_key)}`);
        const results = [];
        for (const versionInput of versionsArray) {
            // Validate input
            if (!versionInput ||
                typeof versionInput !== "object" ||
                !versionInput.name) {
                results.push({
                    success: false,
                    error: "Version must be an object with at least a 'name' field",
                    input: versionInput,
                });
                continue;
            }
            const body = {
                name: versionInput.name,
                projectId: parseInt(project.id, 10),
            };
            if (versionInput.startDate)
                body.startDate = versionInput.startDate;
            if (versionInput.releaseDate)
                body.releaseDate = versionInput.releaseDate;
            if (versionInput.description)
                body.description = versionInput.description;
            try {
                const result = await makeRestRequest(env, "/version", {
                    method: "POST",
                    body: JSON.stringify(body),
                });
                results.push({
                    success: true,
                    version: {
                        id: result.id,
                        name: result.name,
                        description: result.description,
                        startDate: result.startDate,
                        releaseDate: result.releaseDate,
                        released: result.released,
                        archived: result.archived,
                    },
                });
            }
            catch (error) {
                results.push({
                    success: false,
                    error: `Failed to create version '${versionInput.name}': ${error instanceof Error ? error.message : String(error)}`,
                    input: versionInput,
                });
            }
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(results, null, 2),
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
                        error: `Failed to batch create versions: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: jira_get_issue_dates
// ============================================================
const jira_get_issue_dates = async (params, env) => {
    const includeStatusChanges = params.include_status_changes !== false;
    const includeStatusSummary = params.include_status_summary !== false;
    try {
        const issue = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?fields=status,created,updated,duedate,resolutiondate&expand=changelog`);
        const fields = issue.fields;
        const currentStatus = fields.status?.name || "Unknown";
        const result = {
            issue_key: issue.key,
            created: fields.created || null,
            updated: fields.updated || null,
            due_date: fields.duedate || null,
            resolution_date: fields.resolutiondate || null,
            current_status: currentStatus,
        };
        if (includeStatusChanges || includeStatusSummary) {
            const statusChanges = parseChangelogToStatusChanges(issue.changelog, fields.created || issue.key, currentStatus);
            if (includeStatusChanges) {
                result.status_changes = statusChanges;
            }
            if (includeStatusSummary) {
                result.status_summary = aggregateStatusTimes(statusChanges);
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
                        error: `Failed to get issue dates: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: jira_get_issue_sla
// ============================================================
// Cached status category map
let statusCategoryCache = null;
async function getStatusCategoryMap(env) {
    if (statusCategoryCache)
        return statusCategoryCache;
    const statuses = await makeRestRequest(env, "/status");
    const map = new Map();
    if (Array.isArray(statuses)) {
        for (const status of statuses) {
            const name = (status.name || "").toLowerCase();
            const categoryKey = status.statusCategory?.key || "";
            map.set(name, categoryKey);
        }
    }
    statusCategoryCache = map;
    return map;
}
function isInProgressStatus(statusName, categoryMap) {
    const key = statusName.toLowerCase();
    const category = categoryMap.get(key);
    if (category === "indeterminate")
        return true;
    // Fallback heuristic
    const heuristics = ["in progress", "in development", "working"];
    return heuristics.includes(key);
}
const jira_get_issue_sla = async (params, env) => {
    const defaultMetrics = "cycle_time,time_in_status";
    const requestedMetrics = (params.metrics || defaultMetrics)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const validMetrics = new Set([
        "cycle_time",
        "lead_time",
        "time_in_status",
        "due_date_compliance",
        "resolution_time",
        "first_response_time",
    ]);
    for (const m of requestedMetrics) {
        if (!validMetrics.has(m)) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Invalid metric: '${m}'. Valid metrics: ${Array.from(validMetrics).join(", ")}`,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    try {
        // Fetch issue with changelog
        const issue = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?fields=status,created,updated,duedate,resolutiondate&expand=changelog`);
        const fields = issue.fields;
        const currentStatus = fields.status?.name || "Unknown";
        const createdDate = fields.created || null;
        const resolutionDate = fields.resolutiondate || null;
        const dueDate = fields.duedate || null;
        const now = new Date();
        const statusChanges = parseChangelogToStatusChanges(issue.changelog, createdDate || "", currentStatus);
        const metricsResult = {};
        // Cycle Time: created → resolution_date
        if (requestedMetrics.includes("cycle_time")) {
            if (createdDate && resolutionDate) {
                const createdMs = new Date(createdDate).getTime();
                const resolvedMs = new Date(resolutionDate).getTime();
                const minutes = Math.floor((resolvedMs - createdMs) / 60000);
                metricsResult.cycle_time = {
                    calculated: true,
                    value_minutes: minutes,
                    formatted: formatDuration(minutes),
                    start: createdDate,
                    end: resolutionDate,
                };
            }
            else {
                metricsResult.cycle_time = {
                    calculated: false,
                    reason: !createdDate
                        ? "No created date"
                        : "Issue not yet resolved",
                };
            }
        }
        // Lead Time: created → resolution_date or now
        if (requestedMetrics.includes("lead_time")) {
            if (createdDate) {
                const createdMs = new Date(createdDate).getTime();
                const endMs = resolutionDate
                    ? new Date(resolutionDate).getTime()
                    : now.getTime();
                const minutes = Math.floor((endMs - createdMs) / 60000);
                metricsResult.lead_time = {
                    calculated: true,
                    value_minutes: minutes,
                    formatted: formatDuration(minutes),
                    start: createdDate,
                    end: resolutionDate || now.toISOString(),
                    is_resolved: !!resolutionDate,
                };
            }
            else {
                metricsResult.lead_time = {
                    calculated: false,
                    reason: "No created date",
                };
            }
        }
        // Time In Status: per-status breakdown
        if (requestedMetrics.includes("time_in_status")) {
            // For current status, calculate duration to now
            const enrichedChanges = statusChanges.map((change) => {
                if (change.exited_at === null && change.entered_at) {
                    const enteredMs = new Date(change.entered_at).getTime();
                    const dur = Math.floor((now.getTime() - enteredMs) / 60000);
                    return {
                        ...change,
                        duration_minutes: dur,
                        duration_formatted: formatDuration(dur),
                    };
                }
                return change;
            });
            metricsResult.time_in_status = {
                calculated: true,
                statuses: aggregateStatusTimes(enrichedChanges),
            };
        }
        // Due Date Compliance: resolved vs due_date
        if (requestedMetrics.includes("due_date_compliance")) {
            if (!dueDate) {
                metricsResult.due_date_compliance = {
                    calculated: true,
                    status: "no_due_date",
                    reason: "No due date set",
                };
            }
            else if (!resolutionDate) {
                // Check if overdue (now > due_date end of day)
                const dueDateEnd = new Date(dueDate + "T23:59:59Z").getTime();
                const overdue = now.getTime() > dueDateEnd;
                metricsResult.due_date_compliance = {
                    calculated: true,
                    status: "not_resolved",
                    due_date: dueDate,
                    overdue,
                    reason: "Issue not yet resolved",
                };
            }
            else {
                const resolvedMs = new Date(resolutionDate).getTime();
                const dueDateEnd = new Date(dueDate + "T23:59:59Z").getTime();
                const marginMinutes = Math.floor((dueDateEnd - resolvedMs) / 60000);
                const met = marginMinutes >= 0;
                metricsResult.due_date_compliance = {
                    calculated: true,
                    status: met ? "met" : "missed",
                    due_date: dueDate,
                    resolution_date: resolutionDate,
                    margin_minutes: Math.abs(marginMinutes),
                    margin_formatted: `${formatDuration(Math.abs(marginMinutes))} ${met ? "early" : "late"}`,
                };
            }
        }
        // Resolution Time: first "In Progress" status → resolution_date
        if (requestedMetrics.includes("resolution_time")) {
            if (!resolutionDate) {
                metricsResult.resolution_time = {
                    calculated: false,
                    reason: "Issue not yet resolved",
                };
            }
            else {
                const categoryMap = await getStatusCategoryMap(env);
                let firstInProgressAt = null;
                for (const change of statusChanges) {
                    if (isInProgressStatus(change.status, categoryMap)) {
                        firstInProgressAt = change.entered_at;
                        break;
                    }
                }
                if (firstInProgressAt) {
                    const startMs = new Date(firstInProgressAt).getTime();
                    const endMs = new Date(resolutionDate).getTime();
                    const minutes = Math.floor((endMs - startMs) / 60000);
                    metricsResult.resolution_time = {
                        calculated: true,
                        value_minutes: minutes,
                        formatted: formatDuration(minutes),
                        start: firstInProgressAt,
                        end: resolutionDate,
                    };
                }
                else {
                    metricsResult.resolution_time = {
                        calculated: false,
                        reason: "No 'In Progress' status found in issue history",
                    };
                }
            }
        }
        // First Response Time: created → first status transition
        if (requestedMetrics.includes("first_response_time")) {
            if (!createdDate) {
                metricsResult.first_response_time = {
                    calculated: false,
                    reason: "No created date",
                };
            }
            else if (statusChanges.length < 2) {
                metricsResult.first_response_time = {
                    calculated: false,
                    reason: "No status transitions found",
                };
            }
            else {
                // First transition = statusChanges[1].entered_at (index 0 is initial status)
                const firstResponseAt = statusChanges[1].entered_at;
                const createdMs = new Date(createdDate).getTime();
                const responseMs = new Date(firstResponseAt).getTime();
                const minutes = Math.floor((responseMs - createdMs) / 60000);
                metricsResult.first_response_time = {
                    calculated: true,
                    value_minutes: minutes,
                    formatted: formatDuration(minutes),
                    created: createdDate,
                    first_response_at: firstResponseAt,
                    response_type: "transition",
                };
            }
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        issue_key: issue.key,
                        metrics: metricsResult,
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
                        error: `Failed to calculate SLA metrics: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// Default fields to request when reading issues
const DEFAULT_FIELDS = [
    "summary",
    "description",
    "status",
    "assignee",
    "reporter",
    "labels",
    "priority",
    "created",
    "updated",
    "issuetype",
];
// Helper to build basic auth header
function getAuthHeader(env) {
    const credentials = btoa(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`);
    return `Basic ${credentials}`;
}
// Helper to get the Jira REST API base URL
function getApiBaseUrl(env) {
    const baseUrl = env.JIRA_BASE_URL.replace(/\/+$/, "");
    return `${baseUrl}/rest/api/3`;
}
// Helper to get the Jira Agile REST API base URL
function getAgileApiBaseUrl(env) {
    const baseUrl = env.JIRA_BASE_URL.replace(/\/+$/, "");
    return `${baseUrl}/rest/agile/1.0`;
}
// Helper function to make Jira API requests
async function makeJiraRequest(env, url, options = {}) {
    if (!env.JIRA_API_TOKEN || !env.JIRA_EMAIL) {
        throw new Error("JIRA_API_TOKEN and JIRA_EMAIL are required");
    }
    if (!env.JIRA_BASE_URL) {
        throw new Error("JIRA_BASE_URL is required");
    }
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: getAuthHeader(env),
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "jilebi-jira-plugin",
            ...options.headers,
        },
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Jira API error: ${response.status} ${response.statusText} - ${error}`);
    }
    // DELETE responses may have no body
    if (response.status === 204) {
        return null;
    }
    return response.json();
}
// Helper to make requests to the standard REST API
async function makeRestRequest(env, endpoint, options = {}) {
    const apiBase = getApiBaseUrl(env);
    return makeJiraRequest(env, `${apiBase}${endpoint}`, options);
}
// Helper to make requests to the Agile REST API
async function makeAgileRequest(env, endpoint, options = {}) {
    const apiBase = getAgileApiBaseUrl(env);
    return makeJiraRequest(env, `${apiBase}${endpoint}`, options);
}
// Recursively extract text from ADF nodes
function extractTextFromAdfNodes(nodes) {
    if (!nodes || !Array.isArray(nodes))
        return "";
    const parts = [];
    for (const node of nodes) {
        switch (node.type) {
            case "paragraph":
                parts.push(extractTextFromAdfNodes(node.content || []) + "\n");
                break;
            case "text":
                parts.push(node.text || "");
                break;
            case "heading": {
                const level = node.attrs?.level || 1;
                const prefix = "#".repeat(level);
                parts.push(`${prefix} ${extractTextFromAdfNodes(node.content || [])}\n`);
                break;
            }
            case "bulletList":
                for (const item of node.content || []) {
                    parts.push(`- ${extractTextFromAdfNodes(item.content || [])}`);
                }
                parts.push("");
                break;
            case "orderedList": {
                let idx = 1;
                for (const item of node.content || []) {
                    parts.push(`${idx}. ${extractTextFromAdfNodes(item.content || [])}`);
                    idx++;
                }
                parts.push("");
                break;
            }
            case "listItem":
                parts.push(extractTextFromAdfNodes(node.content || []));
                break;
            case "codeBlock": {
                const lang = node.attrs?.language || "";
                const code = extractTextFromAdfNodes(node.content || []);
                parts.push(`\`\`\`${lang}\n${code}\`\`\`\n`);
                break;
            }
            case "blockquote": {
                const quoted = extractTextFromAdfNodes(node.content || []);
                parts.push(quoted
                    .split("\n")
                    .map((l) => `> ${l}`)
                    .join("\n") + "\n");
                break;
            }
            case "rule":
                parts.push("---\n");
                break;
            case "table":
                parts.push(extractTextFromAdfNodes(node.content || []));
                break;
            case "tableRow": {
                const cells = (node.content || []).map((cell) => extractTextFromAdfNodes(cell.content || []).trim());
                parts.push(`| ${cells.join(" | ")} |`);
                break;
            }
            case "tableHeader":
            case "tableCell":
                parts.push(extractTextFromAdfNodes(node.content || []));
                break;
            case "inlineCard":
                parts.push(node.attrs?.url || "");
                break;
            case "mention":
                parts.push(`@${node.attrs?.text || node.attrs?.id || ""}`);
                break;
            case "emoji":
                parts.push(node.attrs?.shortName || "");
                break;
            case "hardBreak":
                parts.push("\n");
                break;
            case "mediaGroup":
            case "mediaSingle":
                parts.push("[media attachment]\n");
                break;
            default:
                if (node.content) {
                    parts.push(extractTextFromAdfNodes(node.content));
                }
                break;
        }
    }
    return parts.join("");
}
// Convert ADF (Atlassian Document Format) content to plain text / markdown
function adfToText(adf) {
    if (!adf)
        return "";
    if (typeof adf === "string")
        return adf;
    if (adf.type === "doc" && adf.content) {
        return extractTextFromAdfNodes(adf.content);
    }
    return JSON.stringify(adf);
}
// Format a Jira issue for simplified output
function formatIssue(issue, baseUrl = "") {
    const f = issue.fields;
    const result = {
        key: issue.key,
        id: issue.id,
        summary: f.summary,
        status: f.status?.name,
        statusCategory: f.status?.statusCategory?.name,
        issuetype: f.issuetype?.name,
        priority: f.priority?.name,
    };
    if (f.assignee) {
        result.assignee = {
            displayName: f.assignee.displayName,
            accountId: f.assignee.accountId,
        };
    }
    if (f.reporter) {
        result.reporter = {
            displayName: f.reporter.displayName,
            accountId: f.reporter.accountId,
        };
    }
    if (f.project) {
        result.project = {
            key: f.project.key,
            name: f.project.name,
        };
    }
    if (f.labels && f.labels.length > 0) {
        result.labels = f.labels;
    }
    if (f.components && f.components.length > 0) {
        result.components = f.components.map((c) => c.name);
    }
    if (f.fixVersions && f.fixVersions.length > 0) {
        result.fixVersions = f.fixVersions.map((v) => ({
            name: v.name,
            released: v.released,
        }));
    }
    if (f.resolution) {
        result.resolution = f.resolution.name;
    }
    if (f.description) {
        result.description = adfToText(f.description);
    }
    if (f.parent) {
        result.parent = {
            key: f.parent.key,
            summary: f.parent.fields?.summary,
            issuetype: f.parent.fields?.issuetype?.name,
        };
    }
    if (f.subtasks && f.subtasks.length > 0) {
        result.subtasks = f.subtasks.map((s) => ({
            key: s.key,
            summary: s.fields?.summary,
            status: s.fields?.status?.name,
            issuetype: s.fields?.issuetype?.name,
        }));
    }
    if (f.issuelinks && f.issuelinks.length > 0) {
        result.links = f.issuelinks.map((link) => {
            const res = {
                type: link.type.name,
            };
            if (link.inwardIssue) {
                res.direction = "inward";
                res.description = link.type.inward;
                res.issue = {
                    key: link.inwardIssue.key,
                    summary: link.inwardIssue.fields?.summary,
                    status: link.inwardIssue.fields?.status?.name,
                };
            }
            if (link.outwardIssue) {
                res.direction = "outward";
                res.description = link.type.outward;
                res.issue = {
                    key: link.outwardIssue.key,
                    summary: link.outwardIssue.fields?.summary,
                    status: link.outwardIssue.fields?.status?.name,
                };
            }
            return res;
        });
    }
    if (f.comment?.comments && f.comment.comments.length > 0) {
        result.comments = f.comment.comments.map((c) => ({
            id: c.id,
            author: c.author?.displayName,
            body: adfToText(c.body),
            created: c.created,
        }));
    }
    if (f.attachment && f.attachment.length > 0) {
        result.attachments = f.attachment.map((a) => ({
            id: a.id,
            filename: a.filename,
            size: a.size,
            mimeType: a.mimeType,
        }));
    }
    result.created = f.created;
    result.updated = f.updated;
    if (f.duedate) {
        result.duedate = f.duedate;
    }
    if (f.resolutiondate) {
        result.resolutiondate = f.resolutiondate;
    }
    if (baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
        result.url = `${cleanBaseUrl}/browse/${issue.key}`;
    }
    return result;
}
// Parse a fields string into an array (supports "field1,field2" and "*all")
function parseFields(fields) {
    if (!fields)
        return undefined;
    if (fields.trim() === "*all")
        return undefined;
    return fields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
}
// Parse inline markdown formatting into ADF inline nodes
function parseInlineMarkdown(text) {
    const nodes = [];
    // Regex to match inline elements: bold, italic, code, links
    // Order matters: bold before italic since ** contains *
    const inlineRegex = /(\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*(.+?)\*|_(.+?)_|\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
        // Add any text before this match
        if (match.index > lastIndex) {
            nodes.push({
                type: "text",
                text: text.slice(lastIndex, match.index),
            });
        }
        if (match[2] !== undefined || match[3] !== undefined) {
            // Bold (**text** or __text__)
            nodes.push({
                type: "text",
                text: match[2] ?? match[3],
                marks: [{ type: "strong" }],
            });
        }
        else if (match[4] !== undefined) {
            // Inline code (`code`)
            nodes.push({
                type: "text",
                text: match[4],
                marks: [{ type: "code" }],
            });
        }
        else if (match[5] !== undefined || match[6] !== undefined) {
            // Italic (*text* or _text_)
            nodes.push({
                type: "text",
                text: match[5] ?? match[6],
                marks: [{ type: "em" }],
            });
        }
        else if (match[7] !== undefined && match[8] !== undefined) {
            // Link [text](url)
            nodes.push({
                type: "text",
                text: match[7],
                marks: [{ type: "link", attrs: { href: match[8] } }],
            });
        }
        lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        nodes.push({ type: "text", text: text.slice(lastIndex) });
    }
    // If nothing was parsed, return a single text node
    if (nodes.length === 0 && text) {
        nodes.push({ type: "text", text });
    }
    return nodes;
}
// Convert plain text/markdown to ADF (Atlassian Document Format) for Jira Cloud
function textToAdf(text) {
    if (!text) {
        return {
            version: 1,
            type: "doc",
            content: [],
        };
    }
    const lines = text.split("\n");
    const content = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        // Empty line — skip
        if (!trimmed) {
            i++;
            continue;
        }
        // Fenced code block (```lang ... ```)
        const codeBlockMatch = trimmed.match(/^```(\w*)$/);
        if (codeBlockMatch) {
            const lang = codeBlockMatch[1] || "";
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            const codeContent = codeLines.join("\n");
            const codeNode = {
                type: "codeBlock",
                content: codeContent
                    ? [{ type: "text", text: codeContent }]
                    : [],
            };
            if (lang) {
                codeNode.attrs = { language: lang };
            }
            content.push(codeNode);
            continue;
        }
        // Horizontal rule
        if (/^[-*_]{3,}$/.test(trimmed)) {
            content.push({ type: "rule" });
            i++;
            continue;
        }
        // Headings
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            content.push({
                type: "heading",
                attrs: { level: headingMatch[1].length },
                content: parseInlineMarkdown(headingMatch[2]),
            });
            i++;
            continue;
        }
        // Blockquote
        if (/^>\s?/.test(trimmed)) {
            const quoteLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                i++;
            }
            content.push({
                type: "blockquote",
                content: [
                    {
                        type: "paragraph",
                        content: parseInlineMarkdown(quoteLines.join("\n")),
                    },
                ],
            });
            continue;
        }
        // Bullet list — collect consecutive bullet items
        if (/^[-*+]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
                const itemText = lines[i].trim().replace(/^[-*+]\s+/, "");
                items.push({
                    type: "listItem",
                    content: [
                        {
                            type: "paragraph",
                            content: parseInlineMarkdown(itemText),
                        },
                    ],
                });
                i++;
            }
            content.push({
                type: "bulletList",
                content: items,
            });
            continue;
        }
        // Ordered list — collect consecutive numbered items
        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
                items.push({
                    type: "listItem",
                    content: [
                        {
                            type: "paragraph",
                            content: parseInlineMarkdown(itemText),
                        },
                    ],
                });
                i++;
            }
            content.push({
                type: "orderedList",
                content: items,
            });
            continue;
        }
        // Regular paragraph with inline formatting
        content.push({
            type: "paragraph",
            content: parseInlineMarkdown(trimmed),
        });
        i++;
    }
    return {
        version: 1,
        type: "doc",
        content: content.length > 0
            ? content
            : [{ type: "paragraph", content: [] }],
    };
}
// ============================================================
// Tool: get_user_profile
// ============================================================
const get_user_profile = async (params, env) => {
    try {
        // Try by accountId first
        const result = await makeRestRequest(env, `/user?accountId=${encodeURIComponent(params.user_identifier)}`);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        user: {
                            accountId: result.accountId,
                            displayName: result.displayName,
                            emailAddress: result.emailAddress,
                            active: result.active,
                            accountType: result.accountType,
                            timeZone: result.timeZone,
                            locale: result.locale,
                        },
                    }, null, 2),
                },
            ],
        };
    }
    catch {
        // Fallback: search by email or display name
        try {
            const searchResult = await makeRestRequest(env, `/user/search?query=${encodeURIComponent(params.user_identifier)}&maxResults=1`);
            if (searchResult && searchResult.length > 0) {
                const user = searchResult[0];
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                user: {
                                    accountId: user.accountId,
                                    displayName: user.displayName,
                                    emailAddress: user.emailAddress,
                                    active: user.active,
                                    accountType: user.accountType,
                                },
                            }, null, 2),
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `User not found: ${params.user_identifier}`,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Failed to find user: ${error instanceof Error ? error.message : String(error)}`,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
};
// ============================================================
// Tool: get_issue
// ============================================================
const get_issue = async (params, env) => {
    const fieldsList = parseFields(params.fields) || DEFAULT_FIELDS;
    const commentLimit = Math.min(Math.max(params.comment_limit ?? 10, 0), 100);
    const queryParams = new URLSearchParams();
    // Include comments, links, subtasks, attachments in fields
    const extendedFields = [
        ...fieldsList,
        "comment",
        "issuelinks",
        "subtasks",
        "attachment",
        "parent",
        "components",
        "fixVersions",
        "resolution",
        "resolutiondate",
        "duedate",
        "project",
    ];
    queryParams.set("fields", [...new Set(extendedFields)].join(","));
    const expandFields = [];
    if (params.expand) {
        expandFields.push(...params.expand.split(",").map((e) => e.trim()));
    }
    if (expandFields.length > 0) {
        queryParams.append("expand", expandFields.join(","));
    }
    const issue = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?${queryParams}`);
    // Trim comments to the limit
    if (issue.fields.comment?.comments &&
        issue.fields.comment.comments.length > commentLimit) {
        issue.fields.comment.comments =
            issue.fields.comment.comments.slice(-commentLimit);
    }
    const formatted = formatIssue(issue, env.JIRA_BASE_URL);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(formatted, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: search_issues
// ============================================================
const search_issues = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const fieldsList = parseFields(params.fields) || DEFAULT_FIELDS;
    const body = {
        jql: params.jql,
        maxResults: limit,
        startAt: startAt,
        fields: fieldsList,
    };
    if (params.expand) {
        body.expand = params.expand
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
    }
    const result = await makeRestRequest(env, "/search", {
        method: "POST",
        body: JSON.stringify(body),
    });
    const issues = result.issues.map((issue) => formatIssue(issue, env.JIRA_BASE_URL));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    total: result.total,
                    startAt: result.startAt,
                    maxResults: result.maxResults,
                    issues,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: search_fields
// ============================================================
const search_fields = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const keyword = (params.keyword || "").toLowerCase();
    const allFields = await makeRestRequest(env, "/field");
    let filtered;
    if (keyword) {
        filtered = allFields.filter((f) => f.name.toLowerCase().includes(keyword) ||
            f.id.toLowerCase().includes(keyword) ||
            (f.clauseNames &&
                f.clauseNames.some((cn) => cn.toLowerCase().includes(keyword))));
    }
    else {
        filtered = allFields;
    }
    const results = filtered.slice(0, limit).map((f) => ({
        id: f.id,
        name: f.name,
        custom: f.custom,
        searchable: f.searchable,
        clauseNames: f.clauseNames,
        schema: f.schema,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(results, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_project_issues
// ============================================================
const get_project_issues = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const jql = `project = "${params.project_key}" ORDER BY updated DESC`;
    const body = {
        jql,
        maxResults: limit,
        startAt,
        fields: DEFAULT_FIELDS,
    };
    const result = await makeRestRequest(env, "/search", {
        method: "POST",
        body: JSON.stringify(body),
    });
    const issues = result.issues.map((issue) => formatIssue(issue, env.JIRA_BASE_URL));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    project: params.project_key,
                    total: result.total,
                    startAt: result.startAt,
                    maxResults: result.maxResults,
                    issues,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_transitions
// ============================================================
const get_transitions = async (params, env) => {
    const result = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/transitions`);
    const transitions = result.transitions.map((t) => ({
        id: t.id,
        name: t.name,
        to: {
            name: t.to.name,
            statusCategory: t.to.statusCategory?.name,
        },
        hasScreen: t.hasScreen,
        isGlobal: t.isGlobal,
        isConditional: t.isConditional,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(transitions, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_worklog
// ============================================================
const get_worklog = async (params, env) => {
    const result = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/worklog`);
    const worklogs = result.worklogs.map((w) => ({
        id: w.id,
        author: w.author?.displayName,
        timeSpent: w.timeSpent,
        timeSpentSeconds: w.timeSpentSeconds,
        started: w.started,
        comment: w.comment,
        created: w.created,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ worklogs }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_agile_boards
// ============================================================
const get_agile_boards = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const queryParams = new URLSearchParams({
        maxResults: limit.toString(),
        startAt: startAt.toString(),
    });
    if (params.board_name) {
        queryParams.append("name", params.board_name);
    }
    if (params.project_key) {
        queryParams.append("projectKeyOrId", params.project_key);
    }
    if (params.board_type) {
        queryParams.append("type", params.board_type);
    }
    const result = await makeAgileRequest(env, `/board?${queryParams}`);
    const boards = result.values.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        project: b.location
            ? {
                key: b.location.projectKey,
                name: b.location.projectName,
            }
            : null,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(boards, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_board_issues
// ============================================================
const get_board_issues = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const fieldsList = parseFields(params.fields) || DEFAULT_FIELDS;
    const queryParams = new URLSearchParams({
        maxResults: limit.toString(),
        startAt: startAt.toString(),
        fields: fieldsList.join(","),
    });
    if (params.jql) {
        queryParams.append("jql", params.jql);
    }
    const result = await makeAgileRequest(env, `/board/${encodeURIComponent(params.board_id)}/issue?${queryParams}`);
    const issues = result.issues.map((issue) => formatIssue(issue, env.JIRA_BASE_URL));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    total: result.total,
                    startAt: result.startAt,
                    maxResults: result.maxResults,
                    issues,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_sprints_from_board
// ============================================================
const get_sprints_from_board = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const queryParams = new URLSearchParams({
        maxResults: limit.toString(),
        startAt: startAt.toString(),
    });
    if (params.state) {
        queryParams.append("state", params.state);
    }
    const result = await makeAgileRequest(env, `/board/${encodeURIComponent(params.board_id)}/sprint?${queryParams}`);
    const sprints = result.values.map((s) => ({
        id: s.id,
        name: s.name,
        state: s.state,
        startDate: s.startDate,
        endDate: s.endDate,
        completeDate: s.completeDate,
        goal: s.goal,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(sprints, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_sprint_issues
// ============================================================
const get_sprint_issues = async (params, env) => {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 50);
    const startAt = Math.max(params.start_at ?? 0, 0);
    const fieldsList = parseFields(params.fields) || DEFAULT_FIELDS;
    const queryParams = new URLSearchParams({
        maxResults: limit.toString(),
        startAt: startAt.toString(),
        fields: fieldsList.join(","),
    });
    const result = await makeAgileRequest(env, `/sprint/${encodeURIComponent(params.sprint_id)}/issue?${queryParams}`);
    const issues = result.issues.map((issue) => formatIssue(issue, env.JIRA_BASE_URL));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    total: result.total,
                    startAt: result.startAt,
                    maxResults: result.maxResults,
                    issues,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_link_types
// ============================================================
const get_link_types = async (_params, env) => {
    const result = await makeRestRequest(env, "/issueLinkType");
    const linkTypes = result.issueLinkTypes.map((lt) => ({
        id: lt.id,
        name: lt.name,
        inward: lt.inward,
        outward: lt.outward,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(linkTypes, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_all_projects
// ============================================================
const get_all_projects = async (params, env) => {
    const queryParams = new URLSearchParams();
    if (params.include_archived) {
        queryParams.append("includeArchived", "true");
    }
    const query = queryParams.toString();
    const endpoint = query ? `/project?${query}` : "/project";
    const projects = await makeRestRequest(env, endpoint);
    const formatted = projects.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
        style: p.style,
        archived: p.archived,
        lead: p.lead?.displayName,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(formatted, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: get_project_versions
// ============================================================
const get_project_versions = async (params, env) => {
    const versions = await makeRestRequest(env, `/project/${encodeURIComponent(params.project_key)}/versions`);
    const formatted = versions.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        archived: v.archived,
        released: v.released,
        startDate: v.startDate,
        releaseDate: v.releaseDate,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(formatted, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: create_issue
// ============================================================
const create_issue = async (params, env) => {
    const fields = {
        project: { key: params.project_key },
        summary: params.summary,
        issuetype: { name: params.issue_type },
    };
    if (params.description) {
        fields.description = textToAdf(params.description);
    }
    if (params.assignee) {
        fields.assignee = { accountId: params.assignee };
    }
    if (params.components) {
        const componentNames = params.components
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
        fields.components = componentNames.map((name) => ({ name }));
    }
    // Parse additional_fields if provided (JSON string)
    if (params.additional_fields) {
        try {
            const extra = JSON.parse(params.additional_fields);
            for (const [key, value] of Object.entries(extra)) {
                if (key === "priority" && typeof value === "string") {
                    fields[key] = { name: value };
                }
                else if (key === "labels" && typeof value === "string") {
                    fields[key] = value.split(",").map((l) => l.trim());
                }
                else {
                    fields[key] = value;
                }
            }
        }
        catch (e) {
            throw new Error(`Failed to parse additional_fields: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    const result = await makeRestRequest(env, "/issue", {
        method: "POST",
        body: JSON.stringify({ fields }),
    });
    // Fetch the created issue for full details
    const created = await makeRestRequest(env, `/issue/${result.key}?fields=${DEFAULT_FIELDS.join(",")}`);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Issue created successfully",
                    issue: formatIssue(created, env.JIRA_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: batch_create_issues
// ============================================================
const batch_create_issues = async (params, env) => {
    let issuesList;
    try {
        issuesList = JSON.parse(params.issues);
    }
    catch (e) {
        throw new Error(`Failed to parse issues JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!Array.isArray(issuesList) || issuesList.length === 0) {
        throw new Error("Issues must be a non-empty JSON array");
    }
    const issueUpdates = issuesList.map((issue) => {
        const fields = {
            project: { key: issue.project_key },
            summary: issue.summary,
            issuetype: { name: issue.issue_type },
        };
        if (issue.description) {
            fields.description = textToAdf(issue.description);
        }
        if (issue.assignee) {
            fields.assignee = { accountId: issue.assignee };
        }
        return { fields };
    });
    const result = await makeRestRequest(env, "/issue/bulk", {
        method: "POST",
        body: JSON.stringify({ issueUpdates }),
    });
    const createdIssues = result.issues || [];
    const errors = result.errors || [];
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: `${createdIssues.length} issue(s) created, ${errors.length} error(s)`,
                    issues: createdIssues.map((i) => ({
                        id: i.id,
                        key: i.key,
                        self: i.self,
                    })),
                    errors,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: update_issue
// ============================================================
const update_issue = async (params, env) => {
    const updateFields = {};
    for (const [key, value] of Object.entries(params.fields)) {
        if (key === "summary") {
            updateFields.summary = value;
        }
        else if (key === "description") {
            updateFields.description =
                typeof value === "string" ? textToAdf(value) : value;
        }
        else if (key === "assignee") {
            updateFields.assignee = value ? { accountId: value } : null;
        }
        else if (key === "priority" && typeof value === "string") {
            updateFields.priority = { name: value };
        }
        else if (key === "labels" && typeof value === "string") {
            updateFields.labels = value
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);
        }
        else if (key === "components" && typeof value === "string") {
            updateFields.components = value
                .split(",")
                .map((c) => ({ name: c.trim() }))
                .filter((c) => c.name);
        }
        else if (key === "fixVersions" && typeof value === "string") {
            updateFields.fixVersions = value
                .split(",")
                .map((v) => ({ name: v.trim() }))
                .filter((v) => v.name);
        }
        else {
            updateFields[key] = value;
        }
    }
    if (params.additional_fields) {
        try {
            const extra = JSON.parse(params.additional_fields);
            Object.assign(updateFields, extra);
        }
        catch (e) {
            throw new Error(`Failed to parse additional_fields: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}`, {
        method: "PUT",
        body: JSON.stringify({ fields: updateFields }),
    });
    // Fetch the updated issue
    const updated = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?fields=${DEFAULT_FIELDS.join(",")}`);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Issue updated successfully",
                    issue: formatIssue(updated, env.JIRA_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: delete_issue
// ============================================================
const delete_issue = async (params, env) => {
    try {
        await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}`, { method: "DELETE" });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        message: `Issue ${params.issue_key} has been deleted successfully.`,
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
                        error: `Failed to delete issue ${params.issue_key}: ${error instanceof Error ? error.message : String(error)}`,
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
    const body = {
        body: textToAdf(params.comment),
    };
    if (params.visibility) {
        try {
            body.visibility = JSON.parse(params.visibility);
        }
        catch {
            body.visibility = { type: "role", value: params.visibility };
        }
    }
    const result = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/comment`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Comment added successfully",
                    comment: {
                        id: result.id,
                        author: result.author?.displayName,
                        body: adfToText(result.body),
                        created: result.created,
                    },
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: edit_comment
// ============================================================
const edit_comment = async (params, env) => {
    const body = {
        body: textToAdf(params.comment),
    };
    if (params.visibility) {
        try {
            body.visibility = JSON.parse(params.visibility);
        }
        catch {
            body.visibility = { type: "role", value: params.visibility };
        }
    }
    const result = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/comment/${encodeURIComponent(params.comment_id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Comment updated successfully",
                    comment: {
                        id: result.id,
                        author: result.author?.displayName,
                        body: adfToText(result.body),
                        updated: result.updated,
                    },
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: add_worklog
// ============================================================
const add_worklog = async (params, env) => {
    const body = {
        timeSpent: params.time_spent,
    };
    if (params.comment) {
        body.comment = textToAdf(params.comment);
    }
    if (params.started) {
        body.started = params.started;
    }
    const queryParams = new URLSearchParams();
    if (params.remaining_estimate) {
        queryParams.append("adjustEstimate", "new");
        queryParams.append("newEstimate", params.remaining_estimate);
    }
    else if (params.original_estimate) {
        queryParams.append("adjustEstimate", "manual");
        queryParams.append("reduceBy", params.original_estimate);
    }
    const query = queryParams.toString();
    const endpoint = `/issue/${encodeURIComponent(params.issue_key)}/worklog${query ? `?${query}` : ""}`;
    const result = await makeRestRequest(env, endpoint, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Worklog added successfully",
                    worklog: {
                        id: result.id,
                        author: result.author?.displayName,
                        timeSpent: result.timeSpent,
                        timeSpentSeconds: result.timeSpentSeconds,
                        started: result.started,
                    },
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: link_to_epic
// ============================================================
const link_to_epic = async (params, env) => {
    // Try updating the parent field (Jira Cloud next-gen / team-managed projects)
    try {
        await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}`, {
            method: "PUT",
            body: JSON.stringify({
                fields: {
                    parent: { key: params.epic_key },
                },
            }),
        });
    }
    catch {
        // Fallback: try the Epic Link custom field approach
        const allFields = await makeRestRequest(env, "/field");
        const epicLinkField = allFields.find((f) => f.name === "Epic Link" ||
            f.name === "epic link" ||
            (f.schema?.custom &&
                f.schema.custom.includes("com.pyxis.greenhopper.jira:gh-epic-link")));
        if (epicLinkField) {
            await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}`, {
                method: "PUT",
                body: JSON.stringify({
                    fields: {
                        [epicLinkField.id]: params.epic_key,
                    },
                }),
            });
        }
        else {
            throw new Error("Could not find Epic Link field. Try linking via issue links instead.");
        }
    }
    // Fetch the updated issue
    const updated = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?fields=${DEFAULT_FIELDS.join(",")},parent`);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: `Issue ${params.issue_key} linked to epic ${params.epic_key}`,
                    issue: formatIssue(updated, env.JIRA_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: create_issue_link
// ============================================================
const create_issue_link = async (params, env) => {
    const body = {
        type: { name: params.link_type },
        inwardIssue: { key: params.inward_issue_key },
        outwardIssue: { key: params.outward_issue_key },
    };
    if (params.comment) {
        body.comment = {
            body: textToAdf(params.comment),
        };
    }
    await makeRestRequest(env, "/issueLink", {
        method: "POST",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: `Link created: ${params.inward_issue_key} <-[${params.link_type}]-> ${params.outward_issue_key}`,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: create_remote_issue_link
// ============================================================
const create_remote_issue_link = async (params, env) => {
    const body = {
        object: {
            url: params.url,
            title: params.title,
        },
    };
    if (params.summary) {
        body.object.summary = params.summary;
    }
    if (params.relationship) {
        body.relationship = params.relationship;
    }
    if (params.icon_url) {
        body.object.icon = { url16x16: params.icon_url };
    }
    const result = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/remotelink`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: `Remote link created on ${params.issue_key}`,
                    link: {
                        id: result.id,
                        self: result.self,
                    },
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: remove_issue_link
// ============================================================
const remove_issue_link = async (params, env) => {
    try {
        await makeRestRequest(env, `/issueLink/${encodeURIComponent(params.link_id)}`, { method: "DELETE" });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        message: `Issue link ${params.link_id} removed successfully.`,
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
                        error: `Failed to remove issue link: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: transition_issue
// ============================================================
const transition_issue = async (params, env) => {
    const body = {
        transition: { id: params.transition_id },
    };
    if (params.fields) {
        try {
            body.fields = JSON.parse(params.fields);
        }
        catch (e) {
            throw new Error(`Failed to parse transition fields: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    if (params.comment) {
        body.update = {
            comment: [
                {
                    add: {
                        body: textToAdf(params.comment),
                    },
                },
            ],
        };
    }
    await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}/transitions`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    // Fetch the updated issue
    const updated = await makeRestRequest(env, `/issue/${encodeURIComponent(params.issue_key)}?fields=${DEFAULT_FIELDS.join(",")}`);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: `Issue ${params.issue_key} transitioned successfully`,
                    issue: formatIssue(updated, env.JIRA_BASE_URL),
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: create_sprint
// ============================================================
const create_sprint = async (params, env) => {
    const body = {
        name: params.sprint_name,
        originBoardId: parseInt(params.board_id, 10),
        startDate: params.start_date,
        endDate: params.end_date,
    };
    if (params.goal) {
        body.goal = params.goal;
    }
    const result = await makeAgileRequest(env, "/sprint", {
        method: "POST",
        body: JSON.stringify(body),
    });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    id: result.id,
                    name: result.name,
                    state: result.state,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    goal: result.goal,
                }, null, 2),
            },
        ],
    };
};
// ============================================================
// Tool: update_sprint
// ============================================================
const update_sprint = async (params, env) => {
    const body = {};
    if (params.sprint_name !== undefined)
        body.name = params.sprint_name;
    if (params.state !== undefined)
        body.state = params.state;
    if (params.start_date !== undefined)
        body.startDate = params.start_date;
    if (params.end_date !== undefined)
        body.endDate = params.end_date;
    if (params.goal !== undefined)
        body.goal = params.goal;
    try {
        const result = await makeAgileRequest(env, `/sprint/${encodeURIComponent(params.sprint_id)}`, {
            method: "POST",
            body: JSON.stringify(body),
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        id: result.id,
                        name: result.name,
                        state: result.state,
                        startDate: result.startDate,
                        endDate: result.endDate,
                        goal: result.goal,
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
                        error: `Failed to update sprint: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};
// ============================================================
// Tool: create_version
// ============================================================
const create_version = async (params, env) => {
    // First get the project ID
    const project = await makeRestRequest(env, `/project/${encodeURIComponent(params.project_key)}`);
    const body = {
        name: params.name,
        projectId: parseInt(project.id, 10),
    };
    if (params.start_date)
        body.startDate = params.start_date;
    if (params.release_date)
        body.releaseDate = params.release_date;
    if (params.description)
        body.description = params.description;
    try {
        const result = await makeRestRequest(env, "/version", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        version: {
                            id: result.id,
                            name: result.name,
                            description: result.description,
                            startDate: result.startDate,
                            releaseDate: result.releaseDate,
                            released: result.released,
                            archived: result.archived,
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
                        error: `Failed to create version: ${error instanceof Error ? error.message : String(error)}`,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
};

export { add_comment, add_worklog, batch_create_issues, batch_create_versions, batch_get_changelogs, create_issue, create_issue_link, create_remote_issue_link, create_sprint, create_version, delete_issue, edit_comment, get_agile_boards, get_all_projects, get_board_issues, get_issue, get_link_types, get_project_issues, get_project_versions, get_sprint_issues, get_sprints_from_board, get_transitions, get_user_profile, get_worklog, jira_get_issue_dates, jira_get_issue_sla, link_to_epic, remove_issue_link, search_fields, search_issues, transition_issue, update_issue, update_sprint };
//# sourceMappingURL=index.js.map
