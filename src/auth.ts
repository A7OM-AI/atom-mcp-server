// ============================================================
// ATOM MCP Server — Authentication & Tier Gating
// ============================================================

import type { Tier, SkuIndex, RedactedModel } from "./types.js";

// Valid API keys are loaded from environment.
// In production, these would be validated against a database.
const VALID_API_KEYS = new Set(
  (process.env.ATOM_API_KEYS || "").split(",").filter(Boolean)
);

/**
 * Determine the access tier from an API key.
 * No key or invalid key = free tier.
 */
export function resolveTier(apiKey?: string): Tier {
  if (!apiKey) return "free";
  return VALID_API_KEYS.has(apiKey.trim()) ? "paid" : "free";
}

/**
 * Redact sensitive pricing fields for free-tier users.
 * Shows structure but hides vendor, model, and price.
 */
export function redactForFreeTier(
  rows: Record<string, unknown>[],
  fieldsToRedact: string[] = ["vendor_name", "model_name", "normalized_price"]
): Record<string, unknown>[] {
  const REDACTED = "[UPGRADE TO ATOM MCP — $49/mo]";
  return rows.map((row) => {
    const redacted = { ...row };
    for (const field of fieldsToRedact) {
      if (field in redacted) {
        (redacted as Record<string, unknown>)[field] = REDACTED;
      }
    }
    return redacted;
  });
}

/**
 * Build a free-tier summary: count + price range (no individual records).
 */
export function buildFreeTierSummary(rows: SkuIndex[]): {
  total_results: number;
  price_range: { min: number | null; max: number | null; currency: string };
  modalities: string[];
  directions: string[];
  upgrade_message: string;
} {
  const prices = rows
    .map((r) => r.normalized_price)
    .filter((p): p is number => p !== null && p > 0);

  const modalities = [...new Set(rows.map((r) => r.modality))];
  const directions = [...new Set(rows.map((r) => r.direction))];

  return {
    total_results: rows.length,
    price_range: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
      currency: "USD",
    },
    modalities,
    directions,
    upgrade_message:
      "Full vendor, model, and pricing details require an ATOM MCP subscription ($49/mo). Visit https://a7om.com/pricing",
  };
}

/**
 * Gate a full result set based on tier.
 * Paid tier gets everything. Free tier gets redacted + summary.
 */
export function gateResults(
  rows: SkuIndex[],
  tier: Tier
): { data: unknown; tier: Tier } {
  if (tier === "paid") {
    return { data: rows, tier };
  }
  return {
    data: {
      summary: buildFreeTierSummary(rows),
      sample: redactForFreeTier(rows.slice(0, 5) as unknown as Record<string, unknown>[]),
    },
    tier,
  };
}
