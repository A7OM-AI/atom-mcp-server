// ============================================================
// Tool: get_price_history
// Time series data for a specific SKU or model.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import type { Tier, PriceIndex } from "../types.js";

export const getPriceHistorySchema = {
  model_name: z
    .string()
    .describe("Model name, e.g. 'GPT-4o', 'Claude Sonnet 4.5'"),
  vendor: z
    .string()
    .optional()
    .describe("Optionally filter to a specific vendor"),
  direction: z
    .enum(["Input", "Output", "Cached Input"])
    .default("Input")
    .describe("Pricing direction (default: Input)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(52)
    .default(12)
    .describe("Number of historical data points to return (default: 12 weeks)"),
};

export async function handleGetPriceHistory(
  params: z.infer<z.ZodObject<typeof getPriceHistorySchema>>,
  tier: Tier
) {
  const filters: string[] = [
    `model_name=ilike.*${params.model_name}*`,
    `direction=eq.${params.direction}`,
  ];
  if (params.vendor) filters.push(`vendor_name=ilike.*${params.vendor}*`);

  const history = await queryTable<PriceIndex>("price_index", filters, {
    select: "sku_id,vendor_name,model_name,direction,normalized_price,normalized_price_unit,run_id",
    order: "run_id.desc",
    limit: params.limit * 10, // Allow for multiple vendors
  });

  if (history.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "get_price_history",
            error: `No price history found for '${params.model_name}'. Try a partial name.`,
          }),
        },
      ],
    };
  }

  // Group by vendor + model
  const grouped: Record<string, PriceIndex[]> = {};
  for (const row of history) {
    const key = `${row.vendor_name}|${row.model_name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  let response: unknown;

  if (tier === "paid") {
    const series: Record<string, unknown> = {};
    for (const [key, rows] of Object.entries(grouped)) {
      const [vendor, model] = key.split("|");
      const dedupedByRun = new Map<string, PriceIndex>();
      for (const row of rows) {
        if (!dedupedByRun.has(row.run_id)) {
          dedupedByRun.set(row.run_id, row);
        }
      }
      const sorted = [...dedupedByRun.values()].sort((a, b) =>
        a.run_id.localeCompare(b.run_id)
      );
      series[key] = {
        vendor,
        model,
        direction: params.direction,
        unit: sorted[0]?.normalized_price_unit,
        data_points: sorted.map((r) => ({
          run_id: r.run_id,
          price: r.normalized_price,
        })),
      };
    }
    response = { series, total_series: Object.keys(series).length };
  } else {
    // Free tier: show trend direction and range, not actual prices
    const allPrices = history
      .map((h) => h.normalized_price)
      .filter((p): p is number => p !== null && p > 0);

    const runs = [...new Set(history.map((h) => h.run_id))].sort();

    response = {
      total_series: Object.keys(grouped).length,
      total_data_points: history.length,
      time_span: {
        oldest_run: runs[0],
        newest_run: runs[runs.length - 1],
        total_weeks: runs.length,
      },
      price_range: {
        min: allPrices.length ? Math.min(...allPrices) : null,
        max: allPrices.length ? Math.max(...allPrices) : null,
      },
      upgrade_message:
        "Full historical price series requires ATOM MCP subscription ($49/mo). Visit https://a7om.com/pricing",
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_price_history",
            tier,
            query: {
              model_name: params.model_name,
              vendor: params.vendor,
              direction: params.direction,
            },
            history: response,
          },
          null,
          2
        ),
      },
    ],
  };
}
