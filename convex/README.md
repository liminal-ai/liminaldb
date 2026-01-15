# Convex Layer

LiminalDB's data layer using Convex as the source of truth.

## Schema

```
users
├── userId (string, indexed) - WorkOS user ID
├── email (string)
└── createdAt (number)

prompts
├── userId (string, indexed) - owner
├── slug (string, indexed) - unique per user
├── name (string)
├── description (string, optional)
├── content (string)
├── tagNames (array) - denormalized for query performance
├── searchText (string) - concatenated fields for search index
├── pinned (boolean)
├── favorited (boolean)
├── usageCount (number)
├── lastUsedAt (number, optional)
└── createdAt/updatedAt (number)

tags (global shared tags - seeded on deployment)
├── name (string, indexed) - one of 19 fixed tag names
├── dimension (string, indexed) - 'purpose' | 'domain' | 'task'
└── Note: No userId - tags are global, not per-user

promptTags (junction table)
├── promptId (reference)
└── tagId (reference)

rankingConfig
├── userId (string, indexed)
├── usageWeight (number)
├── recencyWeight (number)
└── favoriteWeight (number)

userPreferences
├── userId (string, indexed)
└── themes (object) - per-surface theme preferences
```

## Directory Structure

```
convex/
├── schema.ts           # Table definitions
├── prompts.ts          # Prompt queries/mutations
├── triggers.ts         # Tag sync triggers
├── userPreferences.ts  # User preferences queries/mutations
├── functions.ts        # Re-exports for API client
├── errors.ts           # Error types
├── auth/
│   ├── apiKeyAuth.ts   # API key validation
│   └── userScoping.ts  # User ID enforcement
├── model/
│   ├── prompts.ts      # Prompt business logic
│   ├── ranking.ts      # Ranking algorithm
│   └── tags.ts         # Tag operations
├── migrations/         # Schema migrations
└── _generated/         # Convex auto-generated files
```

## Patterns

### Authentication

Convex doesn't handle auth directly. Fastify validates JWTs and passes:
- `apiKey` - Convex API key for authorization
- `userId` - Extracted from validated JWT

```typescript
// Every query/mutation receives userId and enforces scoping
export const listPrompts = query({
  args: { userId: v.string(), ... },
  handler: async (ctx, { userId, ... }) => {
    // All queries filter by userId
    return ctx.db.query("prompts")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();
  }
});
```

### Denormalization

`tagNames` array denormalized on `prompts` table for query performance:
- Avoids joins when listing prompts with tags
- Kept in sync via triggers when `promptTags` changes

### Search Index

Full-text search on `searchText` field:
```typescript
searchText = `${slug} ${name} ${description} ${content}`.toLowerCase()
```

Search index defined in schema with `filterFields: ["userId"]` for user scoping.

### Ranking

Prompts ranked by computed score:
```
score = (usageCount × usageWeight) +
        (recencyScore × recencyWeight) +
        (favorited ? favoriteWeight : 0)

recencyScore = 1 / (1 + daysSinceLastUse)
```

Pinned prompts sorted separately, always appear first.

### Triggers

`triggers.ts` defines automatic sync operations:
- When `promptTags` changes → update `prompts.tagNames`
- Runs as Convex scheduled function

## Key Functions

### Queries

| Function | Purpose |
|----------|---------|
| `prompts:list` | List user's prompts (ranked) |
| `prompts:get` | Get single prompt by slug |
| `prompts:search` | Full-text search with tag filter |
| `prompts:listTags` | Get user's tag names |

### Mutations

| Function | Purpose |
|----------|---------|
| `prompts:insert` | Create new prompt |
| `prompts:update` | Update existing prompt |
| `prompts:delete` | Delete prompt and associated tags |
| `prompts:trackUse` | Increment usage count |
| `prompts:updateFlags` | Update pinned/favorited |

## Local Development

```bash
# Start local Convex backend (Docker required)
bun run convex:dev

# Push schema changes
bunx convex dev

# Run Convex function tests
bun run test:convex
```

## Environment

| Variable | Purpose |
|----------|---------|
| `CONVEX_URL` | Convex deployment URL (local: `http://localhost:3210`) |
| `CONVEX_API_KEY` | API key for server-side calls |

## Testing

Tests in `tests/convex/` mock Convex context and test:
- Query logic and filtering
- Mutation validation
- Tag sync triggers
- Search index behavior
- Ranking algorithm
