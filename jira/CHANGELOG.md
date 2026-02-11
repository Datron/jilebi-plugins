# jira

## 1.1.0

### New Tools

- `batch_get_changelogs`: Fetch changelogs for multiple issues in bulk (Cloud only, POST /changelog/bulkfetch)
- `batch_create_versions`: Create multiple fix versions in a project at once
- `jira_get_issue_dates`: Get comprehensive date info including status change timeline and time-per-status summary
- `jira_get_issue_sla`: Calculate SLA/performance metrics (cycle_time, lead_time, time_in_status, due_date_compliance, resolution_time, first_response_time)

### New Prompts

- `issue-triage-workflow`: Triage and prioritize issues by analyzing details, status, and SLA metrics
- `sprint-planning-workflow`: Assist with sprint planning by analyzing backlog, sprint status, and capacity
- `bug-investigation-workflow`: Investigate a bug with full changelog, timeline, and linked issue analysis

### Internal

- Added `formatDuration()`, `parseChangelogToStatusChanges()`, and `aggregateStatusTimes()` helpers
- Added lazy-cached status category mapping for SLA resolution_time metric

## 1.0.0

### Minor Changes

- Initial release with 29 tools for Jira Cloud (REST API v3 and Agile API 1.0)
- Read tools: get_user_profile, get_issue, search_issues, search_fields, get_project_issues, get_transitions, get_worklog, get_agile_boards, get_board_issues, get_sprints_from_board, get_sprint_issues, get_link_types, get_all_projects, get_project_versions
- Write tools: create_issue, batch_create_issues, update_issue, delete_issue, add_comment, edit_comment, add_worklog, link_to_epic, create_issue_link, create_remote_issue_link, remove_issue_link, transition_issue, create_sprint, update_sprint, create_version
