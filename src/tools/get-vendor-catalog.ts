// ============================================================
// Tool: get_vendor_catalog
// Everything a vendor offers: models, modalities, prices + metadata.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { gateResults } from "../auth.js";
import type { Tier, VendorRegistry } from "../types.js";

export const getVendorCatalogSchema = {
  vendor: z
    .string()
    .describe("Vendor name, e.g. 'OpenAI', 'Together AI', 'Amazon Bedrock'"),
  modality: z
    .string()
    .optional()
    .describe("Optionally filter by modality: Text, Image, Audio, Video, Voice, Multimodal"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .optional()
    .describe("Optionally filter by pricing direction"),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum results (default 50)"),
};

export async function handleGetVendorCatalog(
  params: z.infer<z.ZodObject<typeof getVendorCatalogSchema>>,
  tier: Tier
) {
  // Get vendor metadata
  const vendors = await queryTable<VendorRegistry>("vendor_registry", [
    `vendor_name=ilike.*${params.vendor}*`,
  ]);

  if (vendors.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "get_vendor_catalog",
            error: `No vendor found matching '${params.vendor}'. Use list_vendors to see all available vendors.`,
          }),
        },
      ],
    };
  }

  const vendor = vendors[0];

  // Get all SKUs for this vendor
  const skuFilters: string[] = [
    `vendor_name=ilike.*${params.vendor}*`,
  ];
  if (params.modality) skuFilters.push(`modality=ilike.*${params.modality}*`);
  if (params.direction) skuFilters.push(`direction=eq.${params.direction}`);

  const skus = await queryTable<Record<string, unknown>>("sku_index", skuFilters, {
    select: "sku_id,vendor_name,model_name,modality,modality_subtype,direction,normalized_price,normalized_price_unit,billing_method",
    order: "model_name.asc,direction.asc",
    limit: params.limit,
  });

  // Build catalog summary
  const models = [...new Set(skus.map((s) => s.model_name as string))];
  const modalities = [...new Set(skus.map((s) => s.modality as string))];

  const catalogSummary = {
    vendor_name: vendor.vendor_name,
    country: vendor.country,
    region: vendor.region,
    pricing_page: vendor.pricing_page_url,
    website: vendor.vendor_url,
    total_models: models.length,
    total_skus: skus.length,
    modalities,
  };

  let catalog: unknown;

  if (tier === "paid") {
    catalog = {
      summary: catalogSummary,
      skus,
    };
  } else {
    catalog = {
      summary: catalogSummary,
      sample: gateResults(skus.slice(0, 3), "free"),
      upgrade_message:
        "Full catalog with pricing requires ATOM MCP Pro ($49/mo). Visit https://a7om.com/mcp",
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_vendor_catalog",
            tier,
            catalog,
          },
          null,
          2
        ),
      },
    ],
  };
}
