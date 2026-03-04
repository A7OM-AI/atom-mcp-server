#!/usr/bin/env node
// ============================================================
// ATOM MCP Server — Entry Point
// ============================================================
// Dual transport: stdio (local) and Streamable HTTP (remote).
// Set TRANSPORT=http for HTTP mode, default is stdio.
// ============================================================
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createServer } from "./server.js";
// ----------------------------------------------------------
// stdio transport (for Cursor, Claude Desktop, etc.)
// ----------------------------------------------------------
async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ATOM MCP Server running via stdio");
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

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "atom-mcp-server",
      version: "1.0.0",
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
    console.error(`ATOM MCP Server running on http://localhost:${port}/mcp`);
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

// ----------------------------------------------------------
// Transport selection
// ----------------------------------------------------------
const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("ATOM MCP Server HTTP error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("ATOM MCP Server stdio error:", error);
    process.exit(1);
  });
}
