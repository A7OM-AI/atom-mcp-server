// ============================================================
// Tool: get_kpis
// Developer-focused market KPIs from v_pricing_intel.
// ============================================================

import { z } from "zod";
import { queryView } from "../supabase.js";
import type { Tier } from "../types.js";

export const getKpisSchema = {};

export async function handleGetKpis(
  _params: z.infer<z.ZodObject<typeof getKpisSchema>>,
  tier: Tier
) {
  // KPIs are public market intelligence — available to all tiers
  // v_pricing_intel returns rows with KPI data
  let kpis: Record<string, unknown>[] = [];

  try {
    kpis = await queryView<Record<string, unknown>>("v_pricing_intel");
  } catch (error) {
    // If view doesn't exist or fails, return graceful error
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              tool: "get_kpis",
              tier,
              error: "KPI view temporarily unavailable. Try again later.",
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
            tool: "get_kpis",
            tier,
            description:
              "ATOM Inference Price Index — market-level KPIs derived from 1,600+ SKUs across 40+ vendors.",
            kpis,
            source: "https://a7om.com",
          },
          null,
          2
        ),
      },
    ],
  };
}
