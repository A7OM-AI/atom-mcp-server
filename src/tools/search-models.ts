// ============================================================
// Tool: search_models
// Multi-filter search across the SKU index.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { gateResults, buildFreeTierSummary } from "../auth.js";
import type { Tier, SkuIndex, ModelRegistry } from "../types.js";

export const searchModelsSchema = {
  modality: z
    .string()
    .optional()
    .describe("Filter by modality: Text, Image, Audio, Video, Voice, Multimodal, Embedding"),
  vendor: z
    .string()
    .optional()
    .describe("Filter by vendor name, e.g. 'OpenAI', 'Anthropic'"),
  creator: z
    .string()
    .optional()
    .describe("Filter by model creator/developer"),
  model_family: z
    .string()
    .optional()
    .describe("Filter by model family, e.g. 'GPT-4o', 'Claude 3.5'"),
  open_source: z
    .string()
    .optional()
    .describe("Filter by open-source status: 'true' or 'false'"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .optional()
    .describe("Filter by pricing direction"),
  max_price: z
    .number()
    .optional()
    .describe("Maximum normalized price (USD per unit)"),
  min_context_window: z
    .number()
    .int()
    .optional()
    .describe("Minimum context window in tokens"),
  min_parameter_count: z
    .string()
    .optional()
    .describe("Minimum parameter count, e.g. '7B', '70B'"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return (default 20)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Offset for pagination"),
};

export async function handleSearchModels(
  params: z.infer<z.ZodObject<typeof searchModelsSchema>>,
  tier: Tier
) {
  // Build SKU-level filters
  const skuFilters: string[] = [];
  if (params.modality) skuFilters.push(`modality=ilike.*${params.modality}*`);
  if (params.vendor) skuFilters.push(`vendor_name=ilike.*${params.vendor}*`);
  if (params.direction) skuFilters.push(`direction=eq.${params.direction}`);
  if (params.max_price !== undefined)
    skuFilters.push(`normalized_price=lte.${params.max_price}`);
  skuFilters.push("normalized_price=gt.0");

  // Query SKU index
  let skus = await queryTable<SkuIndex>("sku_index", skuFilters, {
    select:
      "sku_id,model_id,vendor_id,vendor_name,model_name,modality,modality_subtype,direction,normalized_price,normalized_price_unit,billing_method",
    order: "normalized_price.asc",
    limit: params.limit + 50, // extra buffer for model-level filtering
    offset: params.offset,
  });

  // Apply model-level filters if needed
  if (params.creator || params.model_family || params.open_source || params.min_context_window) {
    const modelFilters: string[] = [];
    if (params.creator) modelFilters.push(`creator=ilike.*${params.creator}*`);
    if (params.model_family) modelFilters.push(`model_family=ilike.*${params.model_family}*`);
    if (params.open_source !== undefined) {
      const boolVal = params.open_source === "true";
      modelFilters.push(`open_source=is.${boolVal}`);
    }
    if (params.min_context_window)
      modelFilters.push(`context_window=gte.${params.min_context_window}`);

    const models = await queryTable<ModelRegistry>("model_registry", modelFilters, {
      select: "model_id",
    });

    const modelIds = new Set(models.map((m) => m.model_id));
    skus = skus.filter((s) => modelIds.has(s.model_id));
  }

  // Trim to requested limit
  const trimmed = skus.slice(0, params.limit);

  // Gate results based on tier
  const gated = gateResults(
    trimmed as unknown as Record<string, unknown>[],
    tier
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "search_models",
            tier,
            filters: {
              modality: params.modality,
              vendor: params.vendor,
              creator: params.creator,
              model_family: params.model_family,
              open_source: params.open_source,
              direction: params.direction,
              max_price: params.max_price,
            },
            total_results: skus.length,
            showing: trimmed.length,
            results: gated,
          },
          null,
          2
        ),
      },
    ],
  };
}
