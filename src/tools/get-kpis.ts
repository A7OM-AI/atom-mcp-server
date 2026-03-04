// ============================================================
// Tool: get_kpis
// Developer-focused KPIs from v_pricing_intel view.
// ============================================================

import { z } from "zod";
import { queryView } from "../supabase.js";
import type { Tier, PricingIntel } from "../types.js";

export const getKpisSchema = {};

export async function handleGetKpis(
  _params: z.infer<z.ZodObject<typeof getKpisSchema>>,
  tier: Tier
) {
  const kpis = await queryView<PricingIntel>("v_pricing_intel");

  // KPIs are market-level intelligence — available to all tiers.
  // This is what drives awareness and demonstrates ATOM's value.
  const formatted = kpis.map((k) => ({
    name: k.kpi_name,
    value: k.kpi_value,
    unit: k.kpi_unit,
    description: k.kpi_description,
  }));

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
            kpis: formatted,
            source: "https://a7om.com",
          },
          null,
          2
        ),
      },
    ],
  };
}
