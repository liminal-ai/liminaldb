# Story 4: CLI Merge Command (External Repo: `liminaldb-cli`)

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Enable users to merge a prompt template from the CLI, keeping stdout clean for piping.

## Scope

### In Scope
- `liminaldb merge <slug> --<fieldName> <value> ...` (in `liminaldb-cli`)
- Uses REST merge endpoint from Story 2

### Out of Scope
- Any changes inside this repository (this story is implemented elsewhere)

## Dependencies / Prerequisites

- Story 2 complete
- Story 1 recommended (so CLI `get` output shows `mergeFields`)

## Acceptance Criteria

**AC-4.1:** CLI merge command accepts slug and field values as flags

- **TC-4.1a: Basic merge**
  - Given: A prompt `write-tests` with fields `{{language}}` and `{{code}}`
  - When: User runs `liminaldb merge write-tests --language python --code "def foo(): pass"`
  - Then: Merged content is printed to stdout
- **TC-4.1b: Prompt not found**
  - Given: No prompt with the given slug exists
  - When: User runs merge
  - Then: Error message is printed to stderr and exit code is non-zero

**AC-4.2:** CLI warns on unfilled fields via stderr

- **TC-4.2a: Partial merge warning**
  - Given: Prompt has fields `{{a}}` and `{{b}}`, user provides only `--a value`
  - When: User runs merge
  - Then: Merged content (with `{{b}}` unfilled) is printed to stdout, warning about unfilled `b` to stderr
- **TC-4.2b: Stdout stays clean**
  - Given: Merge has unfilled field warnings
  - When: Output is piped (e.g., `liminaldb merge ... | pbcopy`)
  - Then: Stdout contains only the merged content, warnings go to stderr

## Definition of Done

- [ ] No code changes in this repository
- [ ] REST merge endpoint contract from Story 2 is sufficient for CLI implementation

## Technical Implementation

### Architecture Context

This story is implemented in the `liminaldb-cli` repository. In this repository,
the only dependency is that Story 2's REST endpoint remains stable and documented.

### Interfaces & Contracts

**Consumes: `POST /api/prompts/:slug/merge`**

```
Method: POST
Path:   /api/prompts/:slug/merge
Auth:   Bearer token (Authorization header)
```

Request body:

```typescript
{
  values: Record<string, string>  // field name -> replacement value
}
```

Success response (200):

```typescript
{
  content: string;          // merged content with values substituted
  mergeFields: string[];    // all fields found in the template (first-occurrence order)
  unfilledFields: string[]; // fields with no matching value (first-occurrence order)
}
```

Error responses:

| Status | Response | When |
|--------|----------|------|
| 404 | `{ error: "Prompt not found" }` | No prompt with given slug |
| 400 | `{ error: "<Zod issue message>" }` | `values` missing or invalid type |
| 401 | Unauthorized | Missing or invalid auth token |

### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-4.1a | (liminaldb-cli repo) | `merge` command prints merged content to stdout | CLI integration test: run command, capture stdout |
| TC-4.1b | (liminaldb-cli repo) | `merge` command errors on unknown slug | CLI integration test: non-zero exit + stderr |
| TC-4.2a | (liminaldb-cli repo) | warns on unfilled fields via stderr | CLI integration test: assert stdout content + stderr warning |
| TC-4.2b | (liminaldb-cli repo) | stdout stays clean for piping | CLI integration test: stderr contains warnings, stdout contains only merged content |

### Non-TC Decided Tests

None. All CLI merge tests are 1:1 with TCs and live in the `liminaldb-cli` repo.

### Risks & Constraints

- **stdout/stderr separation:** Merged content must go to stdout only. Warnings (unfilled fields) and errors must go to stderr only. This is critical for piping (`liminaldb merge ... | pbcopy`). TC-4.2b verifies this explicitly.
- **Flag parsing edge cases:** Field values may contain dashes, spaces, or special characters. The CLI flag parser must handle values like `--code "def foo(): pass"` and `--language "C++"` without mangling.
- **Auth token forwarding:** The CLI must include the user's auth token in the `Authorization: Bearer` header. Auth token retrieval follows existing `liminaldb` CLI patterns (env var or stored credential).
- **Empty values dict:** If the user provides no `--field` flags, the CLI should still call the merge endpoint with `values: {}` — this returns content unchanged with all fields unfilled, which is valid.

### Spec Deviation

None. Checked against Tech Design: §1. High Altitude — External Contract Changes (CLI), §2. Medium Altitude — Flow 5: CLI merge Command.

## Technical Checklist

- [ ] Confirm the API contract above matches Story 2's implementation.
- [ ] No code changes in this repository.
- [ ] Expected verification in `liminaldb-cli` repo: CLI tests pass, stdout/stderr separation works for piped output, auth token flows correctly.

---
