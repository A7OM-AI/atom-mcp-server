// ============================================================
// Tool: get_market_stats
// Aggregate market intelligence from views.
// ============================================================

import { z } from "zod";
import { queryTable, queryView } from "../supabase.js";
import type { Tier, SummaryStatRow } from "../types.js";

export const getMarketStatsSchema = {
  modality: z
    .string()
    .optional()
    .describe("Optionally focus on a specific modality: Text, Image, Audio, Video, etc."),
};

export async function handleGetMarketStats(
  params: z.infer<z.ZodObject<typeof getMarketStatsSchema>>,
  tier: Tier
) {
  // Get summary stats from view — returns rows of {metric, value}
  const statRows = await queryView<SummaryStatRow>("v_summary_stats");

  // Convert to a lookup object
  const coverage: Record<string, string> = {};
  for (const row of statRows) {
    coverage[row.metric] = row.value;
  }

  // Get price distribution for the requested modality
  const priceFilters: string[] = [];
  if (params.modality) priceFilters.push(`modality=ilike.*${params.modality}*`);
  priceFilters.push("normalized_price=gt.0");

  const skus = await queryTable<Record<string, unknown>>("sku_index", priceFilters, {
    select: "normalized_price,modality,direction,vendor_name",
  });

  const prices = skus
    .map((s) => s.normalized_price as number)
    .filter((p) => p !== null && p > 0)
    .sort((a, b) => a - b);

  const median = prices.length > 0
    ? prices[Math.floor(prices.length / 2)]
    : null;
  const mean = prices.length > 0
    ? +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(6)
    : null;

  // Vendor distribution
  const vendorCounts: Record<string, number> = {};
  for (const s of skus) {
    const v = s.vendor_name as string;
    vendorCounts[v] = (vendorCounts[v] || 0) + 1;
  }

  // Modality distribution
  const modalityCounts: Record<string, number> = {};
  for (const s of skus) {
    const m = s.modality as string;
    modalityCounts[m] = (modalityCounts[m] || 0) + 1;
  }

  // Direction distribution
  const directionCounts: Record<string, number> = {};
  for (const s of skus) {
    const d = s.direction as string;
    directionCounts[d] = (directionCounts[d] || 0) + 1;
  }

  const response: Record<string, unknown> = {
    tool: "get_market_stats",
    tier,
    coverage,
    price_distribution: {
      modality_filter: params.modality || "All",
      total_skus: prices.length,
      median_price: median,
      mean_price: mean,
      min_price: prices.length > 0 ? prices[0] : null,
      max_price: prices.length > 0 ? prices[prices.length - 1] : null,
      p25: prices.length > 0 ? prices[Math.floor(prices.length * 0.25)] : null,
      p75: prices.length > 0 ? prices[Math.floor(prices.length * 0.75)] : null,
    },
    modality_breakdown: modalityCounts,
    direction_breakdown: directionCounts,
  };

  // Vendor breakdown only for paid tier
  if (tier === "paid") {
    response.vendor_breakdown = vendorCounts;
  } else {
    response.vendor_count = Object.keys(vendorCounts).length;
    response.upgrade_message =
      "Vendor-level breakdown requires ATOM MCP Pro ($49/mo). Visit https://a7om.com/mcp";
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
