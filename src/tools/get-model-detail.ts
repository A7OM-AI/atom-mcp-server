// ============================================================
// Tool: get_model_detail
// Deep dive on a single model: specs + all SKUs across vendors.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import { redactForFreeTier } from "../auth.js";
import type { Tier, ModelRegistry } from "../types.js";

export const getModelDetailSchema = {
  model_name: z
    .string()
    .describe("Model name to look up, e.g. 'GPT-4o', 'Claude Sonnet 4.5', 'Llama 3.1 405B'"),
};

export async function handleGetModelDetail(
  params: z.infer<z.ZodObject<typeof getModelDetailSchema>>,
  tier: Tier
) {
  // Find model in registry (fuzzy match)
  const models = await queryTable<ModelRegistry>("model_registry", [
    `model_name=ilike.*${params.model_name}*`,
  ], { limit: 5 });

  if (models.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "get_model_detail",
            error: `No model found matching '${params.model_name}'. Try a partial name like 'GPT-4o' or 'Claude'.`,
          }),
        },
      ],
    };
  }

  const model = models[0];

  // Get all SKUs for this model across all vendors
  const skus = await queryTable<Record<string, unknown>>("sku_index", [
    `model_id=eq.${model.model_id}`,
  ], {
    order: "vendor_name.asc,direction.asc",
  });

  // Build response
  const specs: Record<string, unknown> = {
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
    source_url: model.source_url,
  };

  let pricingData: unknown;
  if (tier === "paid") {
    pricingData = skus;
  } else {
    pricingData = {
      total_skus: skus.length,
      vendors_offering: [...new Set(skus.map((s) => s.vendor_name as string))].length,
      sample: redactForFreeTier(skus.slice(0, 3)),
      upgrade_message:
        "Full pricing across all vendors requires ATOM MCP subscription ($49/mo). Visit https://a7om.com/pricing",
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_model_detail",
            tier,
            model_specs: specs,
            pricing: pricingData,
            additional_matches: models.length > 1 ? models.slice(1).map(m => m.model_name) : undefined,
          },
          null,
          2
        ),
      },
    ],
  };
}
