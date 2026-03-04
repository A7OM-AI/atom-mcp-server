// ============================================================
// ATOM MCP Server — Supabase REST Client
// ============================================================
// Lightweight fetch-based client for Supabase PostgREST API.
// No Supabase JS SDK dependency — keeps the binary small.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "ATOM MCP: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables."
  );
}

const BASE = `${SUPABASE_URL}/rest/v1`;

const headers: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ------------------------------------------------------------
// Generic query builder
// ------------------------------------------------------------

interface QueryOptions {
  table: string;
  select?: string;
  filters?: string[]; // PostgREST filter strings e.g. "vendor_name=eq.OpenAI"
  order?: string; // e.g. "normalized_price.asc"
  limit?: number;
  offset?: number;
  count?: "exact" | "planned" | "estimated";
}

export async function query<T>(opts: QueryOptions): Promise<{ data: T[]; count: number | null }> {
  const params = new URLSearchParams();

  if (opts.select) params.set("select", opts.select);
  if (opts.order) params.set("order", opts.order);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));

  let url = `${BASE}/${opts.table}?${params.toString()}`;

  // Append filters directly (PostgREST uses column=operator.value syntax)
  if (opts.filters && opts.filters.length > 0) {
    for (const f of opts.filters) {
      url += `&${f}`;
    }
  }

  const reqHeaders = { ...headers };
  if (opts.count) {
    reqHeaders["Prefer"] = `count=${opts.count}`;
  }

  const response = await fetch(url, { headers: reqHeaders });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as T[];
  const contentRange = response.headers.get("content-range");
  let count: number | null = null;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+|\*)/);
    if (match && match[1] !== "*") {
      count = parseInt(match[1], 10);
    }
  }

  return { data, count };
}

// ------------------------------------------------------------
// RPC call helper (for Supabase functions / views)
// ------------------------------------------------------------

export async function rpc<T>(functionName: string, body?: Record<string, unknown>): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase RPC ${functionName} failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T[];
}

// ------------------------------------------------------------
// Convenience helpers for common tables
// ------------------------------------------------------------

export async function queryTable<T>(
  table: string,
  filters: string[] = [],
  options: Partial<QueryOptions> = {}
): Promise<T[]> {
  const result = await query<T>({
    table,
    filters,
    ...options,
  });
  return result.data;
}

export async function queryView<T>(
  viewName: string,
  filters: string[] = [],
  options: Partial<QueryOptions> = {}
): Promise<T[]> {
  return queryTable<T>(viewName, filters, options);
}
