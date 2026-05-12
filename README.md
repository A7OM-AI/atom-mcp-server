<p align="center">
  <img src="https://raw.githubusercontent.com/StamatiosKanellakis/A7OM/main/ATOM_Logo_Gray.png" alt="ATOM" width="200" />
</p>

<h1 align="center">ATOM MCP Server</h1>

<p align="center">
  <strong>The Global Price Benchmark for AI Inference, delivered as a native tool for AI agents.</strong><br/>
  Independent pricing intelligence for developers, analysts, and infrastructure buyers. Transparent methodology, deterministic indexing, weekly market intelligence across the global AI inference market.
</p>

<p align="center">
  <a href="https://a7om.com">Website</a> ·
  <a href="https://a7om.com/about">About ATOM</a> ·
  <a href="https://a7om.com/methodology">Methodology</a> ·
  <a href="https://a7om.com/mcp">ATOM MCP Pro</a>
</p>

---

## What This Is

ATOM MCP Server lets any MCP-compatible AI agent (Claude, GPT, Cursor, Windsurf, VS Code Copilot) query live AI inference pricing data programmatically. Built on financial index methodology comparable to S&P Dow Jones, MSCI, and Bloomberg, the ATOM Inference Price Index (AIPI) is the first independent benchmark for the AI inference market.

Ask your AI assistant a question like *"What's the cheapest way to run GPT-4o?"* and it calls ATOM's tools behind the scenes, returning a data-backed answer pulled from live coverage across the global vendor landscape.

---

## AIPI Indexes

The AIPI index family spans four categories, all calculated weekly using chained matched-model methodology to eliminate composition bias:

| Category | Examples | What It Answers |
|----------|----------|-----------------|
| **Modality** | Text, Multimodal, Image, Audio, Video, Voice | What does this type of inference cost? |
| **Channel** | Model Developers, Cloud Marketplaces, Inference Platforms, Neoclouds | Where should you buy: direct, marketplace, platform, or neocloud? |
| **Tier** | Frontier, Budget, Mid-Tier, Reasoning | What is the premium for capability? |
| **Special** | Open-Source | How much cheaper is open-weight inference? |

All indexes are global (GLB) and reported across three pricing directions: input, cached input, output.

---

## Tools

| Tool | Tier | Description |
|------|------|-------------|
| `list_vendors` | Free | All tracked vendors with country, region, channel type, and pricing page URLs |
| `get_kpis` | Free | Market KPIs: output premium, caching savings, open-source advantage, context cost curve, caching availability, size spread |
| `get_index_benchmarks` | Free | AIPI price benchmarks across all indexes |
| `get_market_stats` | Tiered | Aggregate market intelligence: medians, quartiles, distributions, modality breakdown |
| `search_models` | Tiered | Multi-filter search: modality, vendor, creator, open-source, price range, context window, parameters |
| `get_model_detail` | Tiered | Full specs and pricing across all vendors for a single model |
| `compare_prices` | Tiered | Cross-vendor price comparison for a model or model family |
| `get_vendor_catalog` | Tiered | Complete catalog for a specific vendor |

---

## Pricing Tiers

| | ATOM MCP (Free) | ATOM MCP Pro |
|---|---|---|
| Vendors, KPIs, AIPI indexes | Full data | Full data |
| Market stats | Aggregates only | Vendor-level breakdown |
| Model search and comparison | Counts and price ranges | Full granular SKU data |
| Model detail | Specs only | Per-vendor pricing |
| Vendor catalog | Summary only | Full SKU listing |

**Free tier** (no API key): enough to understand the market through counts, ranges, distributions, and benchmarks.

**ATOM MCP Pro**: full granular data across every vendor, model, price, and spec. Subscribe at [a7om.com/mcp](https://a7om.com/mcp).

---

## Quick Start

### Option 1: Remote URL for Claude.ai and Claude Desktop (recommended)

No install required. Connect directly to ATOM's hosted server.

**Claude.ai (web):** Settings → Connectors → Add custom connector

```
Name: ATOM Pricing Intelligence
URL:  https://atom-mcp-server-production.up.railway.app/mcp
```

**Claude Desktop:** Settings → Developer → Edit Config

```json
{
  "mcpServers": {
    "atom-pricing": {
      "url": "https://atom-mcp-server-production.up.railway.app/mcp"
    }
  }
}
```

> Note: Remote URL support requires a recent Claude Desktop version. If it does not work, use the npx method below.

**Claude Desktop (via npx proxy):**

```json
{
  "mcpServers": {
    "atom-pricing": {
      "command": "npx",
      "args": ["mcp-remote", "https://atom-mcp-server-production.up.railway.app/mcp"]
    }
  }
}
```

### Option 2: Local (stdio) for Cursor, Windsurf, and similar clients

```bash
git clone https://github.com/A7OM-AI/atom-mcp-server.git
cd atom-mcp-server
npm install && npm run build
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "atom-pricing": {
      "command": "node",
      "args": ["/path/to/atom-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://jonncmzxvxzwyaznokba.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

### Option 3: Deploy your own (Railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

Set environment variables in Railway dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ATOM_API_KEYS` (comma-separated, for paid tier validation)
- `TRANSPORT=http`

---

## Example Queries

Once connected, ask your AI assistant in natural language:

- *"What's the cheapest way to run GPT-4o?"*
- *"Compare Claude Sonnet 4.5 pricing across all vendors"*
- *"Find open-source text models under $0.50 per million tokens"*
- *"Show me Google's full model catalog"*
- *"What are the AIPI benchmark prices for text inference?"*
- *"How do neocloud prices compare to cloud marketplaces?"*
- *"How much cheaper is open-source inference?"*
- *"Give me a market overview of AI inference pricing"*

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `ATOM_API_KEYS` | No | Comma-separated valid API keys for paid tier |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port (default 3000) |

---

## Tech Stack

- TypeScript / Node.js
- MCP SDK (`@modelcontextprotocol/sdk`)
- Supabase (PostgreSQL) via REST API
- Express (HTTP transport)
- Zod (schema validation)

---

## About ATOM

The Global Price Benchmark for AI Inference. Independent pricing intelligence for developers, analysts, and infrastructure buyers. Transparent methodology, deterministic indexing, weekly market intelligence across the global AI inference market.

ATOM was founded in 2025 by Stamos Kanellakis. The platform is built on financial index methodology comparable to S&P Dow Jones, MSCI, and Bloomberg, and applies that discipline to a market that previously had no pricing benchmark of its own.

**Products:** [ATOM MCP](https://a7om.com/mcp) · [ATOM Terminal](https://a7om.com/terminal) · [ATOM Feed](https://a7om.com/feed)

---

## License

MIT

---

<p align="center"><strong>ATOM</strong> · <em>The Global Price Benchmark for AI Inference.</em></p>
