// ============================================================
// Tool: get_index_constituents
// What sits inside an index basket this week. Free tier gets the
// composition (counts by channel, origin, tier, license); PRO
// gets the model-by-model and vendor-by-vendor basket.
// ============================================================

import { z } from "zod";
import { enc, queryAll } from "../supabase.js";
import { CHANNEL_LABELS, UPGRADE_MESSAGE } from "../config.js";
import { errorResult, normIndexCode, respond } from "../util.js";
import type { Tier } from "../types.js";

export const getIndexConstituentsSchema = {
  index_code: z.string().describe("Index to open, e.g. 'TXT', 'FLG', 'CHN' or 'AIPI TXT GLB'"),
  direction: z.enum(["Input", "Cached Input", "Output"]).optional().describe("Limit to one pricing direction"),
};

function countBy(rows: Record<string, any>[], key: string, label?: (v: string) => string) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const raw = r[key] === null || r[key] === undefined || r[key] === "" ? "Unclassified" : String(r[key]);
    const k = label ? label(raw) : raw;
    out[k] = (out[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

export async function handleGetIndexConstituents(
  params: z.infer<z.ZodObject<typeof getIndexConstituentsSchema>>,
  tier: Tier
) {
  const code = normIndexCode(params.index_code);
  const filters = [`index_code=eq.${enc(code)}`, "in_basket=is.true"];
  if (params.direction) filters.push(`direction=eq.${enc(params.direction)}`);

  const rows = await queryAll<Record<string, any>>("index_membership_snapshot", filters, {
    select:
      "index_code,index_category,verification_date,sku_id,vendor_name,model_name,model_id,anchor_id,direction,vendor_type,country,creator_country,tier,license_class,is_reasoning",
    order: "sku_id.asc",
  });
  if (rows.length === 0) return errorResult("get_index_constituents", `No basket found for '${code}'.`);

  // One row per model (anchor) for composition counts.
  const byModel = new Map<string, Record<string, any>>();
  for (const r of rows) {
    const id = r.anchor_id || r.model_id;
    if (!byModel.has(id)) byModel.set(id, r);
  }
  const models = [...byModel.values()];
  const channel = (v: string) => CHANNEL_LABELS[v] || v;

  const composition = {
    skus: rows.length,
    models: models.length,
    vendors: new Set(rows.map((r) => r.vendor_name)).size,
    skus_by_channel: countBy(rows, "vendor_type", channel),
    models_by_origin: countBy(models, "creator_country"),
    models_by_tier: countBy(models, "tier"),
    models_by_license: countBy(models, "license_class"),
    reasoning_models: models.filter((m) => m.is_reasoning).length,
  };

  const base = {
    index_code: code,
    family: rows[0].index_category,
    basket_week: String(rows[0].verification_date).slice(0, 10),
    composition,
  };

  if (tier !== "paid") {
    return respond(
      "get_index_constituents",
      tier,
      { ...base, upgrade: UPGRADE_MESSAGE },
      "The model-by-model and vendor-by-vendor basket of this index"
    );
  }

  const basket = new Map<string, Record<string, any>>();
  for (const r of rows) {
    const id = r.anchor_id || r.model_id;
    const e =
      basket.get(id) ||
      {
        anchor_model_id: id,
        model: r.model_name,
        origin: r.creator_country,
        tier: r.tier,
        license: r.license_class,
        reasoning: r.is_reasoning,
        vendors: new Set<string>(),
        skus: 0,
      };
    e.vendors.add(r.vendor_name);
    e.skus += 1;
    basket.set(id, e);
  }

  return respond("get_index_constituents", tier, {
    ...base,
    basket: [...basket.values()]
      .map((b) => ({ ...b, vendors: [...b.vendors].sort() }) as Record<string, any>)
      .sort((a, b) => b.skus - a.skus),
  });
}
