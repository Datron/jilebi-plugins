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
  SupportClient,
  CreateCaseCommand,
  DescribeCasesCommand,
  DescribeSeverityLevelsCommand,
  AddCommunicationToCaseCommand,
  ResolveCaseCommand,
  DescribeServicesCommand,
  DescribeCommunicationsCommand,
  DescribeSupportedLanguagesCommand,
  DescribeCreateCaseOptionsCommand,
  AddAttachmentsToSetCommand,
  DescribeAttachmentCommand,
} from "@aws-sdk/client-support";

function createSupportClient(env: Environment): SupportClient {
  return new SupportClient({
    region: env.AWS_REGION || "us-east-1",
  });
}

function asError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const SERVICE_CODE_ALIASES: Record<string, string> = {
  ec2: "amazon-elastic-compute-cloud-linux",
  "amazon-ec2": "amazon-elastic-compute-cloud-linux",
  "ec2-linux": "amazon-elastic-compute-cloud-linux",
  "ec2-windows": "amazon-elastic-compute-cloud-windows",
  ecs: "ec2-container-service",
  "amazon-ecs": "ec2-container-service",
  eks: "amazon-elastic-kubernetes-service",
  s3: "amazon-simple-storage-service",
  lambda: "aws-lambda",
  dynamodb: "amazon-dynamodb",
  rds: "amazon-relational-database-service",
  iam: "aws-identity-and-access-management",
  vpc: "amazon-virtual-private-cloud",
  cloudformation: "aws-cloudformation",
  cloudwatch: "amazon-cloudwatch",
  route53: "amazon-route53",
  elb: "elastic-load-balancing",
  alb: "elastic-load-balancing",
  sqs: "amazon-simple-queue-service",
  sns: "amazon-simple-notification-service",
  cloudfront: "amazon-cloudfront",
  elasticache: "amazon-elasticache",
  bedrock: "amazon-bedrock",
  sagemaker: "amazon-sagemaker",
};

function resolveServiceCode(code: string): string {
  const normalized = code.toLowerCase().trim();
  return SERVICE_CODE_ALIASES[normalized] || code;
}

const PERMITTED_LANGUAGE_CODES = ["en", "ja", "zh", "es", "pt", "fr", "ko", "tr"];

const CASE_SUMMARY_TEMPLATE = `# Support Case Summary

{case_details}`;

function formatCase(caseData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {
    caseId: caseData.caseId || "",
    displayId: caseData.displayId || null,
    subject: caseData.subject || "",
    status: caseData.status || "",
    serviceCode: caseData.serviceCode || "",
    categoryCode: caseData.categoryCode || "",
    severityCode: caseData.severityCode || "",
    submittedBy: caseData.submittedBy || "",
    timeCreated: caseData.timeCreated || "",
    ccEmailAddresses: caseData.ccEmailAddresses || null,
    language: caseData.language || null,
  };

  if (caseData.recentCommunications) {
    result.recentCommunications = {
      communications: (caseData.recentCommunications.communications || []).map(
        (comm: Record<string, any>) => ({
          body: comm.body || "",
          caseId: comm.caseId || null,
          submittedBy: comm.submittedBy || null,
          timeCreated: comm.timeCreated || null,
          attachmentSet: (comm.attachmentSet || []).map(
            (att: Record<string, any>) => ({
              attachmentId: att.attachmentId || "",
              fileName: att.fileName || "",
            })
          ),
        })
      ),
      nextToken: caseData.recentCommunications.nextToken || null,
    };
  }

  return result;
}

function formatMarkdownCaseSummary(caseData: Record<string, any>): string {
  const details = [
    `- **Case ID**: ${caseData.caseId}`,
    `- **Display ID**: ${caseData.displayId || "N/A"}`,
    `- **Subject**: ${caseData.subject}`,
    `- **Status**: ${caseData.status}`,
    `- **Service**: ${caseData.serviceCode}`,
    `- **Category**: ${caseData.categoryCode}`,
    `- **Severity**: ${caseData.severityCode}`,
    `- **Created By**: ${caseData.submittedBy}`,
    `- **Created On**: ${caseData.timeCreated}`,
  ];

  let md = CASE_SUMMARY_TEMPLATE.replace("{case_details}", details.join("\n"));

  if (caseData.recentCommunications?.communications) {
    md += "\n## Recent Communications\n\n";
    for (const comm of caseData.recentCommunications.communications) {
      md += `### ${comm.submittedBy} - ${comm.timeCreated}\n\n${comm.body}\n\n`;
      if (comm.attachmentSet?.length) {
        md += "**Attachments**:\n\n";
        for (const att of comm.attachmentSet) {
          md += `- ${att.fileName} (ID: ${att.attachmentId})\n`;
        }
        md += "\n";
      }
    }
  }

  return md;
}

function formatMarkdownServices(services: Record<string, any>): string {
  let md = "# AWS Services\n\n";
  for (const [code, svc] of Object.entries(services).sort()) {
    const s = svc as Record<string, any>;
    md += `## ${s.name} (\`${code}\`)\n\n`;
    if (s.categories?.length) {
      md += "### Categories\n\n";
      for (const cat of (s.categories as Record<string, any>[]).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      )) {
        md += `- ${cat.name} (\`${cat.code}\`)\n`;
      }
      md += "\n";
    }
  }
  return md;
}

function formatMarkdownSeverityLevels(levels: Record<string, any>): string {
  let md = "# AWS Support Severity Levels\n\n";
  for (const [code, sev] of Object.entries(levels).sort()) {
    const s = sev as Record<string, any>;
    md += `- **${s.name}** (\`${code}\`)\n`;
  }
  return md;
}

export async function create_support_case(
  request: {
    subject: string;
    service_code: string;
    category_code: string;
    severity_code: string;
    communication_body: string;
    cc_email_addresses?: string[];
    language?: string;
    issue_type?: string;
    attachment_set_id?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const serviceCode = resolveServiceCode(request.service_code);

    const params: any = {
      subject: request.subject,
      serviceCode,
      categoryCode: request.category_code,
      severityCode: request.severity_code,
      communicationBody: request.communication_body,
      language: request.language || "en",
      issueType: request.issue_type || "technical",
    };

    if (request.cc_email_addresses?.length) params.ccEmailAddresses = request.cc_email_addresses;
    if (request.attachment_set_id) params.attachmentSetId = request.attachment_set_id;

    const response = await client.send(new CreateCaseCommand(params));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              caseId: response.caseId,
              status: "success",
              message: `Support case created: ${response.caseId}`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `create_support_case failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_support_cases(
  request: {
    case_id_list?: string[];
    display_id?: string;
    after_time?: string;
    before_time?: string;
    include_resolved_cases?: boolean;
    include_communications?: boolean;
    language?: string;
    max_results?: number;
    next_token?: string;
    format?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const params: any = {
      includeResolvedCases: request.include_resolved_cases ?? false,
      includeCommunications: request.include_communications ?? true,
      language: request.language || "en",
    };

    if (request.case_id_list?.length) params.caseIdList = request.case_id_list;
    if (request.display_id) params.displayId = request.display_id;
    if (request.after_time) params.afterTime = request.after_time;
    if (request.before_time) params.beforeTime = request.before_time;
    if (request.max_results) params.maxResults = Math.min(request.max_results, 100);
    if (request.next_token) params.nextToken = request.next_token;

    const response = await client.send(new DescribeCasesCommand(params));
    const cases = (response.cases || []).map((c: Record<string, any>) => formatCase(c));

    if (request.format?.toLowerCase() === "markdown" && cases.length) {
      return { content: [{ type: "text", text: formatMarkdownCaseSummary(cases[0]) }] };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ cases, nextToken: response.nextToken || null }, null, 2),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_support_cases failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_severity_levels(
  request: { language?: string; format?: string },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const response = await client.send(
      new DescribeSeverityLevelsCommand({ language: request.language || "en" })
    );

    const levels: Record<string, any> = {};
    for (const sl of response.severityLevels || []) {
      levels[sl.code!] = { code: sl.code, name: sl.name };
    }

    if (request.format?.toLowerCase() === "markdown") {
      return { content: [{ type: "text", text: formatMarkdownSeverityLevels(levels) }] };
    }

    return { content: [{ type: "text", text: JSON.stringify(levels, null, 2) }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_severity_levels failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function add_communication_to_case(
  request: {
    case_id: string;
    communication_body: string;
    cc_email_addresses?: string[];
    attachment_set_id?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const params: any = {
      caseId: request.case_id,
      communicationBody: request.communication_body,
    };
    if (request.cc_email_addresses?.length) params.ccEmailAddresses = request.cc_email_addresses;
    if (request.attachment_set_id) params.attachmentSetId = request.attachment_set_id;

    const response = await client.send(new AddCommunicationToCaseCommand(params));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              result: response.result,
              status: "success",
              message: `Communication added to case: ${request.case_id}`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `add_communication_to_case failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function resolve_support_case(
  request: { case_id: string },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const response = await client.send(new ResolveCaseCommand({ caseId: request.case_id }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              initialCaseStatus: response.initialCaseStatus,
              finalCaseStatus: response.finalCaseStatus,
              status: "success",
              message: `Case resolved: ${request.case_id}`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `resolve_support_case failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_services(
  request: {
    service_code_list?: string[];
    language?: string;
    format?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const params: any = { language: request.language || "en" };
    if (request.service_code_list?.length) {
      params.serviceCodeList = request.service_code_list.map(resolveServiceCode);
    }

    const response = await client.send(new DescribeServicesCommand(params));

    const services: Record<string, any> = {};
    for (const svc of response.services || []) {
      services[svc.code!] = {
        code: svc.code,
        name: svc.name,
        categories: (svc.categories || []).map((cat: Record<string, any>) => ({
          code: cat.code,
          name: cat.name,
        })),
      };
    }

    if (request.format?.toLowerCase() === "markdown") {
      return { content: [{ type: "text", text: formatMarkdownServices(services) }] };
    }

    return { content: [{ type: "text", text: JSON.stringify(services, null, 2) }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_services failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_communications(
  request: {
    case_id: string;
    after_time?: string;
    before_time?: string;
    max_results?: number;
    next_token?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const params: any = { caseId: request.case_id };
    if (request.after_time) params.afterTime = request.after_time;
    if (request.before_time) params.beforeTime = request.before_time;
    if (request.max_results) params.maxResults = Math.min(request.max_results, 100);
    if (request.next_token) params.nextToken = request.next_token;

    const response = await client.send(new DescribeCommunicationsCommand(params));
    const communications = (response.communications || []).map(
      (comm: Record<string, any>) => ({
        body: comm.body || "",
        caseId: comm.caseId || null,
        submittedBy: comm.submittedBy || null,
        timeCreated: comm.timeCreated || null,
        attachmentSet: (comm.attachmentSet || []).map(
          (att: Record<string, any>) => ({
            attachmentId: att.attachmentId || "",
            fileName: att.fileName || "",
          })
        ),
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { communications, nextToken: response.nextToken || null },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_communications failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_supported_languages(
  request: {
    service_code: string;
    category_code: string;
    issue_type?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const response = await client.send(
      new DescribeSupportedLanguagesCommand({
        serviceCode: resolveServiceCode(request.service_code),
        categoryCode: request.category_code,
        issueType: request.issue_type || "technical",
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { supportedLanguages: response.supportedLanguages || [] },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_supported_languages failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_create_case_options(
  request: {
    service_code: string;
    language?: string;
    category_code?: string;
    issue_type?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const params: any = {
      serviceCode: resolveServiceCode(request.service_code),
      language: request.language || "en",
    };
    if (request.category_code) params.categoryCode = request.category_code;
    if (request.issue_type) params.issueType = request.issue_type;

    const response = await client.send(new DescribeCreateCaseOptionsCommand(params));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              communicationTypes: response.communicationTypes || [],
              languageAvailability: response.languageAvailability || "",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_create_case_options failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function add_attachments_to_set(
  request: {
    attachments: { fileName: string; data: string }[];
    attachment_set_id?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const decodedAttachments = request.attachments.map((att) => ({
      data: Uint8Array.from(atob(att.data), (c) => c.charCodeAt(0)),
      fileName: att.fileName,
    }));

    const params: any = { attachments: decodedAttachments };
    if (request.attachment_set_id) params.attachmentSetId = request.attachment_set_id;

    const response = await client.send(new AddAttachmentsToSetCommand(params));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              attachmentSetId: response.attachmentSetId,
              expiryTime: response.expiryTime,
              status: "success",
              message: `Attachments added to set: ${response.attachmentSetId}`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `add_attachments_to_set failed: ${asError(e)}` }],
      isError: true,
    };
  }
}

export async function describe_attachment(
  request: { attachment_id: string },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createSupportClient(env);
    const response = await client.send(
      new DescribeAttachmentCommand({ attachmentId: request.attachment_id })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ attachment: response.attachment || {} }, null, 2),
        },
      ],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `describe_attachment failed: ${asError(e)}` }],
      isError: true,
    };
  }
}
