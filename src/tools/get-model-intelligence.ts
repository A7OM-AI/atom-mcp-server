// ============================================================
// Tool: get_model_intelligence
// Capability and coverage KPIs from model_intelligence_kpi.
// Complements get_kpis (pricing) with metadata-derived metrics.
// ============================================================
import { z } from "zod";
import { queryTable } from "../supabase.js";
import type { Tier } from "../types.js";
import { SITE } from "../config.js";

export const getModelIntelligenceSchema = {};

export async function handleGetModelIntelligence(
  _params: z.infer<z.ZodObject<typeof getModelIntelligenceSchema>>,
  tier: Tier
) {
  let kpis: Record<string, unknown>[] = [];
  try {
    kpis = await queryTable<Record<string, unknown>>(
      "model_intelligence_kpi",
      [],
      { order: "id.asc" }
    );
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              tool: "get_model_intelligence",
              tier,
              error:
                "Model Intelligence data temporarily unavailable. Try again later.",
              detail: String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_model_intelligence",
            tier,
            description:
              "Attic Standard model intelligence: capability and coverage measures drawn from the metadata behind every tracked model. Read alongside the market KPIs in get_kpis.",
            kpis,
            source: SITE,
          },
          null,
          2
        ),
      },
    ],
  };
}
