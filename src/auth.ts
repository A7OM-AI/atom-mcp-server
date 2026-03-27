// ============================================================
// ATOM MCP Server — Authentication & Tier Gating
// ============================================================
import type { Tier } from "./types.js";
import { queryTable } from "./supabase.js";

// Cache valid keys in memory (refreshed every 5 minutes)
let cachedKeys: Set<string> = new Set();
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && cachedKeys.size > 0) {
    return cachedKeys;
  }
  try {
    const rows = await queryTable<{ key_id: string }>(
      "api_keys",
      ["active=eq.true"],
      { select: "key_id" }
    );
    cachedKeys = new Set(rows.map((r) => r.key_id));
    lastFetch = now;
  } catch (err) {
    console.error("ATOM MCP: Failed to load API keys from Supabase:", err);
    // Keep using cached keys if fetch fails
  }
  return cachedKeys;
}

/**
 * Determine the access tier from an API key.
 * No key or invalid key = free tier.
 */
export async function resolveTier(apiKey?: string): Promise<Tier> {
  if (!apiKey) return "free";
  const keys = await loadKeys();
  return keys.has(apiKey.trim()) ? "paid" : "free";
}

/**
 * Redact sensitive pricing fields for free-tier users.
 * Shows structure but hides vendor, model, and price.
 */
export function redactForFreeTier(
  rows: Record<string, unknown>[],
  fieldsToRedact: string[] = ["vendor_name", "model_name", "normalized_price", "sku_id", "model_id", "vendor_id", "sku_plan_name"]
): Record<string, unknown>[] {
  const REDACTED = "[UPGRADE TO ATOM MCP Pro — $49/mo]";
  return rows.map((row) => {
    const redacted = { ...row };
    for (const field of fieldsToRedact) {
      if (field in redacted) {
        redacted[field] = REDACTED;
      }
    }
    return redacted;
  });
}

/**
 * Build a free-tier summary: count + price range (no individual records).
 */
export function buildFreeTierSummary(rows: Record<string, unknown>[]): {
  total_results: number;
  price_range: { min: number | null; max: number | null };
  modalities: string[];
  directions: string[];
  upgrade_message: string;
} {
  const prices = rows
    .map((r) => r.normalized_price as number)
    .filter((p): p is number => p !== null && p > 0);
  const modalities = [...new Set(rows.map((r) => r.modality as string).filter(Boolean))];
  const directions = [...new Set(rows.map((r) => r.direction as string).filter(Boolean))];
  return {
    total_results: rows.length,
    price_range: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
    },
    modalities,
    directions,
    upgrade_message:
      "Full vendor, model, and pricing details require an ATOM MCP Pro ($49/mo). Visit https://a7om.com/mcp",
  };
}

/**
 * Returns an additional content block for free-tier responses.
 * This plain-text note ensures the AI assistant surfaces the upgrade path.
 */
export function freeTierNote(toolContext: string): {
  type: "text";
  text: string;
} {
  return {
    type: "text" as const,
    text: `Note: The data above is summary-level only (counts, ranges, and redacted samples). ${toolContext} — including exact vendor names, model names, and per-SKU pricing — is available exclusively through ATOM MCP Pro ($49/mo). Learn more and subscribe at https://a7om.com/mcp`,
  };
}

/**
 * Gate a full result set based on tier.
 * Paid tier gets everything. Free tier gets redacted + summary.
 */
export function gateResults(
  rows: Record<string, unknown>[],
  tier: Tier
): unknown {
  if (tier === "paid") {
    return rows;
  }
  return {
    summary: buildFreeTierSummary(rows),
    sample: redactForFreeTier(rows.slice(0, 5)),
  };
}
