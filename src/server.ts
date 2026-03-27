// ============================================================
// ATOM MCP Server — Tool Registration
// ============================================================
// Registers all 8 tools with the MCP SDK's McpServer.
// Each tool handler resolves the caller's tier from the API key
// passed via the _atom_api_key field.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveTier } from "./auth.js";

// Tool imports
import { searchModelsSchema, handleSearchModels } from "./tools/search-models.js";
import { getModelDetailSchema, handleGetModelDetail } from "./tools/get-model-detail.js";
import { comparePricesSchema, handleComparePrices } from "./tools/compare-prices.js";
import { getVendorCatalogSchema, handleGetVendorCatalog } from "./tools/get-vendor-catalog.js";
import { getMarketStatsSchema, handleGetMarketStats } from "./tools/get-market-stats.js";
import { getIndexBenchmarksSchema, handleGetIndexBenchmarks } from "./tools/get-index-benchmarks.js";
import { getKpisSchema, handleGetKpis } from "./tools/get-kpis.js";
import { listVendorsSchema, handleListVendors } from "./tools/list-vendors.js";

// Common API key field injected into every tool's schema
const apiKeyField = {
  _atom_api_key: z
    .string()
    .optional()
    .describe("Your ATOM API key for full access. Omit for free tier (redacted data)."),
};

export function createServer(): McpServer {
  const server = new McpServer({
    name: "atom-mcp-server",
    version: "1.1.0",
  });

  // ----------------------------------------------------------
  // 1. search_models
  // ----------------------------------------------------------
  server.registerTool(
    "search_models",
    {
      title: "Search AI Models",
      description: `Search and filter AI inference models across 40+ vendors and 1,600+ SKUs.

Query by modality (Text, Image, Audio, Video, Multimodal), vendor, creator, model family, open-source status, price range, context window, and parameter count.

Returns matching models with pricing. Free tier shows count + price range; paid tier shows full details.

Examples:
  - "Find open-source text models under $1/M tokens" → open_source=true, modality="Text", max_price=0.001
  - "What multimodal models does Google offer?" → vendor="Google", modality="Multimodal"
  - "Models with 128K+ context window" → min_context_window=128000`,
      inputSchema: { ...searchModelsSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleSearchModels(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 2. get_model_detail
  // ----------------------------------------------------------
  server.registerTool(
    "get_model_detail",
    {
      title: "Get Model Details",
      description: `Deep dive on a single AI model: technical specs + pricing across all vendors.

Returns model_registry data (context window, parameters, open-source status, training cutoff, model family) plus all SKU pricing across every vendor that offers this model.

Examples:
  - "Tell me everything about GPT-4o" → model_name="GPT-4o"
  - "Claude Sonnet 4.5 specs and pricing" → model_name="Claude Sonnet 4.5"`,
      inputSchema: { ...getModelDetailSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleGetModelDetail(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 3. compare_prices
  // ----------------------------------------------------------
  server.registerTool(
    "compare_prices",
    {
      title: "Compare Prices Across Vendors",
      description: `Cross-vendor price comparison for a specific model or model family.

Shows the same model (or family) priced across different vendors, sorted cheapest first. Essential for cost optimization and vendor selection.

Examples:
  - "Compare Llama 3.1 70B pricing across vendors" → model_name="Llama 3.1 70B"
  - "Cheapest GPT-4 family output pricing" → model_family="GPT-4", direction="Output"
  - "Claude pricing comparison" → model_family="Claude"`,
      inputSchema: { ...comparePricesSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleComparePrices(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 4. get_vendor_catalog
  // ----------------------------------------------------------
  server.registerTool(
    "get_vendor_catalog",
    {
      title: "Get Vendor Catalog",
      description: `Full catalog for a specific vendor: all models, modalities, and pricing.

Returns vendor metadata (country, region, pricing page URL) plus every model and SKU they offer.

Examples:
  - "What does Together AI sell?" → vendor="Together AI"
  - "OpenAI's text model pricing" → vendor="OpenAI", modality="Text"
  - "Amazon Bedrock catalog" → vendor="Amazon Bedrock"`,
      inputSchema: { ...getVendorCatalogSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleGetVendorCatalog(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 5. get_market_stats
  // ----------------------------------------------------------
  server.registerTool(
    "get_market_stats",
    {
      title: "Get Market Statistics",
      description: `Aggregate AI inference market intelligence.

Returns total vendor/model/SKU counts, price distribution (median, mean, quartiles, min/max), and modality breakdown. Optionally filter by modality.

Examples:
  - "AI inference market overview" → (no params)
  - "Text model pricing statistics" → modality="Text"
  - "Image generation market stats" → modality="Image"`,
      inputSchema: { ...getMarketStatsSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleGetMarketStats(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 6. get_index_benchmarks
  // ----------------------------------------------------------
  server.registerTool(
    "get_index_benchmarks",
    {
      title: "Get AIPI Index Benchmarks",
      description: `AIPI (ATOM Inference Price Index) — chained matched-model price benchmarks for AI inference.

Returns 14 benchmark indexes across four categories:
- Modality (6): Text, Multimodal, Image, Audio, Video, Voice — what does this type of inference cost?
- Channel (4): Model Developers, Cloud Marketplaces, Inference Platforms, Neoclouds — where should you buy?
- Tier (3): Frontier, Budget, Reasoning — what's the premium for capability?
- Special (1): Open-Source — how much cheaper is open-weight inference?

Each index includes input, cached input, and output pricing per period.

These are market-wide benchmarks, not individual vendor prices. Use them to understand where the market is and how it's moving.

Fully public — available to all tiers.

Examples:
  - "What's the current benchmark for text inference?" → index_category="Modality"
  - "Show me all AIPI indexes" → (no params)
  - "Neocloud pricing benchmark" → index_code="AIPI NCL GLB"
  - "Channel pricing comparison" → index_category="Channel"
  - "Open-source vs market pricing" → index_code="AIPI OSS GLB"`,
      inputSchema: { ...getIndexBenchmarksSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleGetIndexBenchmarks(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 7. get_kpis
  // ----------------------------------------------------------
  server.registerTool(
    "get_kpis",
    {
      title: "Get Market KPIs",
      description: `ATOM Inference Price Index (AIPI) market-level KPIs.

Returns 6 key performance indicators derived from live pricing data:
- Output Premium: how much more output tokens cost vs input
- Caching Savings: average discount for cached input pricing
- Open Source Advantage: price difference between open-source and proprietary
- Context Cost Curve: price multiplier for larger context windows
- Caching Availability: % of models offering cached pricing
- Size Spread: price ratio between largest and smallest models

These KPIs are available to all tiers — they demonstrate ATOM's market intelligence.`,
      inputSchema: { ...getKpisSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleGetKpis(params, tier);
    }
  );

  // ----------------------------------------------------------
  // 8. list_vendors
  // ----------------------------------------------------------
  server.registerTool(
    "list_vendors",
    {
      title: "List All Vendors",
      description: `List all AI inference vendors tracked by ATOM.

Returns vendor name, country, region, and pricing page URL. Vendors span four channel types: Model Developers, Cloud Marketplaces, Inference Platforms, and Neoclouds. Optionally filter by region or country.

Examples:
  - "List all vendors" → (no params)
  - "European AI vendors" → region="Europe"
  - "Chinese AI vendors" → country="China"`,
      inputSchema: { ...listVendorsSchema, ...apiKeyField },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const tier = await resolveTier(params._atom_api_key);
      return handleListVendors(params, tier);
    }
  );

  return server;
}
