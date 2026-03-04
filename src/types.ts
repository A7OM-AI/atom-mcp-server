// ============================================================
// ATOM MCP Server — Type Definitions
// ============================================================

/** Access tier for API consumers */
export type Tier = "free" | "paid";

/** Supabase query response wrapper */
export interface SupabaseResponse<T> {
  data: T[] | null;
  error: string | null;
  count?: number;
}

// ------------------------------------------------------------
// Database table types (mirror Supabase schema)
// ------------------------------------------------------------

export interface VendorRegistry {
  vendor_id: string;
  vendor_name: string;
  country: string;
  region: string;
  vendor_url: string | null;
  pricing_page_url: string | null;
  model_specifications_url: string | null;
}

export interface ModelRegistry {
  model_id: string;
  model_name: string;
  creator: string;
  model_family: string | null;
  modality_input: string[] | null;
  modality_output: string[] | null;
  open_source: boolean | null;
  parameter_count: string | null;
  context_window: number | null;
  max_output_tokens: number | null;
  training_cutoff: string | null;
  source_url: string | null;
  null_reasons: Record<string, string> | null;
  last_verified: string | null;
}

export interface SkuIndex {
  sku_id: string;
  model_id: string;
  vendor_id: string;
  vendor_name: string;
  model_name: string;
  modality: string;
  modality_subtype: string;
  direction: string;
  normalized_price: number | null;
  normalized_unit: string | null;
  currency: string;
  region: string;
  country: string;
  billing_model: string | null;
  run_id: string | null;
}

export interface PriceIndex {
  id: number;
  sku_id: string;
  model_id: string;
  vendor_id: string;
  vendor_name: string;
  model_name: string;
  modality: string;
  modality_subtype: string;
  direction: string;
  normalized_price: number | null;
  normalized_unit: string | null;
  currency: string;
  region: string;
  run_id: string;
}

export interface IndexValues {
  run_id: string;
  index_name: string;
  index_value: number;
  model_count: number;
  created_at: string;
}

// ------------------------------------------------------------
// View types
// ------------------------------------------------------------

export interface SummaryStats {
  total_vendors: number;
  total_models: number;
  total_skus: number;
  total_modalities: number;
  latest_run_id: string;
}

export interface PricingIntel {
  kpi_name: string;
  kpi_value: number;
  kpi_unit: string;
  kpi_description: string;
}

// ------------------------------------------------------------
// Tool response helpers
// ------------------------------------------------------------

export interface RedactedModel {
  model_id: string;
  modality: string;
  direction: string;
  currency: string;
  region: string;
  // Redacted fields
  vendor_name: "[UPGRADE TO ATOM MCP — $49/mo]";
  model_name: "[UPGRADE TO ATOM MCP — $49/mo]";
  normalized_price: "[UPGRADE TO ATOM MCP — $49/mo]";
}

export interface ToolContext {
  tier: Tier;
  apiKey?: string;
}
