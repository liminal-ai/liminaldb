# MCP Server Health Checks

> Source: https://mcpcat.io/guides/building-health-check-endpoint-mcp-server/

## Quick Answer

Add health check endpoints to your MCP server for monitoring and automated recovery:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', server: 'mcp-server' });
});

app.get('/health/ready', async (req, res) => {
  const isReady = await checkDependencies();
  res.status(isReady ? 200 : 503).json({ ready: isReady });
});
```

## Types of Health Checks

### Basic Health Check (Liveness)

Confirms the server process is running:

```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mcp-server',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  };
  res.status(200).json(health);
});
```

Load balancers check this every 5-10 seconds.

### Readiness Check

Verifies the server can handle actual MCP requests:

```typescript
app.get('/health/ready', async (req, res) => {
  try {
    const mcpReady = mcpServer.isInitialized && mcpServer.tools.length > 0;
    const dbConnected = await checkDatabaseConnection();
    const apiAvailable = await checkExternalAPIHealth();

    const ready = mcpReady && dbConnected && apiAvailable;

    res.status(ready ? 200 : 503).json({
      ready,
      checks: {
        mcp: mcpReady,
        database: dbConnected,
        externalAPI: apiAvailable
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});
```

## Caching to Prevent Overload

```typescript
const DEPENDENCY_CHECK_INTERVAL = 30000; // 30 seconds
let lastDependencyCheck = { time: 0, status: true };

async function checkDependencies(): Promise<boolean> {
  const now = Date.now();
  if (now - lastDependencyCheck.time < DEPENDENCY_CHECK_INTERVAL) {
    return lastDependencyCheck.status;
  }

  const checks = await Promise.all([
    checkDatabase(),
    checkExternalAPI(),
    checkMCPServerInit()
  ]);

  lastDependencyCheck = { time: now, status: checks.every(c => c) };
  return lastDependencyCheck.status;
}
```

## Best Practices

1. Always include functional checks that exercise core MCP capabilities
2. Implement timeouts for all external calls
3. Use connection pooling to prevent resource exhaustion
4. Cache dependency status to avoid overwhelming external services
5. For production: use rolling windows and percentage-based thresholds
