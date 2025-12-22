# Convex CLI

> Source: https://docs.convex.dev/cli

## Installation

```bash
npm install convex
```

## Create a New Project

```bash
npx convex dev
```

First run will prompt you to log in and create a new Convex project. Creates:
1. `convex/` directory for functions
2. `.env.local` with `CONVEX_DEPLOYMENT` variable

## Development Commands

### Run the Convex Dev Server

```bash
npx convex dev
```

Watches the local filesystem. When you change a function or schema, pushes to your dev deployment.

### Open the Dashboard

```bash
npx convex dashboard
```

### Run Convex Functions

```bash
npx convex run <functionName> [args]
npx convex run messages:send '{"body": "hello", "author": "me"}'
```

Add `--watch` for live updates, `--push` to push code first.

### Tail Deployment Logs

```bash
npx convex dev --tail-logs always   # Show all logs
npx convex dev                       # Pause during deploys (default)
npx convex dev --tail-logs disable  # No logs
npx convex logs                      # Tail without deploying
```

### Import/Export Data

```bash
npx convex import --table <tableName> <path>
npx convex export --path <directoryPath>
```

### Environment Variables

```bash
npx convex env list
npx convex env get <name>
npx convex env set <name> <value>
npx convex env remove <name>
```

## Deploy to Production

```bash
npx convex deploy
```

Uses `CONVEX_DEPLOY_KEY` in CI, or the production deployment of your project.

Options:
- `--cmd "npm run build"` - Run a command with CONVEX_URL available
- `--cmd-url-env-var-name CUSTOM_CONVEX_URL` - Customize the URL env var

## Update Generated Code

```bash
npx convex codegen
```

Regenerates code in `convex/_generated` directory.
