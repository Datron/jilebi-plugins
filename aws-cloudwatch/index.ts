interface MCPTextContent {
  type: "text";
  text: string;
}

interface MCPResult {
  content: MCPTextContent[];
  isError?: boolean;
}

interface Environment {
  AWS_REGION?: string;
  AWS_PROFILE?: string;
}

import {
  CloudWatchClient,
  GetMetricDataCommand,
  DescribeAlarmsCommand,
  DescribeAlarmHistoryCommand,
  HistoryItemType,
} from "@aws-sdk/client-cloudwatch";

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  StartQueryCommand,
  GetQueryResultsCommand,
  StopQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";

function createCWClient(env: Environment, region?: string): CloudWatchClient {
  return new CloudWatchClient({ region: region || env.AWS_REGION || "us-east-1" });
}

function createLogsClient(env: Environment, region?: string): CloudWatchLogsClient {
  return new CloudWatchLogsClient({ region: region || env.AWS_REGION || "us-east-1" });
}

function asError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function epochMsToUtcIso(ms: number): string {
  return new Date(ms).toISOString();
}

export async function get_metric_data(
  request: {
    namespace: string;
    metric_name: string;
    dimensions?: { Name: string; Value: string }[];
    start_time?: string;
    end_time?: string;
    statistic?: string;
    period?: number;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createCWClient(env, request.region);
    const endTime = request.end_time ? new Date(request.end_time) : new Date();
    const startTime = request.start_time
      ? new Date(request.start_time)
      : new Date(endTime.getTime() - 3 * 60 * 60 * 1000);
    const stat = request.statistic || "Average";

    const response = await client.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: "m1",
            MetricStat: {
              Metric: {
                Namespace: request.namespace,
                MetricName: request.metric_name,
                Dimensions: request.dimensions?.map((d) => ({ Name: d.Name, Value: d.Value })),
              },
              Period: request.period || 300,
              Stat: stat,
            },
          },
        ],
      })
    );

    const results = (response.MetricDataResults || []).map((r) => ({
      id: r.Id,
      label: r.Label,
      statusCode: r.StatusCode,
      timestamps: (r.Timestamps || []).map((t) => t.toISOString()),
      values: r.Values || [],
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              metric: `${request.namespace}/${request.metric_name}`,
              statistic: stat,
              period: request.period || 300,
              results,
              messages: response.Messages || [],
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return { content: [{ type: "text", text: `get_metric_data failed: ${asError(e)}` }], isError: true };
  }
}

export async function describe_log_groups(
  request: {
    log_group_name_prefix?: string;
    limit?: number;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createLogsClient(env, request.region);

    const response = await client.send(
      new DescribeLogGroupsCommand({
        logGroupNamePrefix: request.log_group_name_prefix,
        limit: request.limit || 50,
      })
    );

    const logGroups = (response.logGroups || []).map((lg) => ({
      logGroupName: lg.logGroupName,
      creationTime: lg.creationTime ? epochMsToUtcIso(lg.creationTime) : null,
      metricFilterCount: lg.metricFilterCount,
      storedBytes: lg.storedBytes,
      logGroupArn: lg.logGroupArn,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ logGroups, nextToken: response.nextToken || null }, null, 2),
        },
      ],
    };
  } catch (e) {
    return { content: [{ type: "text", text: `describe_log_groups failed: ${asError(e)}` }], isError: true };
  }
}

export async function execute_log_insights_query(
  request: {
    log_group_names: string[];
    query_string: string;
    start_time: string;
    end_time: string;
    limit?: number;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createLogsClient(env, request.region);
    const startTs = Math.floor(new Date(request.start_time).getTime() / 1000);
    const endTs = Math.floor(new Date(request.end_time).getTime() / 1000);

    const response = await client.send(
      new StartQueryCommand({
        logGroupNames: request.log_group_names,
        queryString: request.query_string,
        startTime: startTs,
        endTime: endTs,
        limit: request.limit,
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              queryId: response.queryId,
              status: "Started",
              message: `Query started. Use get_logs_insight_query_results with queryId: ${response.queryId} to retrieve results.`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `execute_log_insights_query failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function get_logs_insight_query_results(
  request: {
    query_id: string;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createLogsClient(env, request.region);
    const response = await client.send(new GetQueryResultsCommand({ queryId: request.query_id }));

    const results = (response.results || []).map((row) => {
      const obj: Record<string, string> = {};
      for (const field of row || []) {
        if (field.field && field.value) obj[field.field] = field.value;
      }
      return obj;
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              queryId: request.query_id,
              status: response.status,
              statistics: response.statistics || {},
              results,
              resultCount: results.length,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [
        { type: "text", text: `get_logs_insight_query_results failed: ${asError(e)}` },
      ],
      isError: true,
    };
  }
}

export async function cancel_logs_insight_query(
  request: {
    query_id: string;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createLogsClient(env, request.region);
    await client.send(new StopQueryCommand({ queryId: request.query_id }));

    return {
      content: [
        { type: "text", text: JSON.stringify({ queryId: request.query_id, status: "Cancelled" }, null, 2) },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `cancel_logs_insight_query failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function get_active_alarms(
  request: {
    max_items?: number;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createCWClient(env, request.region);
    const maxItems = request.max_items || 50;

    const response = await client.send(
      new DescribeAlarmsCommand({
        StateValue: "ALARM",
        AlarmTypes: ["CompositeAlarm", "MetricAlarm"],
        MaxRecords: maxItems,
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              metricAlarms: (response.MetricAlarms || []).map((a) => ({
                alarmName: a.AlarmName,
                alarmArn: a.AlarmArn,
                stateValue: a.StateValue,
                stateReason: a.StateReason,
                metricName: a.MetricName,
                namespace: a.Namespace,
                region: request.region || env.AWS_REGION || "us-east-1",
              })),
              compositeAlarms: (response.CompositeAlarms || []).map((a) => ({
                alarmName: a.AlarmName,
                alarmArn: a.AlarmArn,
                stateValue: a.StateValue,
                stateReason: a.StateReason,
                region: request.region || env.AWS_REGION || "us-east-1",
              })),
              count:
                (response.MetricAlarms?.length || 0) +
                (response.CompositeAlarms?.length || 0),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `get_active_alarms failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function get_alarm_history(
  request: {
    alarm_name: string;
    start_time?: string;
    end_time?: string;
    history_item_type?: string;
    max_results?: number;
    region?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createCWClient(env, request.region);
    const endTime = request.end_time ? new Date(request.end_time) : new Date();
    const startTime = request.start_time
      ? new Date(request.start_time)
      : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const response = await client.send(
      new DescribeAlarmHistoryCommand({
        AlarmName: request.alarm_name,
        StartDate: startTime,
        EndDate: endTime,
        HistoryItemType: (request.history_item_type || "StateUpdate") as HistoryItemType,
        MaxRecords: request.max_results || 50,
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              alarmName: request.alarm_name,
              alarmHistory: (response.AlarmHistoryItems || []).map((item) => ({
                alarmName: item.AlarmName,
                alarmType: item.AlarmType,
                timestamp: item.Timestamp?.toISOString(),
                historyItemType: item.HistoryItemType,
                historySummary: item.HistorySummary,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `get_alarm_history failed: ${asError(e)}` }],
      isError: true,
    };
  }
}
