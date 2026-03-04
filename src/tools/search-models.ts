// ============================================================
// Tool: search_models
// The workhorse. Multi-filter search across all SKUs + model specs.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { gateResults } from "../auth.js";
import type { Tier } from "../types.js";

export const searchModelsSchema = {
  modality: z
    .string()
    .optional()
    .describe("Filter by modality: Text, Image, Audio, Video, Voice, Multimodal"),
  modality_subtype: z
    .string()
    .optional()
    .describe("Filter by subtype: Chat Completion, Image Generation, etc."),
  vendor: z
    .string()
    .optional()
    .describe("Filter by vendor name, e.g. 'OpenAI', 'Anthropic', 'Google'"),
  creator: z
    .string()
    .optional()
    .describe("Filter by model creator/originator, e.g. 'Meta', 'Mistral AI'"),
  model_family: z
    .string()
    .optional()
    .describe("Filter by model family, e.g. 'GPT-4', 'Claude', 'Llama'"),
  open_source: z
    .boolean()
    .optional()
    .describe("Filter for open-source models (true) or proprietary (false)"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .optional()
    .describe("Filter by pricing direction"),
  max_price: z
    .number()
    .optional()
    .describe("Maximum normalized price (in the model's native unit)"),
  min_context_window: z
    .number()
    .optional()
    .describe("Minimum context window in tokens, e.g. 128000"),
  min_parameter_count: z
    .string()
    .optional()
    .describe("Minimum parameter count, e.g. '70B', '400B'"),
  region: z
    .string()
    .optional()
    .describe("Filter by vendor region: 'North America', 'Europe', 'Asia', etc."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum results to return (default 25, max 100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Pagination offset"),
};

export async function handleSearchModels(
  params: z.infer<z.ZodObject<typeof searchModelsSchema>>,
  tier: Tier
) {
  // Build PostgREST filters for sku_index
  const filters: string[] = [];

  if (params.modality) filters.push(`modality=ilike.*${params.modality}*`);
  if (params.modality_subtype) filters.push(`modality_subtype=ilike.*${params.modality_subtype}*`);
  if (params.vendor) filters.push(`vendor_name=ilike.*${params.vendor}*`);
  if (params.direction) filters.push(`direction=eq.${params.direction}`);
  if (params.max_price !== undefined) filters.push(`normalized_price=lte.${params.max_price}`);
  if (params.region) filters.push(`region=ilike.*${params.region}*`);

  // First, get SKUs
  const skus = await queryTable<Record<string, unknown>>("sku_index", filters, {
    select: "*",
    order: "normalized_price.asc.nullslast",
    limit: params.limit,
    offset: params.offset,
  });

  // If model-level filters are provided, we need to cross-reference model_registry
  let filteredSkus = skus;

  if (params.creator || params.model_family || params.open_source !== undefined || params.min_context_window) {
    const modelFilters: string[] = [];
    if (params.creator) modelFilters.push(`creator=ilike.*${params.creator}*`);
    if (params.model_family) modelFilters.push(`model_family=ilike.*${params.model_family}*`);
    if (params.open_source !== undefined) modelFilters.push(`open_source=eq.${params.open_source}`);
    if (params.min_context_window) modelFilters.push(`context_window=gte.${params.min_context_window}`);

    const models = await queryTable<Record<string, unknown>>("model_registry", modelFilters, {
      select: "model_id",
    });

    const validModelIds = new Set(models.map((m) => m.model_id as string));

    filteredSkus = skus.filter((s) => validModelIds.has(s.model_id as string));
  }

  // Gate results based on tier
  const gated = gateResults(filteredSkus as any, tier);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "search_models",
            tier: gated.tier,
            results: gated.data,
            pagination: {
              limit: params.limit,
              offset: params.offset,
              returned: Array.isArray(gated.data) ? (gated.data as unknown[]).length : undefined,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
