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
  PRICING_ENDPOINT?: string;
}

import {
  PricingClient,
  GetProductsCommand,
  DescribeServicesCommand,
  GetAttributeValuesCommand,
  ListPriceListsCommand,
  GetPriceListFileUrlCommand,
} from "@aws-sdk/client-pricing";

const PRICING_API_REGIONS: Record<string, string[]> = {
  classic: ["us-east-1", "eu-central-1", "ap-southeast-1"],
  china: ["cn-northwest-1"],
};

function getPricingRegion(requestedRegion?: string): string {
  if (!requestedRegion) requestedRegion = "us-east-1";
  for (const group of Object.values(PRICING_API_REGIONS)) {
    if (group.includes(requestedRegion)) return requestedRegion;
  }
  if (requestedRegion.startsWith("cn-")) return "cn-northwest-1";
  if (requestedRegion.startsWith("eu-") || requestedRegion.startsWith("me-") || requestedRegion.startsWith("af-")) return "eu-central-1";
  if (requestedRegion.startsWith("ap-")) return "ap-south-1";
  if (requestedRegion.startsWith("eusc-")) return "eusc-de-east-1";
  return "us-east-1";
}

function createPricingClient(env: Environment): PricingClient {
  const region = getPricingRegion(env.AWS_REGION);
  return new PricingClient({
    region,
    endpoint: env.PRICING_ENDPOINT || undefined,
  });
}

function isFreeProduct(item: Record<string, any>): boolean {
  const ondemandTerms = item?.terms?.OnDemand;
  if (!ondemandTerms) return false;
  for (const offerKey of Object.keys(ondemandTerms)) {
    const priceDims = ondemandTerms[offerKey]?.priceDimensions || {};
    for (const dimKey of Object.keys(priceDims)) {
      const perUnit = priceDims[dimKey]?.pricePerUnit || {};
      for (const currency of Object.keys(perUnit)) {
        try {
          if (parseFloat(perUnit[currency]) > 0) return false;
        } catch {
          return false;
        }
      }
    }
  }
  return true;
}

function transformPricingData(
  priceList: string[],
  outputOptions?: Record<string, any>
): Record<string, any>[] {
  if (!priceList) return [];
  const parsed = priceList.map((s) => {
    const item = JSON.parse(s);
    delete item.serviceCode;
    return item;
  });
  if (!outputOptions) return parsed;

  const result: Record<string, any>[] = [];
  for (const item of parsed) {
    if (outputOptions.exclude_free_products && isFreeProduct(item)) continue;

    let filteredItem = item;
    if (outputOptions.pricing_terms && item.terms) {
      const filteredTerms: Record<string, any> = {};
      for (const termType of Object.keys(item.terms)) {
        filteredTerms[termType] = outputOptions.pricing_terms.includes(termType)
          ? item.terms[termType]
          : "<filtered>";
      }
      filteredItem = { ...item, terms: filteredTerms };
    }

    if (outputOptions.product_attributes && filteredItem.product?.attributes) {
      const attrs = filteredItem.product.attributes;
      const filteredAttrs: Record<string, string> = {};
      for (const attrName of outputOptions.product_attributes) {
        if (attrs[attrName] !== undefined) filteredAttrs[attrName] = attrs[attrName];
      }
      filteredItem = { ...filteredItem, product: { ...filteredItem.product, attributes: filteredAttrs } };
    }
    result.push(filteredItem);
  }
  return result;
}

function asError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function get_pricing(
  request: {
    service_code: string;
    region?: string | string[];
    filters?: { Field: string; Value: string | string[]; Type?: string }[];
    max_allowed_characters?: number;
    output_options?: Record<string, any>;
    max_results?: number;
    next_token?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const {
      service_code, region, filters, max_allowed_characters = 100000,
      output_options, max_results = 100, next_token,
    } = request;

    const client = createPricingClient(env);

    const apiFilters: any[] = [];
    if (region) {
      apiFilters.push({
        Field: "regionCode",
        Type: Array.isArray(region) ? "ANY_OF" : "EQUALS",
        Value: Array.isArray(region) ? region.join(",") : region,
      });
    }

    if (filters) {
      for (const f of filters) {
        apiFilters.push({
          Field: f.Field,
          Type: f.Type || "EQUALS",
          Value: Array.isArray(f.Value) ? f.Value.join(",") : f.Value,
        });
      }
    }

    const params: any = {
      ServiceCode: service_code,
      Filters: apiFilters,
      MaxResults: Math.min(Math.max(1, max_results), 100),
    };
    if (next_token) params.NextToken = next_token;

    const command = new GetProductsCommand(params);
    const response = await client.send(command);

    if (!response.PriceList || response.PriceList.length === 0) {
      return {
        content: [{ type: "text", text: `No results for "${service_code}"${region ? ` in ${JSON.stringify(region)}` : ""}` }],
        isError: true,
      };
    }

    const priceList = transformPricingData(response.PriceList, output_options);
    const totalChars = JSON.stringify(priceList).length;

    if (max_allowed_characters !== -1 && totalChars > max_allowed_characters) {
      return {
        content: [{ type: "text", text: `Response too large (${totalChars} chars). Use filters to reduce.` }],
        isError: true,
      };
    }

    const result: Record<string, any> = {
      status: "success",
      service_name: service_code,
      count: priceList.length,
      data: priceList,
    };
    if (response.NextToken) result.next_token = response.NextToken;

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `get_pricing failed: ${asError(e)}` }], isError: true };
  }
}

export async function get_pricing_service_codes(
  request: { filter?: string },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createPricingClient(env);
    const serviceCodes: string[] = [];
    let nextToken: string | undefined;

    do {
      const response = await client.send(new DescribeServicesCommand(nextToken ? { NextToken: nextToken } : {}));
      for (const svc of response.Services || []) serviceCodes.push(svc.ServiceCode!);
      nextToken = response.NextToken;
    } while (nextToken);

    let filtered = serviceCodes.sort();
    if (request.filter) {
      const regex = new RegExp(request.filter, "i");
      filtered = filtered.filter((c) => regex.test(c));
    }

    return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `get_pricing_service_codes failed: ${asError(e)}` }], isError: true };
  }
}

export async function get_pricing_service_attributes(
  request: { service_code: string; filter?: string },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createPricingClient(env);
    const response = await client.send(new DescribeServicesCommand({ ServiceCode: request.service_code }));

    if (!response.Services?.length) {
      return { content: [{ type: "text", text: `Service "${request.service_code}" not found` }], isError: true };
    }

    let attrs: string[] = response.Services[0].AttributeNames || [];
    if (request.filter) {
      const regex = new RegExp(request.filter, "i");
      attrs = attrs.filter((a) => regex.test(a));
    }

    return { content: [{ type: "text", text: JSON.stringify(attrs.sort(), null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `get_pricing_service_attributes failed: ${asError(e)}` }], isError: true };
  }
}

export async function get_pricing_attribute_values(
  request: {
    service_code: string;
    attribute_names: string[];
    filters?: Record<string, string>;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createPricingClient(env);
    const result: Record<string, string[]> = {};

    for (const attrName of request.attribute_names) {
      const values: string[] = [];
      let nextToken: string | undefined;

      do {
        const params: any = { ServiceCode: request.service_code, AttributeName: attrName, MaxResults: 10000 };
        if (nextToken) params.NextToken = nextToken;
        const response = await client.send(new GetAttributeValuesCommand(params));
        for (const av of response.AttributeValues || []) {
          if (av.Value) values.push(av.Value);
        }
        nextToken = response.NextToken;
      } while (nextToken);

      let filtered = values.sort();
      if (request.filters?.[attrName]) {
        const regex = new RegExp(request.filters[attrName], "i");
        filtered = filtered.filter((v) => regex.test(v));
      }
      result[attrName] = filtered;
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `get_pricing_attribute_values failed: ${asError(e)}` }], isError: true };
  }
}

export async function get_price_list_urls(
  request: {
    service_code: string;
    region: string;
    effective_date?: string;
  },
  env: Environment
): Promise<MCPResult> {
  try {
    const client = createPricingClient(env);
    const effectiveDate = request.effective_date
      ? new Date(request.effective_date)
      : new Date();
    const currency = request.region.startsWith("cn-") ? "CNY" : "USD";

    const listResponse = await client.send(new ListPriceListsCommand({
      ServiceCode: request.service_code,
      EffectiveDate: effectiveDate,
      RegionCode: request.region,
      CurrencyCode: currency,
    }));

    const priceLists = listResponse.PriceLists || [];
    if (!priceLists.length) {
      return { content: [{ type: "text", text: `No price lists for ${request.service_code} in ${request.region}` }], isError: true };
    }

    const pl = priceLists[0];
    const arn = pl.PriceListArn!;
    const formats: string[] = pl.FileFormats || [];
    const urls: Record<string, string> = {};

    for (const fmt of formats) {
      const urlResponse = await client.send(new GetPriceListFileUrlCommand({ PriceListArn: arn, FileFormat: fmt }));
      if (urlResponse.Url) urls[fmt.toLowerCase()] = urlResponse.Url;
    }

    return { content: [{ type: "text", text: JSON.stringify({ arn, urls }, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `get_price_list_urls failed: ${asError(e)}` }], isError: true };
  }
}
