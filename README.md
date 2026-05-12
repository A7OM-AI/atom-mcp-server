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
