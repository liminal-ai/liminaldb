# Convex Quickstart

> Source: https://docs.convex.dev/quickstart

Convex provides a fully featured backend with cloud functions, database, scheduling, and a sync engine that keeps your frontend and backend up to date in real-time.

## Prerequisites

- Node.js 18+
- Git

## Getting Started

```bash
git clone https://github.com/get-convex/convex-tutorial.git
cd convex-tutorial
npm install
npm run dev
```

This will:
1. Set up Convex (authenticate with GitHub)
2. Create your backend automatically
3. Create a `convex/` folder for backend code

## How Convex Works

- **Database**: Document-relational database with tables containing JSON-like documents
- **Mutation functions**: TypeScript functions that update the database (run as transactions)
- **Query functions**: TypeScript functions that read from the database
- **Sync engine**: Reruns queries when data changes, updates all listening apps

## Your First Mutation

```typescript
// convex/chat.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    user: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      user: args.user,
      body: args.body,
    });
  },
});
```

## Your First Query

```typescript
// convex/chat.ts
import { query, mutation } from "./_generated/server";

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").order("desc").take(50);
    return messages.reverse();
  },
});
```

## Using in React

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const messages = useQuery(api.chat.getMessages);
  const sendMessage = useMutation(api.chat.sendMessage);

  // ...
}
```
