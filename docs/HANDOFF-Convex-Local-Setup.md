# Convex Local Setup Instructions

**Project:** PromptDB
**Working Directory:** `/Users/leemoore/promptdb`

---

## Step 1: Install Convex

```bash
bun add convex
```

This adds the Convex client library.

---

## Step 2: Initialize Convex Local Backend

```bash
npx convex dev --local --once
```

**Expected prompts:**

1. **"What would you like to configure?"** → Select **"a new project"**
2. **"Project name:"** → Enter **"promptdb"** (or accept default)

This creates:
- `convex/` directory
- `convex/_generated/` with TypeScript types
- `.env.local` with `CONVEX_URL=http://localhost:...`

The `--once` flag means it sets up and exits (doesn't stay running).

---

## Step 3: Create Empty Schema

Create file `convex/schema.ts`:

```typescript
import { defineSchema } from "convex/server";

export default defineSchema({});
```

---

## Step 4: Create Health Query

Create file `convex/health.ts`:

```typescript
import { query } from "./_generated/server";

export const check = query({
  args: {},
  handler: async () => {
    return { status: "ok" };
  },
});
```

---

## Step 5: Create Convex Client Utility

Create file `src/lib/convex.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  throw new Error("CONVEX_URL environment variable is required");
}

export const convex = new ConvexHttpClient(convexUrl);
```

---

## Step 6: Update Health Endpoint

Update `src/api/health.ts` to call Convex:

```typescript
import type { FastifyInstance } from "fastify";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";

export function registerHealthRoutes(fastify: FastifyInstance): void {
  fastify.get("/health", async (_request, _reply) => {
    try {
      const convexHealth = await convex.query(api.health.check);
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        convex: convexHealth.status === "ok" ? "connected" : "error",
      };
    } catch (error) {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        convex: "disconnected",
      };
    }
  });
}
```

---

## Step 7: Add npm Script

Update `package.json` scripts to add:

```json
"convex:dev": "npx convex dev --local"
```

---

## Step 8: Push Schema to Local Backend

Start the local Convex backend and push the schema:

```bash
npx convex dev --local --once
```

This syncs your `convex/` files to the local backend.

---

## Step 9: Verify Everything Works

**Terminal 1 - Start Convex local backend:**
```bash
bun run convex:dev
```

Leave this running. You should see logs indicating the local backend is ready.

**Terminal 2 - Start Fastify server:**
```bash
bun run dev
```

**Terminal 3 - Test the endpoint:**
```bash
curl http://localhost:5001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T...",
  "convex": "connected"
}
```

---

## Step 10: Run Quality Checks

```bash
bun run lint
bun run typecheck
```

Both should pass.

---

## Troubleshooting

**"CONVEX_URL environment variable is required"**
→ Make sure `.env.local` was created by step 2. It should contain `CONVEX_URL=http://127.0.0.1:...`

**"Cannot find module 'convex/_generated/api'"**
→ Run `npx convex dev --local --once` again to generate types

**Convex shows "disconnected"**
→ Make sure `bun run convex:dev` is running in another terminal

---

## When Done

Report back to the orchestrating session that Convex local setup is complete.
