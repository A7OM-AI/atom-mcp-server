# ATOM MCP Server

**AI Inference Pricing Intelligence — delivered as a native tool for AI agents.**

1,600+ SKUs · 40+ vendors · 6 modalities · 27+ queryable parameters · Weekly AIPI index updates

## What Is This?

ATOM MCP Server lets any MCP-compatible AI agent (Claude, ChatGPT, Cursor, VS Code Copilot) query real-time AI inference pricing data programmatically. Think of it as the Bloomberg Terminal for AI pricing, accessible via the Model Context Protocol.

Built by [ATOM (A7OM)](https://a7om.com) — the world's first methodological inference pricing index.

## Tools

| Tool | Description |
|------|-------------|
| `search_models` | Multi-filter search: modality, vendor, creator, open-source, price range, context window, parameters |
| `get_model_detail` | Full specs + pricing across all vendors for a single model |
| `compare_prices` | Cross-vendor price comparison for a model or model family |
| `get_vendor_catalog` | Complete catalog for a specific vendor |
| `get_market_stats` | Aggregate market intelligence: medians, quartiles, distributions |
| `get_price_history` | Historical pricing time series for trend detection |
| `get_kpis` | 6 market KPIs: output premium, caching savings, open-source advantage, etc. |
| `list_vendors` | All 41 tracked vendors with metadata |

## Pricing Tiers

**Free tier** (no API key): Full table structure with vendor/model/price columns redacted. Shows result count + price range. Great for discovery.

**Paid tier** ($49/month): Full granular data — every vendor, model, price, and spec. Visit [a7om.com/pricing](https://a7om.com/pricing).

## Quick Start

### Local (stdio) — for Claude Desktop, Cursor, etc.

```bash
git clone https://github.com/a7om/atom-mcp-server.git
cd atom-mcp-server
npm install
npm run build

# Add to your MCP client config:
# {
#   "mcpServers": {
#     "atom": {
#       "command": "node",
#       "args": ["path/to/atom-mcp-server/dist/index.js"],
#       "env": {
#         "SUPABASE_URL": "...",
#         "SUPABASE_ANON_KEY": "..."
#       }
#     }
#   }
# }
```

### Remote (HTTP) — for hosted deployments

```bash
TRANSPORT=http PORT=3000 node dist/index.js
# MCP endpoint: POST http://localhost:3000/mcp
# Health check: GET http://localhost:3000/health
```

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

Set environment variables in Railway dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ATOM_API_KEYS`
- `TRANSPORT=http`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `ATOM_API_KEYS` | No | Comma-separated valid API keys for paid tier |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port (default 3000) |

## Example Queries

Once connected, ask your AI agent:

- "Find the cheapest open-source text model with 128K context"
- "Compare GPT-4o pricing across all vendors"
- "What's the median output price for text models?"
- "Show me Anthropic's full catalog"
- "How has Claude Sonnet 4.5 pricing changed over the past 8 weeks?"
- "What are the current AIPI market KPIs?"

## Tech Stack

- TypeScript / Node.js
- MCP SDK v2 (`@modelcontextprotocol/sdk`)
- Supabase (PostgreSQL) via REST API
- Express (HTTP transport)
- Zod (schema validation)

## License

MIT

---

**ATOM** — *The pricing oracle for AI inference.*
