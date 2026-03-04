<p align="center">
  <img src="https://raw.githubusercontent.com/StamatiosKanellakis/A7OM/main/ATOM_Logo_Gray.png" alt="ATOM" width="200" />
</p>

<h1 align="center">ATOM MCP Server</h1>

<p align="center">
  <strong>AI Inference Pricing Intelligence — delivered as a native tool for AI agents.</strong><br/>
  1,600+ SKUs · 40+ vendors · 6 modalities · 25 AIPI indexes · Updated weekly
</p>

<p align="center">
  <a href="https://a7om.com">Website</a> ·
  <a href="https://a7om.com/mcp">ATOM MCP Pro</a> ·
  <a href="https://smithery.ai/server/@a7om/atom-mcp-server">Smithery</a>
</p>

---

## What Is This?

ATOM MCP Server lets any MCP-compatible AI agent (Claude, GPT, Cursor, Windsurf, VS Code Copilot) query real-time AI inference pricing data programmatically. Think of it as **the Bloomberg Terminal for AI pricing**, accessible via the Model Context Protocol.

Ask your AI assistant a question like *"What's the cheapest way to run GPT-4o?"* and it calls ATOM's tools behind the scenes, returning a data-backed answer from 1,600+ pricing SKUs across 40+ vendors globally.

Built by [ATOM (A7OM)](https://a7om.com) — the world's first methodological inference pricing index.

---

## Tools

| Tool | Tier | Description |
|------|------|-------------|
| `list_vendors` | Free | All 41 tracked vendors with country, region, and pricing page URLs |
| `get_kpis` | Free | 6 market KPIs: output premium, caching savings, open-source advantage, context cost curve, caching availability, size spread |
| `get_index_benchmarks` | Free | AIPI price benchmarks across 25 indexes — text, image, audio, video, multimodal by geography and tier |
| `get_market_stats` | Tiered | Aggregate market intelligence: medians, quartiles, distributions, modality breakdown |
| `search_models` | Tiered | Multi-filter search: modality, vendor, creator, open-source, price range, context window, parameters |
| `get_model_detail` | Tiered | Full specs + pricing across all vendors for a single model |
| `compare_prices` | Tiered | Cross-vendor price comparison for a model or model family |
| `get_vendor_catalog` | Tiered | Complete catalog for a specific vendor: all models, modalities, and pricing |

---

## Pricing Tiers

| | ATOM MCP (Free) | ATOM MCP Pro ($49/mo) |
|---|---|---|
| Vendors, KPIs, AIPI indexes | ✅ Full data | ✅ Full data |
| Market stats | Aggregates only | + Vendor-level breakdown |
| Model search & comparison | Counts + price ranges | Full granular SKU data |
| Model detail | Specs only | + Per-vendor pricing |
| Vendor catalog | Summary only | Full SKU listing |

**Free tier** (no API key): Enough to understand the market — counts, ranges, distributions, benchmarks.

**ATOM MCP Pro** ($49/mo): Full granular data — every vendor, model, price, and spec. → [a7om.com/mcp](https://a7om.com/mcp)

---

## Quick Start

### Option 1: Remote URL — Claude.ai / Claude Desktop (recommended)

No install required. Connect directly to ATOM's hosted server:

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

> Note: Remote URL support requires a recent Claude Desktop version. If it doesn't work, use the npx method below.

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

### Option 2: Local (stdio) — for Cursor, Windsurf, etc.

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

Once connected, just ask your AI assistant naturally:

- *"What's the cheapest way to run GPT-4o?"*
- *"Compare Claude Sonnet 4.5 pricing across all vendors"*
- *"Find open-source text models under $0.50 per million tokens"*
- *"Show me Google's full model catalog"*
- *"What are the AIPI benchmark prices for text inference?"*
- *"Give me a market overview of AI inference pricing"*
- *"What are the key market KPIs for AI inference?"*

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

ATOM tracks 1,600+ AI inference pricing SKUs from 40+ vendors globally through the AIPI (ATOM Inference Price Index) system — the first methodological price benchmark for AI inference. Updated weekly using chained matched-model methodology to eliminate composition bias.

**Products:** [ATOM MCP](https://a7om.com/mcp) · [ATOM Terminal](https://a7om.com/terminal) · [ATOM Feed](https://a7om.com/feed)

---

## License

MIT

---

<p align="center"><strong>ATOM</strong> — <em>The Global Price Benchmark for AI Inference.</em></p>
