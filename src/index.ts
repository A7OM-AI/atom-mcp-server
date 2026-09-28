#!/usr/bin/env node
// ============================================================
// Attic Standard MCP Server — Entry Point
// ============================================================
// Dual transport: stdio (local) and Streamable HTTP (remote).
// Set TRANSPORT=http for HTTP mode, default is stdio.
// ============================================================
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createServer } from "./server.js";
import { SERVER_NAME, SERVER_VERSION, ICON_PATH, ICON_SOURCE, SITE } from "./config.js";
// ----------------------------------------------------------
// stdio transport (for Cursor, Claude Desktop, etc.)
// ----------------------------------------------------------
async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Attic Standard MCP Server running via stdio");
}
// ----------------------------------------------------------
// Streamable HTTP transport (for hosted / remote access)
// ----------------------------------------------------------
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // CORS — allow browser-based MCP clients and test tools
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
    next();
  });

  // Icon: the site's favicon, fetched once and served from this host so
  // MCP clients that look for a favicon on the server address find one.
  let icon: Buffer | null = null;
  const sendIcon = async (_req: express.Request, res: express.Response) => {
    try {
      if (!icon) {
        const r = await fetch(ICON_SOURCE);
        if (!r.ok) throw new Error(`icon ${r.status}`);
        icon = Buffer.from(await r.arrayBuffer());
      }
      res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=86400").send(icon);
    } catch {
      res.redirect(302, `${SITE}/favicon.ico`);
    }
  };
  app.get([ICON_PATH, "/favicon.ico", "/apple-touch-icon.png"], sendIcon);

  // Root: a minimal page so browsers and clients see the name and icon.
  app.get("/", (_req, res) => {
    res
      .type("html")
      .send(
        `<!doctype html><html><head><meta charset="utf-8"><title>Attic Standard MCP</title><link rel="icon" type="image/png" href="${ICON_PATH}"><link rel="apple-touch-icon" href="${ICON_PATH}"></head><body style="font-family:sans-serif"><p>Attic Standard MCP server. Connect your MCP client to <code>/mcp</code>. <a href="${SITE}/mcp">atticstandard.com/mcp</a></p></body></html>`
      );
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: SERVER_NAME,
      version: SERVER_VERSION,
    });
  });

  // MCP endpoint — stateless mode (new transport per request)
  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Handle GET and DELETE for MCP protocol completeness
  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      error: "Method Not Allowed. Use POST for MCP requests.",
    });
  });

  app.delete("/mcp", (_req, res) => {
    res.status(405).json({
      error: "Method Not Allowed. Stateless server — no sessions to delete.",
    });
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(`Attic Standard MCP Server running on http://localhost:${port}/mcp`);
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

// ----------------------------------------------------------
// Transport selection
// ----------------------------------------------------------
const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Attic Standard MCP Server HTTP error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Attic Standard MCP Server stdio error:", error);
    process.exit(1);
  });
}
