# Convex Schema

> Source: https://docs.convex.dev/database/schemas

A schema describes the tables in your Convex project and the type of documents within them.

## Writing Schemas

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    body: v.string(),
    user: v.id("users"),
  }),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
});
```

## Validators

```typescript
import { v } from "convex/values";

defineTable({
  id: v.id("documents"),
  string: v.string(),
  number: v.number(),
  boolean: v.boolean(),
  nestedObject: v.object({
    property: v.string(),
  }),
})
```

### Optional Fields

```typescript
defineTable({
  optionalString: v.optional(v.string()),
  optionalNumber: v.optional(v.number()),
})
```

### Unions

```typescript
defineTable({
  stringOrNumber: v.union(v.string(), v.number()),
})
```

### Literals

```typescript
defineTable({
  oneTwoOrThree: v.union(
    v.literal("one"),
    v.literal("two"),
    v.literal("three"),
  ),
})
```

### Record Objects

```typescript
defineTable({
  simpleMapping: v.record(v.string(), v.boolean()),
})
```

## Schema Options

### schemaValidation

```typescript
defineSchema(
  { /* tables */ },
  { schemaValidation: false }  // Disable runtime validation
)
```

### strictTableNameTypes

```typescript
defineSchema(
  { /* tables */ },
  { strictTableNameTypes: false }  // Allow accessing unlisted tables
)
```

## TypeScript Types

Use `Doc<TableName>` for document types:

```tsx
import { Doc } from "../convex/_generated/dataModel";

function MessageView(props: { message: Doc<"messages"> }) {
  // ...
}
```
