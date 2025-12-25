# MCP Inspector

> Source: https://modelcontextprotocol.io/docs/tools/inspector

The MCP Inspector is an interactive developer tool for testing and debugging MCP servers.

## Installation and Usage

The Inspector runs directly through `npx` without requiring installation:

```bash
npx @modelcontextprotocol/inspector <command>
```

### Inspecting npm packages

```bash
npx -y @modelcontextprotocol/inspector npx <package-name> <args>

# Example
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-filesystem /Users/username/Desktop
```

### Inspecting local servers

```bash
# TypeScript
npx @modelcontextprotocol/inspector node path/to/server/index.js args...

# Python
npx @modelcontextprotocol/inspector \
  uv \
  --directory path/to/server \
  run \
  package-name \
  args...
```

## Features

### Server Connection Pane
- Select transport type (stdio, HTTP+SSE, WebSocket)
- Customize command-line arguments and environment

### Resources Tab
- Lists all available resources
- Shows resource metadata (MIME types, descriptions)
- Allows resource content inspection
- Supports subscription testing

### Prompts Tab
- Displays available prompt templates
- Shows prompt arguments and descriptions
- Enables prompt testing with custom arguments
- Previews generated messages

### Tools Tab
- Lists available tools
- Shows tool schemas and descriptions
- Enables tool testing with custom inputs
- Displays tool execution results

### Notifications Pane
- Presents all logs recorded from the server
- Shows notifications received from the server

## Development Workflow

1. **Start Development**
   - Launch Inspector with your server
   - Verify basic connectivity
   - Check capability negotiation

2. **Iterative Testing**
   - Make server changes
   - Rebuild the server
   - Reconnect the Inspector
   - Test affected features
   - Monitor messages

3. **Test Edge Cases**
   - Invalid inputs
   - Missing prompt arguments
   - Concurrent operations
   - Verify error handling

## Repository

https://github.com/modelcontextprotocol/inspector
