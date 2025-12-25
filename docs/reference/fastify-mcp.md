# fastify-mcp

> Source: https://github.com/haroldadmin/fastify-mcp

A Fastify plugin to run Model Context Protocol (MCP) servers.

Supports:
- Streamable HTTP transport (protocol version 2025-03-26)
- Legacy HTTP+SSE transport (protocol version 2024-11-05)

## Installation

```bash
npm install fastify-mcp
# or
yarn add fastify-mcp
```

## Usage

### Define Your MCP Server

```typescript
function createServer() {
  const mcpServer = new McpServer({
    name: "...",
    version: "...",
  });

  mcpServer.tool("...");
  mcpServer.resource("...");

  return mcpServer.server;
}
```

### Register with Fastify

```typescript
import { fastify } from "fastify";
import { streamableHttp } from "fastify-mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = fastify();

app.register(streamableHttp, {
  // Set to `true` if you want a stateful server
  stateful: false,
  mcpEndpoint: "/mcp",
  sessions: new Sessions<StreamableHTTPServerTransport>(),
  createServer,
});

app.listen({ port: 8080 });
```

## Session Management

The MCP TypeScript SDK does not support managing multiple sessions out of the box. This package uses an in-memory mapping of sessions against session IDs.

### Session Events

The `Sessions` class emits:
- `connected`: When a new session is added
- `terminated`: When a session is removed
- `error`: When an async event handler throws

```typescript
const sessions = new Sessions<StreamableHTTPServerTransport>();

sessions.on("connected", (sessionId) => {
  console.log(`Session ${sessionId} connected`);
});

sessions.on("terminated", (sessionId) => {
  console.log(`Session ${sessionId} terminated`);
});
```

## Examples

See the [examples directory](https://github.com/haroldadmin/fastify-mcp/tree/main/examples) for detailed usage.
