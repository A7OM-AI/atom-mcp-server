// ============================================================
// Tool: get_model_detail
// Deep dive on a single model — specs + pricing across vendors.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { gateResults } from "../auth.js";
import type { Tier, ModelRegistry, SkuIndex } from "../types.js";

export const getModelDetailSchema = {
  model_name: z
    .string()
    .describe("Model name to look up, e.g. 'GPT-4o', 'Claude Sonnet 4.5', 'Llama 3.1 70B'"),
};

export async function handleGetModelDetail(
  params: z.infer<z.ZodObject<typeof getModelDetailSchema>>,
  tier: Tier
) {
  // Find model in registry (fuzzy match)
  const models = await queryTable<ModelRegistry>("model_registry", [
    `model_name=ilike.*${params.model_name}*`,
  ], {
    limit: 5,
  });

  if (models.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "get_model_detail",
            error: `No model found matching '${params.model_name}'. Try a partial name like 'GPT-4' or 'Claude'.`,
          }),
        },
      ],
    };
  }

  const model = models[0];

  // Get all SKUs for this model across vendors
  const skus = await queryTable<SkuIndex>("sku_index", [
    `model_id=eq.${model.model_id}`,
  ], {
    select: "sku_id,vendor_name,model_name,modality,modality_subtype,direction,normalized_price,normalized_price_unit,billing_method",
    order: "normalized_price.asc",
  });

  // Build response
  const modelSpecs = {
    model_id: model.model_id,
    model_name: model.model_name,
    creator: model.creator,
    model_family: model.model_family,
    open_source: model.open_source,
    parameter_count: model.parameter_count,
    context_window: model.context_window,
    max_output_tokens: model.max_output_tokens,
    training_cutoff: model.training_cutoff,
    modality_input: model.modality_input,
    modality_output: model.modality_output,
    tool_calling: model.tool_calling,
    json_mode: model.json_mode,
    streaming: model.streaming,
    source_url: model.source_url,
  };

  let pricing: unknown;

  if (tier === "paid") {
    pricing = skus;
  } else {
    // Free tier: show count and redacted sample
    const vendors = [...new Set(skus.map((s) => s.vendor_name))];
    pricing = {
      total_skus: skus.length,
      vendors_offering: vendors.length,
      modalities: [...new Set(skus.map((s) => s.modality))],
      directions: [...new Set(skus.map((s) => s.direction))],
      sample: gateResults(
        skus.slice(0, 3) as unknown as Record<string, unknown>[],
        "free"
      ),
      upgrade_message:
        "Full vendor-by-vendor pricing requires ATOM MCP Pro ($49/mo). Visit https://a7om.com/mcp",
    };
  }

  // Additional matches (other models with similar names)
  const additionalMatches = models.length > 1
    ? models.slice(1).map((m) => m.model_name)
    : [];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_model_detail",
            tier,
            model_specs: modelSpecs,
            pricing,
            additional_matches: additionalMatches,
          },
          null,
          2
        ),
      },
    ],
  };
}
