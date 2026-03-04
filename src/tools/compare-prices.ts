// ============================================================
// Tool: compare_prices
// Cross-vendor price comparison for a model or model family.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { redactForFreeTier } from "../auth.js";
import type { Tier } from "../types.js";

export const comparePricesSchema = {
  model_name: z
    .string()
    .optional()
    .describe("Model name to compare across vendors, e.g. 'Llama 3.1 70B'"),
  model_family: z
    .string()
    .optional()
    .describe("Model family to compare, e.g. 'Llama', 'Claude', 'GPT-4'"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .default("Input")
    .describe("Pricing direction to compare (default: Input)"),
  modality: z
    .string()
    .default("Text")
    .describe("Modality filter (default: Text)"),
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
            error: "Provide either model_name or model_family to compare prices.",
          }),
        },
      ],
    };
  }

  const filters: string[] = [
    `direction=eq.${params.direction}`,
    `modality=ilike.*${params.modality}*`,
  ];

  if (params.model_name) {
    filters.push(`model_name=ilike.*${params.model_name}*`);
  }

  // If model_family, we need model_ids from registry first
  let modelIds: Set<string> | null = null;
  if (params.model_family) {
    const models = await queryTable<Record<string, unknown>>("model_registry", [
      `model_family=ilike.*${params.model_family}*`,
    ], { select: "model_id,model_name" });

    modelIds = new Set(models.map((m) => m.model_id as string));

    if (modelIds.size === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              tool: "compare_prices",
              error: `No models found in family '${params.model_family}'.`,
            }),
          },
        ],
      };
    }
  }

  let skus = await queryTable<Record<string, unknown>>("sku_index", filters, {
    select: "sku_id,vendor_name,model_name,model_id,direction,normalized_price,normalized_unit,currency,modality",
    order: "normalized_price.asc.nullslast",
    limit: 50,
  });

  // Filter by model family if needed
  if (modelIds) {
    skus = skus.filter((s) => modelIds!.has(s.model_id as string));
  }

  if (skus.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "compare_prices",
            error: `No pricing found for the specified criteria.`,
          }),
        },
      ],
    };
  }

  // Build comparison
  let comparison: unknown;
  if (tier === "paid") {
    comparison = skus.map((s) => ({
      vendor: s.vendor_name,
      model: s.model_name,
      direction: s.direction,
      price: s.normalized_price,
      unit: s.normalized_unit,
      currency: s.currency,
    }));
  } else {
    const prices = skus
      .map((s) => s.normalized_price as number)
      .filter((p) => p !== null && p > 0);

    comparison = {
      total_vendors: new Set(skus.map((s) => s.vendor_name)).size,
      total_options: skus.length,
      price_range: {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
        spread_ratio: prices.length >= 2 ? +(Math.max(...prices) / Math.min(...prices)).toFixed(2) : null,
      },
      sample: redactForFreeTier(skus.slice(0, 3)),
      upgrade_message:
        "Full vendor-by-vendor comparison requires ATOM MCP subscription ($49/mo). Visit https://a7om.com/pricing",
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "compare_prices",
            tier,
            query: { model_name: params.model_name, model_family: params.model_family, direction: params.direction },
            comparison,
          },
          null,
          2
        ),
      },
    ],
  };
}
