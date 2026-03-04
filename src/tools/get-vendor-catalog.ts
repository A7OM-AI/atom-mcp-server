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
    .number()
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
  const filters: string[] = [`vendor_id=eq.${vendor.vendor_id}`];
  if (params.modality) filters.push(`modality=ilike.*${params.modality}*`);
  if (params.direction) filters.push(`direction=eq.${params.direction}`);

  const skus = await queryTable<Record<string, unknown>>("sku_index", filters, {
    order: "modality.asc,model_name.asc,direction.asc",
    limit: params.limit,
  });

  const gated = gateResults(skus as any, tier);

  // Build catalog summary (available to all tiers)
  const catalogSummary = {
    models: [...new Set(skus.map((s) => s.model_name as string))].length,
    skus: skus.length,
    modalities: [...new Set(skus.map((s) => s.modality as string))],
    modality_subtypes: [...new Set(skus.map((s) => s.modality_subtype as string))],
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_vendor_catalog",
            tier,
            vendor: {
              name: vendor.vendor_name,
              country: vendor.country,
              region: vendor.region,
              pricing_page: vendor.pricing_page_url,
              specs_page: vendor.model_specifications_url,
            },
            catalog_summary: catalogSummary,
            skus: gated.data,
          },
          null,
          2
        ),
      },
    ],
  };
}
