// ============================================================
// Tool: get_kpis
// The nine published market KPIs (kpi_market_snapshot) at the
// week the site shows. Fully public.
// ============================================================

import { z } from "zod";
import { enc, getActiveDate, queryTable } from "../supabase.js";
import { MARKET_KPIS, METHODOLOGY_PAGE } from "../config.js";
import { errorResult, respond, round } from "../util.js";
import type { Tier } from "../types.js";

export const getKpisSchema = {
  group: z
    .string()
    .optional()
    .describe("Optional group: 'Price structure', 'Price dynamics' or 'Competition'"),
  weeks: z.coerce.number().int().min(1).max(52).default(1).describe("Weeks of history per KPI (default 1, latest only)"),
};

export async function handleGetKpis(params: z.infer<z.ZodObject<typeof getKpisSchema>>, tier: Tier) {
  const gate = await getActiveDate();
  const filters = gate ? [`date=lte.${enc(gate)}`] : [];
  const codes = Object.keys(MARKET_KPIS);

  const rows = await queryTable<Record<string, any>>("kpi_market_snapshot", filters, {
    select:
      "kpi_code,date,value,p25,p75,population,secondary_value,secondary_label,value_wow,value_mom,value_vs_base",
    order: "date.desc",
    limit: codes.length * params.weeks + 50,
  });
  if (rows.length === 0) return errorResult("get_kpis", "Market KPIs are not available right now.");

  const dates = [...new Set(rows.map((r) => String(r.date).slice(0, 10)))].sort().reverse().slice(0, params.weeks);
  const latest = dates[0];

  const kpis = rows
    .filter((r) => dates.includes(String(r.date).slice(0, 10)))
    .filter((r) => MARKET_KPIS[r.kpi_code])
    .filter((r) => !params.group || MARKET_KPIS[r.kpi_code].group.toLowerCase() === params.group.toLowerCase())
    .map((r) => ({
      kpi: r.kpi_code,
      label: MARKET_KPIS[r.kpi_code].label,
      group: MARKET_KPIS[r.kpi_code].group,
      week: String(r.date).slice(0, 10),
      value: r.value != null ? Number(r.value) : null,
      p25: r.p25 != null ? Number(r.p25) : null,
      p75: r.p75 != null ? Number(r.p75) : null,
      population: r.population,
      secondary: r.secondary_label ? { label: r.secondary_label, value: r.secondary_value != null ? Number(r.secondary_value) : null } : undefined,
      change_wow: round(r.value_wow, 2),
      change_mom: round(r.value_mom, 2),
      change_vs_base: round(r.value_vs_base, 2),
      definition: MARKET_KPIS[r.kpi_code].definition,
    }))
    .sort((a, b) => (a.week === b.week ? codes.indexOf(a.kpi) - codes.indexOf(b.kpi) : a.week < b.week ? 1 : -1));

  return respond("get_kpis", tier, {
    published_week: latest,
    description: "The nine market KPIs Attic Standard publishes each week, across price structure, price dynamics and competition.",
    kpis,
    methodology: METHODOLOGY_PAGE,
  });
}
