
// Types for GitHub API responses
interface GitHubUser {
	login: string;
	id: number;
	name?: string;
	email?: string;
	bio?: string;
	company?: string;
	location?: string;
	blog?: string;
	public_repos: number;
	followers: number;
	following: number;
}

interface GitHubRepository {
	id: number;
	name: string;
	full_name: string;
	description?: string;
	html_url: string;
	clone_url: string;
	ssh_url: string;
	language?: string;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	default_branch: string;
	created_at: string;
	updated_at: string;
}

interface GitHubCommit {
	sha: string;
	commit: {
		author: {
			name: string;
			email: string;
			date: string;
		};
		message: string;
	};
	html_url: string;
}

interface GitHubIssue {
	number: number;
	title: string;
	body?: string;
	state: "open" | "closed";
	user: {
		login: string;
	};
	labels: Array<{
		name: string;
		color: string;
	}>;
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface GitHubPullRequest {
	number: number;
	title: string;
	body?: string;
	state: "open" | "closed" | "merged";
	head: {
		ref: string;
		sha: string;
	};
	base: {
		ref: string;
		sha: string;
	};
	user: {
		login: string;
	};
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface GitHubWorkflow {
	id: number;
	name: string;
	path: string;
	state: "active" | "deleted" | "disabled_fork" | "disabled_inactivity" | "disabled_manually";
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface GitHubWorkflowRun {
	id: number;
	name?: string;
	head_branch: string;
	head_sha: string;
	status: string;
	conclusion?: string;
	workflow_id: number;
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface GitHubGist {
	id: string;
	html_url: string;
	description?: string;
	public: boolean;
	created_at: string;
	updated_at: string;
	files: Record<string, {
		filename: string;
		type: string;
		language?: string;
		raw_url: string;
		size: number;
	}>;
}

// Types for Jilebi Environment
interface Environment {
	GITHUB_TOKEN: string;
}

// Helper function to make GitHub API requests
async function makeGitHubRequest(token: string, endpoint: string, options: RequestInit = {}): Promise<any> {
	if (!token) {
		throw new Error("GITHUB_TOKEN environment variable is required");
	}

	const response = await fetch(`https://api.github.com${endpoint}`, {
		...options,
		headers: {
			'Authorization': `token ${token}`,
			'Accept': 'application/vnd.github.v3+json',
			'User-Agent': 'jilebi-github-plugin',
			...options.headers,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${error}`);
	}

	return response.json();
}

export const get_me = async (request: any, env: Environment) => {
	try {
		const user: GitHubUser = await makeGitHubRequest(env.GITHUB_TOKEN, '/user');

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					login: user.login,
					id: user.id,
					name: user.name,
					email: user.email,
					bio: user.bio,
					company: user.company,
					location: user.location,
					blog: user.blog,
					public_repos: user.public_repos,
					followers: user.followers,
					following: user.following,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to get user information");
	}
};

export const search_repositories = async (params: {
	query: string;
	sort?: "stars" | "forks" | "help-wanted-issues" | "updated";
	order?: "asc" | "desc";
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams({
			q: params.query,
			...(params.sort && { sort: params.sort }),
			...(params.order && { order: params.order }),
			...(params.page && { page: params.page.toString() }),
			...(params.per_page && { per_page: params.per_page.toString() }),
		});

		const result = await makeGitHubRequest(env.GITHUB_TOKEN, `/search/repositories?${searchParams}`);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					total_count: result.total_count,
					repositories: result.items.map((repo: any) => ({
						id: repo.id,
						name: repo.name,
						full_name: repo.full_name,
						description: repo.description,
						html_url: repo.html_url,
						clone_url: repo.clone_url,
						ssh_url: repo.ssh_url,
						language: repo.language,
						stargazers_count: repo.stargazers_count,
						forks_count: repo.forks_count,
						open_issues_count: repo.open_issues_count,
						default_branch: repo.default_branch,
						created_at: repo.created_at,
						updated_at: repo.updated_at,
					}))
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to search repositories");
	}
};

export const get_file_contents = async (params: {
	owner: string;
	repo: string;
	path: string;
	ref?: string;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams({
			...(params.ref && { ref: params.ref }),
		});

		const endpoint = `/repos/${params.owner}/${params.repo}/contents/${params.path}${searchParams.toString() ? `?${searchParams}` : ''}`;
		const result = await makeGitHubRequest(env.GITHUB_TOKEN, endpoint);

		// Decode base64 content if it's a file
		const content = result.content ? atob(result.content.replace(/\n/g, '')) : null;

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					name: result.name,
					path: result.path,
					sha: result.sha,
					size: result.size,
					content: content,
					encoding: result.encoding,
					download_url: result.download_url,
					html_url: result.html_url,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to get file contents");
	}
};

export const list_commits = async (params: {
	owner: string;
	repo: string;
	sha?: string;
	path?: string;
	since?: string;
	until?: string;
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams();
		if (params.sha) searchParams.append('sha', params.sha);
		if (params.path) searchParams.append('path', params.path);
		if (params.since) searchParams.append('since', params.since);
		if (params.until) searchParams.append('until', params.until);
		if (params.page) searchParams.append('page', params.page.toString());
		if (params.per_page) searchParams.append('per_page', params.per_page.toString());

		const endpoint = `/repos/${params.owner}/${params.repo}/commits${searchParams.toString() ? `?${searchParams}` : ''}`;
		const commits = await makeGitHubRequest(env.GITHUB_TOKEN, endpoint);

		return {
			content: [{
				type: "text",
				text: JSON.stringify(commits.map((commit: any) => ({
					sha: commit.sha,
					commit: {
						author: {
							name: commit.commit.author.name,
							email: commit.commit.author.email,
							date: commit.commit.author.date,
						},
						message: commit.commit.message,
					},
					html_url: commit.html_url,
				})))
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to list commits");
	}
};

export const get_commit = async (params: {
	owner: string;
	repo: string;
	sha: string;
}, env: Environment) => {
	try {
		const commit = await makeGitHubRequest(env.GITHUB_TOKEN, `/repos/${params.owner}/${params.repo}/commits/${params.sha}`);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					sha: commit.sha,
					commit: {
						author: {
							name: commit.commit.author.name,
							email: commit.commit.author.email,
							date: commit.commit.author.date,
						},
						committer: {
							name: commit.commit.committer.name,
							email: commit.commit.committer.email,
							date: commit.commit.committer.date,
						},
						message: commit.commit.message,
						tree: {
							sha: commit.commit.tree.sha,
						},
					},
					html_url: commit.html_url,
					stats: {
						total: commit.stats?.total,
						additions: commit.stats?.additions,
						deletions: commit.stats?.deletions,
					},
					files: commit.files?.map((file: any) => ({
						filename: file.filename,
						status: file.status,
						additions: file.additions,
						deletions: file.deletions,
						changes: file.changes,
						patch: file.patch,
					}))
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to get commit");
	}
};

export const search_issues = async (params: {
	query: string;
	sort?: "comments" | "reactions" | "reactions-+1" | "reactions--1" | "reactions-smile" | "reactions-thinking_face" | "reactions-heart" | "reactions-tada" | "interactions" | "created" | "updated";
	order?: "asc" | "desc";
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams({
			q: params.query,
			...(params.sort && { sort: params.sort }),
			...(params.order && { order: params.order }),
			...(params.page && { page: params.page.toString() }),
			...(params.per_page && { per_page: params.per_page.toString() }),
		});

		const result = await makeGitHubRequest(env.GITHUB_TOKEN, `/search/issues?${searchParams}`);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					total_count: result.total_count,
					issues: result.items.map((issue: any) => ({
						number: issue.number,
						title: issue.title,
						body: issue.body,
						state: issue.state,
						user: {
							login: issue.user.login,
						},
						labels: issue.labels.map((label: any) => ({
							name: label.name,
							color: label.color,
						})),
						created_at: issue.created_at,
						updated_at: issue.updated_at,
						html_url: issue.html_url,
					}))
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to search issues");
	}
};

export const create_issue = async (params: {
	owner: string;
	repo: string;
	title: string;
	body?: string;
	assignees?: string[];
	milestone?: number;
	labels?: string[];
}, env: Environment) => {
	try {
		const body = {
			title: params.title,
			...(params.body && { body: params.body }),
			...(params.assignees && { assignees: params.assignees }),
			...(params.milestone && { milestone: params.milestone }),
			...(params.labels && { labels: params.labels }),
		};

		const issue = await makeGitHubRequest(env.GITHUB_TOKEN, `/repos/${params.owner}/${params.repo}/issues`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					number: issue.number,
					title: issue.title,
					body: issue.body,
					state: issue.state,
					user: {
						login: issue.user.login,
					},
					labels: issue.labels.map((label: any) => ({
						name: label.name,
						color: label.color,
					})),
					created_at: issue.created_at,
					updated_at: issue.updated_at,
					html_url: issue.html_url,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to create issue");
	}
};

export const get_issue = async (params: {
	owner: string;
	repo: string;
	issue_number: number;
}, env: Environment) => {
	try {
		const issue = await makeGitHubRequest(env.GITHUB_TOKEN, `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					number: issue.number,
					title: issue.title,
					body: issue.body,
					state: issue.state,
					user: {
						login: issue.user.login,
					},
					assignees: issue.assignees?.map((assignee: any) => ({
						login: assignee.login,
					})),
					labels: issue.labels.map((label: any) => ({
						name: label.name,
						color: label.color,
					})),
					milestone: issue.milestone ? {
						number: issue.milestone.number,
						title: issue.milestone.title,
					} : null,
					created_at: issue.created_at,
					updated_at: issue.updated_at,
					html_url: issue.html_url,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to get issue");
	}
};

export const create_pull_request = async (params: {
	owner: string;
	repo: string;
	title: string;
	head: string;
	base: string;
	body?: string;
	maintainer_can_modify?: boolean;
	draft?: boolean;
}, env: Environment) => {
	try {
		const body = {
			title: params.title,
			head: params.head,
			base: params.base,
			...(params.body && { body: params.body }),
			...(params.maintainer_can_modify !== undefined && { maintainer_can_modify: params.maintainer_can_modify }),
			...(params.draft !== undefined && { draft: params.draft }),
		};

		const pr = await makeGitHubRequest(env.GITHUB_TOKEN, `/repos/${params.owner}/${params.repo}/pulls`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					number: pr.number,
					title: pr.title,
					body: pr.body,
					state: pr.state,
					head: {
						ref: pr.head.ref,
						sha: pr.head.sha,
					},
					base: {
						ref: pr.base.ref,
						sha: pr.base.sha,
					},
					user: {
						login: pr.user.login,
					},
					created_at: pr.created_at,
					updated_at: pr.updated_at,
					html_url: pr.html_url,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to create pull request");
	}
};

export const get_pull_request = async (params: {
	owner: string;
	repo: string;
	pull_number: number;
}, env: Environment) => {
	try {
		const pr = await makeGitHubRequest(env.GITHUB_TOKEN, `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					number: pr.number,
					title: pr.title,
					body: pr.body,
					state: pr.state,
					head: {
						ref: pr.head.ref,
						sha: pr.head.sha,
					},
					base: {
						ref: pr.base.ref,
						sha: pr.base.sha,
					},
					user: {
						login: pr.user.login,
					},
					mergeable: pr.mergeable,
					merged: pr.merged,
					merged_at: pr.merged_at,
					draft: pr.draft,
					created_at: pr.created_at,
					updated_at: pr.updated_at,
					html_url: pr.html_url,
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to get pull request");
	}
};

export const list_workflows = async (params: {
	owner: string;
	repo: string;
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams();
		if (params.page) searchParams.append('page', params.page.toString());
		if (params.per_page) searchParams.append('per_page', params.per_page.toString());

		const endpoint = `/repos/${params.owner}/${params.repo}/actions/workflows${searchParams.toString() ? `?${searchParams}` : ''}`;
		const result = await makeGitHubRequest(env.GITHUB_TOKEN, endpoint);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					total_count: result.total_count,
					workflows: result.workflows.map((workflow: any) => ({
						id: workflow.id,
						name: workflow.name,
						path: workflow.path,
						state: workflow.state,
						created_at: workflow.created_at,
						updated_at: workflow.updated_at,
						html_url: workflow.html_url,
					}))
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to list workflows");
	}
};

export const list_workflow_runs = async (params: {
	owner: string;
	repo: string;
	workflow_id?: string;
	actor?: string;
	branch?: string;
	event?: string;
	status?: "completed" | "action_required" | "cancelled" | "failure" | "neutral" | "skipped" | "stale" | "success" | "timed_out" | "in_progress" | "queued" | "requested" | "waiting";
	page?: number;
	per_page?: number;
}, env: Environment) => {
	try {
		const searchParams = new URLSearchParams();
		if (params.actor) searchParams.append('actor', params.actor);
		if (params.branch) searchParams.append('branch', params.branch);
		if (params.event) searchParams.append('event', params.event);
		if (params.status) searchParams.append('status', params.status);
		if (params.page) searchParams.append('page', params.page.toString());
		if (params.per_page) searchParams.append('per_page', params.per_page.toString());

		const endpoint = params.workflow_id
			? `/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/runs`
			: `/repos/${params.owner}/${params.repo}/actions/runs`;

		const finalEndpoint = `${endpoint}${searchParams.toString() ? `?${searchParams}` : ''}`;
		const result = await makeGitHubRequest(env.GITHUB_TOKEN, finalEndpoint);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					total_count: result.total_count,
					workflow_runs: result.workflow_runs.map((run: any) => ({
						id: run.id,
						name: run.name,
						head_branch: run.head_branch,
						head_sha: run.head_sha,
						status: run.status,
						conclusion: run.conclusion,
						workflow_id: run.workflow_id,
						created_at: run.created_at,
						updated_at: run.updated_at,
						html_url: run.html_url,
					}))
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to list workflow runs");
	}
};

export const create_gist = async (params: {
	description?: string;
	public: boolean;
	files: Record<string, { content: string }>;
}, env: Environment) => {
	try {
		const body = {
			description: params.description || "",
			public: params.public,
			files: params.files,
		};

		const gist = await makeGitHubRequest(env.GITHUB_TOKEN, '/gists', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					id: gist.id,
					html_url: gist.html_url,
					description: gist.description,
					public: gist.public,
					created_at: gist.created_at,
					updated_at: gist.updated_at,
					files: Object.fromEntries(
						Object.entries(gist.files).map(([key, file]: [string, any]) => [
							key,
							{
								filename: file.filename,
								type: file.type,
								language: file.language,
								raw_url: file.raw_url,
								size: file.size,
							}
						])
					),
				})
			}]
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Failed to create gist");
	}
};