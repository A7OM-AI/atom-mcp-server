// ============================================================
// Tool: compare_prices
// Cross-vendor price comparison for a model or model family.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { gateResults, freeTierNote } from "../auth.js";
import type { Tier, SkuIndex } from "../types.js";

export const comparePricesSchema = {
  model_name: z
    .string()
    .optional()
    .describe("Model name to compare prices for, e.g. 'GPT-4o', 'Llama 3.1 70B'"),
  model_family: z
    .string()
    .optional()
    .describe("Model family to compare, e.g. 'GPT-4o', 'Claude 3.5'"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .optional()
    .describe("Filter by pricing direction"),
  modality: z
    .string()
    .optional()
    .describe("Filter by modality: Text, Image, Audio, etc."),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum results (default 50)"),
};

export async function handleComparePrices(
  params: z.infer<z.ZodObject<typeof comparePricesSchema>>,
  tier: Tier
) {
  if (!params.model_name && !params.model_family) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "compare_prices",
            error: "Please provide either model_name or model_family to compare.",
          }),
        },
      ],
    };
  }

  const filters: string[] = [];
  if (params.model_name) filters.push(`model_name=ilike.*${params.model_name}*`);
  if (params.direction) filters.push(`direction=eq.${params.direction}`);
  if (params.modality) filters.push(`modality=ilike.*${params.modality}*`);
  filters.push("normalized_price=gt.0");

  let skus = await queryTable<SkuIndex>("sku_index", filters, {
    select: "sku_id,vendor_name,model_name,modality,direction,normalized_price,normalized_price_unit,billing_method",
    order: "normalized_price.asc",
    limit: params.limit,
  });

  // If model_family was provided, filter by model registry
  if (params.model_family && !params.model_name) {
    const models = await queryTable<{ model_id: string }>("model_registry", [
      `model_family=ilike.*${params.model_family}*`,
    ], {
      select: "model_id",
    });
    const modelIds = new Set(models.map((m) => m.model_id));

    // Re-query SKUs without model_name filter
    const familyFilters: string[] = [];
    if (params.direction) familyFilters.push(`direction=eq.${params.direction}`);
    if (params.modality) familyFilters.push(`modality=ilike.*${params.modality}*`);
    familyFilters.push("normalized_price=gt.0");

    const allSkus = await queryTable<SkuIndex>("sku_index", familyFilters, {
      select: "sku_id,model_id,vendor_name,model_name,modality,direction,normalized_price,normalized_price_unit,billing_method",
      order: "normalized_price.asc",
      limit: 200,
    });

    skus = allSkus.filter((s) => modelIds.has(s.model_id)).slice(0, params.limit);
  }

  if (skus.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "compare_prices",
            error: `No pricing data found for '${params.model_name || params.model_family}'.`,
          }),
        },
      ],
    };
  }

  const prices = skus
    .map((s) => s.normalized_price)
    .filter((p): p is number => p !== null && p > 0);

  let results: unknown;

  if (tier === "paid") {
    results = {
      comparisons: skus,
      stats: {
        total: skus.length,
        vendors: [...new Set(skus.map((s) => s.vendor_name))].length,
        cheapest: prices.length > 0 ? prices[0] : null,
        most_expensive: prices.length > 0 ? prices[prices.length - 1] : null,
        spread_ratio:
          prices.length >= 2
            ? +(prices[prices.length - 1] / prices[0]).toFixed(2)
            : null,
      },
    };
  } else {
    results = {
      summary: {
        total_vendors: [...new Set(skus.map((s) => s.vendor_name))].length,
        total_skus: skus.length,
        price_range: {
          min: prices.length > 0 ? prices[0] : null,
          max: prices.length > 0 ? prices[prices.length - 1] : null,
        },
        spread_ratio:
          prices.length >= 2
            ? +(prices[prices.length - 1] / prices[0]).toFixed(2)
            : null,
        directions: [...new Set(skus.map((s) => s.direction))],
      },
      sample: gateResults(
        skus.slice(0, 3) as unknown as Record<string, unknown>[],
        "free"
      ),
      upgrade_message:
        "Full vendor-by-vendor comparison requires ATOM MCP Pro ($49/mo). Visit https://a7om.com/mcp",
    };
  }

  const content: { type: "text"; text: string }[] = [
    {
      type: "text" as const,
      text: JSON.stringify(
        {
          tool: "compare_prices",
          tier,
          query: {
            model_name: params.model_name,
            model_family: params.model_family,
            direction: params.direction,
            modality: params.modality,
          },
          results,
        },
        null,
        2
      ),
    },
  ];

  if (tier === "free") {
    content.push(freeTierNote("Full vendor-by-vendor price comparison"));
  }

  return { content };
}
