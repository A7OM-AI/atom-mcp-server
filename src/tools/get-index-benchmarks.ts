// ============================================================
// Tool: get_index_benchmarks
// AIPI index family benchmarks — public market intelligence.
// ============================================================

import { z } from "zod";
import { queryTable } from "../supabase.js";
import type { Tier, IndexValues } from "../types.js";

export const getIndexBenchmarksSchema = {
  index_code: z
    .string()
    .optional()
    .describe(
      "Filter by specific AIPI index code, e.g. 'AIPI-TXT-GLB', 'AIPI-IMG-GLB'. Omit to see all indexes."
    ),
  index_category: z
    .string()
    .optional()
    .describe(
      "Filter by index category, e.g. 'Text', 'Image', 'Audio', 'Video', 'Multimodal', 'Composite'"
    ),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum results to return (default 25)"),
};

export async function handleGetIndexBenchmarks(
  params: z.infer<z.ZodObject<typeof getIndexBenchmarksSchema>>,
  tier: Tier
) {
  // Index benchmarks are fully public — no tier gating
  const filters: string[] = [];
  if (params.index_code && params.index_code.trim() !== "")
    filters.push(`index_code=eq.${params.index_code.trim()}`);
  if (
    params.index_category &&
    params.index_category.trim() !== "" &&
    params.index_category !== "(any)"
  )
    filters.push(`index_category=ilike.*${params.index_category}*`);

  const rows = await queryTable<IndexValues>("index_values", filters, {
    order: "date.desc,index_code.asc",
    limit: params.limit,
  });

  if (rows.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tool: "get_index_benchmarks",
            error: params.index_code
              ? `No index found for '${params.index_code}'. Omit index_code to see all available indexes.`
              : "No index data available.",
          }),
        },
      ],
    };
  }

  // Extract unique index codes for summary
  const indexCodes = [...new Set(rows.map((r) => r.index_code))];
  const dates = [...new Set(rows.map((r) => r.date))].sort().reverse();

  // Group by date for structured output
  const byDate: Record<string, IndexValues[]> = {};
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push(row);
  }

  // Format each entry
  const formatted = rows.map((r) => ({
    index_code: r.index_code,
    index_category: r.index_category,
    description: r.index_description,
    date: r.date,
    unit: r.unit,
    input_price: r.input_price,
    cached_price: r.cached_price,
    output_price: r.output_price,
    sku_count: r.sku_count,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            tool: "get_index_benchmarks",
            tier,
            description:
              "AIPI (ATOM Inference Price Index) — chained matched-model price benchmarks for AI inference.",
            summary: {
              total_indexes: indexCodes.length,
              indexes_available: indexCodes,
              date_range: {
                latest: dates[0],
                earliest: dates[dates.length - 1],
                total_periods: dates.length,
              },
            },
            benchmarks: formatted,
            methodology:
              "Chained matched-model index. Only SKUs present in consecutive periods are compared, eliminating composition bias. See https://a7om.com/methodology",
            source: "https://a7om.com",
          },
          null,
          2
        ),
      },
    ],
  };
}
