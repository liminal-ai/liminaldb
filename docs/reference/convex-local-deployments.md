# Convex Local Deployments

> Source: https://docs.convex.dev/cli/local-deployments

## Overview

Develop against a Convex deployment running on your own computer. Code sync is faster and resources don't count against Convex plan quotas.

**Status:** Beta feature

## Using Local Deployments

The local Convex backend runs as a subprocess of `npx convex dev` and exits when that command stops.

State stored in `~/.convex/` directory.

### For New Projects (Anonymous Development)

```bash
npx convex dev --local
```

No Convex account required. Create account later with `npx convex login` to link local deployments.

### For Existing Projects

```bash
npx convex dev --local --once
```

Or use `npx convex dev --configure` to choose local deployment option.

## Local vs Production

Local deployments are **development only**:
- Logs and stack traces sent to clients
- Not for production use

For production: use Convex cloud or self-host via [convex-backend repo](https://github.com/get-convex/convex-backend).

## Disabling Local Deployments

```bash
npx convex disable-local-deployments
```

Note: Cloud and local deployments have separate data. Export/import if switching.

## Limitations

- **No Public URL** - Can't receive external HTTP requests (use ngrok or cloud for webhooks)
- **Node actions require Node.js 18** - Use nvm to manage versions
- **Node.js actions run directly** - Unrestricted filesystem access (queries/mutations still isolated)
- **Logs cleared on restart**
- **Safari blocks localhost** - Use different browser
- **Brave blocks localhost** - Enable `#brave-localhost-access-permission` flag
