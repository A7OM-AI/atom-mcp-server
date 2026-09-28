// ============================================================
// Attic Standard MCP Server — Authentication and tier gating
// ============================================================
// Free tier: what atticstandard.com publishes (indexes, KPIs,
// aggregates, counts). PRO: vendor- and SKU-level detail.
// The paid check reads active keys from the api_keys table.
// ============================================================
import type { Tier } from "./types.js";
import { queryTable } from "./supabase.js";
import { PRO_NAME, PRO_PRICE, MCP_PAGE, UPGRADE_LABEL, UPGRADE_MESSAGE } from "./config.js";

let cachedKeys: Set<string> = new Set();
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && cachedKeys.size > 0) {
    return cachedKeys;
  }
  try {
    const rows = await queryTable<{ key_id: string }>("api_keys", ["active=eq.true"], {
      select: "key_id",
    });
    cachedKeys = new Set(rows.map((r) => r.key_id));
    lastFetch = now;
  } catch (err) {
    console.error("MCP: failed to load API keys:", err);
  }
  return cachedKeys;
}

/** No key or an unknown key means free tier. */
export async function resolveTier(apiKey?: string): Promise<Tier> {
  if (!apiKey) return "free";
  const keys = await loadKeys();
  return keys.has(apiKey.trim()) ? "paid" : "free";
}

const DEFAULT_REDACT = [
  "vendor_name",
  "vendor_id",
  "model_name",
  "model_id",
  "sku_id",
  "sku_plan_name",
  "normalized_price",
  "original_price",
  "anchor_id",
];

/** Replace vendor, model and price fields with the upgrade label. */
export function redactForFreeTier(
  rows: Record<string, unknown>[],
  fieldsToRedact: string[] = DEFAULT_REDACT
): Record<string, unknown>[] {
  return rows.map((row) => {
    const redacted = { ...row };
    for (const field of fieldsToRedact) {
      if (field in redacted) redacted[field] = UPGRADE_LABEL;
    }
    return redacted;
  });
}

/** Free-tier summary: count and price range, no individual records. */
export function buildFreeTierSummary(rows: Record<string, unknown>[]) {
  const prices = rows
    .map((r) => r.normalized_price as number)
    .filter((p): p is number => typeof p === "number" && p > 0);
  return {
    total_results: rows.length,
    price_range: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
    },
    units: [...new Set(rows.map((r) => r.normalized_price_unit as string).filter(Boolean))],
    modalities: [...new Set(rows.map((r) => r.modality as string).filter(Boolean))],
    directions: [...new Set(rows.map((r) => r.direction as string).filter(Boolean))],
  };
}

/** Plain-text note so the assistant surfaces the upgrade path. */
export function freeTierNote(toolContext: string): { type: "text"; text: string } {
  return {
    type: "text" as const,
    text: `Note: this is the free tier (counts, ranges and redacted samples). ${toolContext}, with exact vendor names, model names and per-SKU prices, is available in ${PRO_NAME} (${PRO_PRICE}). ${MCP_PAGE}`,
  };
}

/** Paid tier gets every row; free tier gets a summary and a redacted sample. */
export function gateResults(rows: Record<string, unknown>[], tier: Tier): unknown {
  if (tier === "paid") return rows;
  return {
    summary: buildFreeTierSummary(rows),
    sample: redactForFreeTier(rows.slice(0, 3)),
    upgrade: UPGRADE_MESSAGE,
  };
}
