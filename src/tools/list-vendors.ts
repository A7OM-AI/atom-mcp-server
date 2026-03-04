// ============================================================
// Tool: list_vendors
// All tracked vendors with metadata. Simple discovery tool.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import type { Tier, VendorRegistry } from "../types.js";

export const listVendorsSchema = {
  region: z
    .string()
    .optional()
    .describe("Optionally filter by region: 'North America', 'Europe', 'Asia', etc."),
  country: z
    .string()
    .optional()
    .describe("Optionally filter by country, e.g. 'United States', 'China', 'France'"),
};

export async function handleListVendors(
  params: z.infer<z.ZodObject<typeof listVendorsSchema>>,
  tier: Tier
) {
  const filters: string[] = [];
  if (params.region) filters.push(`region=ilike.*${params.region}*`);
  if (params.country) filters.push(`country=ilike.*${params.country}*`);

  const vendors = await queryTable<VendorRegistry>("vendor_registry", filters, {
    order: "vendor_name.asc",
  });

  // Vendor list is public info — no gating needed.
  const formatted = vendors.map((v) => ({
    vendor_id: v.vendor_id,
    name: v.vendor_name,
    country: v.country,
    region: v.region,
    pricing_page: v.pricing_page_url,
    website: v.vendor_url,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "list_vendors",
            tier,
            total: formatted.length,
            vendors: formatted,
          },
          null,
          2
        ),
      },
    ],
  };
}
