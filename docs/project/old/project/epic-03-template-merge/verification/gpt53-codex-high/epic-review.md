# Epic 03 — Template Merge: Full Implementation Review
## Reviewer: GPT-5.3-Codex (High Reasoning)
## Date: 2026-03-01

> **Session:** `019cac27-e170-7603-89c0-309ba16e2106`
> **Tokens:** 3.1M input (2.97M cached) / 19K output

---

### 1. Executive Summary
Implementation quality is generally strong for parser, merge engine, REST merge endpoint, MCP merge tool, and merge-mode UI behavior. The main blockers are one real data-loss bug in line-edit persistence and two major design/compliance gaps (HTML placeholder replacement robustness, and non-guaranteed usage tracking semantics). Epic completeness is also not full in this repo because CLI scope is deferred externally.

### 2. Critical Issues
- **Issue title:** Line-edit save can silently erase `parameters` metadata (data loss)
- **Location:** `src/ui/templates/prompts.html:1487`, `src/ui/templates/prompts.html:1491`, `convex/model/prompts.ts:468`, `convex/model/prompts.ts:473`
- **Description:** Line edit `PUT /api/prompts/:slug` payload omits `parameters`; model update always patches `parameters: updates.parameters`. Missing key becomes `undefined`, which can clear stored metadata.
- **Impact:** Existing prompt parameter metadata can be lost after any line edit save.
- **Recommendation:** Either include existing `parameters` in line-edit `PUT` payload, or change model patch logic to only set `parameters` when explicitly provided.

### 3. Major Issues
- **Issue title:** Merge-mode placeholder replacement is string-based HTML mutation (context-corruption risk)
- **Location:** `public/js/components/merge-mode.js:105`, `public/js/components/merge-mode.js:106`
- **Description:** Replacing placeholders with `html.replaceAll(...)` can inject input markup into non-text contexts (for example link `href` output), producing malformed HTML/incorrect rendering.
- **Impact:** Broken merge-mode rendering for valid templates containing merge fields inside markdown link destinations or attribute-like contexts.
- **Recommendation:** Follow tech design approach strictly: parse rendered DOM and replace placeholder text nodes only.

- **Issue title:** Usage tracking is best-effort, not guaranteed by successful merge/copy semantics
- **Location:** `src/routes/prompts.ts:265`, `src/routes/prompts.ts:267`, `src/lib/mcp.ts:595`, `src/lib/mcp.ts:597`
- **Description:** Merge success response returns before usage mutation completes; failures are swallowed into logs.
- **Impact:** AC-2.8 / AC-3.9 can be violated in production under mutation failures, causing undercounted usage analytics.
- **Recommendation:** Await tracking mutation (or return explicit partial-success signal) if strict AC semantics are required.

- **Issue title:** CLI ACs are not implemented in this codebase (epic completeness gap)
- **Location:** `docs/project/epic-03-template-merge/epic.md:431`, `docs/project/epic-03-template-merge/tech-design.md:909`
- **Description:** Epic scope includes `liminaldb merge`, but implementation/tests are deferred to another repo.
- **Impact:** Full epic acceptance cannot be verified from this repo alone.
- **Recommendation:** Gate ship on linked CLI release + contract tests against `POST /api/prompts/:slug/merge`.

### 4. Minor Issues
- **Issue title:** Regex logic duplicated in three places (drift risk)
- **Location:** `convex/model/merge.ts:10`, `src/lib/merge.ts:6`, `src/ui/templates/prompts.html:1510`
- **Description:** Strict merge-field regex is replicated across Convex, service, and UI update path.
- **Impact:** Future regex changes can desynchronize server/UI behavior.
- **Recommendation:** Centralize via shared constant where runtime boundaries allow, and add parity tests between layers.

- **Issue title:** Keyboard-nav TC test does not actually test keyboard behavior
- **Location:** `tests/service/ui/merge-mode.test.ts:632`
- **Description:** TC-3.10a only checks DOM order/no tabindex; no simulated `Tab` focus transition assertions.
- **Impact:** Accessibility regressions may pass tests.
- **Recommendation:** Add focus movement assertions using keyboard events.

- **Issue title:** Search-path mergeFields assertion is weak
- **Location:** `tests/service/prompts/listPrompts.test.ts:133`
- **Description:** Search query forwarding is tested, but search response `mergeFields` content is not explicitly asserted.
- **Impact:** Regressions in search DTO mergeFields could slip through service tests.
- **Recommendation:** Add explicit `GET /api/prompts?q=...` mergeFields assertions.

- **Issue title:** UI docs table has stale endpoint path
- **Location:** `src/ui/templates/prompts.html:409`
- **Description:** Developer docs show `GET /api/tags`, but actual route is `/api/prompts/tags`.
- **Impact:** Developer confusion and wrong integration copy/paste.
- **Recommendation:** Update docs snippet in template.

### 5. AC/TC Coverage Analysis
| ID | Description | Impl | Tests | Gap |
|---|---|---|---|---|
| AC-1.1 | Prompt responses include `mergeFields` | Partial | Partial | CLI/web surface end-to-end not fully evidenced in this repo |
| AC-1.2 | First-occurrence order | Yes | Yes | None |
| AC-1.3 | Extraction on all read operations | Partial | Partial | Search-path assertion and CLI/web surface evidence gaps |
| AC-1.4 | Strict parser syntax | Yes | Yes | None |
| AC-2.1 | Replace all occurrences | Yes | Yes | None |
| AC-2.2 | Return ordered `unfilledFields` | Yes | Yes | None |
| AC-2.3 | Unfilled remain as `{{field}}` | Yes | Yes | None |
| AC-2.4 | No-op behavior with no fields | Yes | Yes | None |
| AC-2.5 | Merge doesn't modify stored prompt | Yes | Yes | None |
| AC-2.6 | Ignore extra keys | Yes | Yes | None |
| AC-2.7 | Literal substitution (no recursion) | Yes | Yes | None |
| AC-2.8 | Successful merge increments usage | Partial | Partial | Fire-and-forget semantics weaken guarantee |
| AC-3.1 | Merge mode availability by fields | Yes | Yes | None |
| AC-3.2 | Rendered markdown + inline inputs | Partial | Partial | String-based placeholder replacement risk in edge contexts |
| AC-3.3 | Copy returns merged content | Yes | Yes | None |
| AC-3.4 | Unfilled warning on copy (non-blocking) | Yes | Yes | None |
| AC-3.5 | Hide authoring controls in merge mode | Yes | Yes | None |
| AC-3.6 | Exit restores previous viewer state | Yes | Yes | None |
| AC-3.7 | Dirty-state confirmation | Yes | Yes | None |
| AC-3.8 | Save active line edit before entering merge | Yes | Yes | None |
| AC-3.9 | Copy increments usage per action | Partial | Partial | Depends on best-effort backend tracking |
| AC-3.10 | Keyboard navigation | Yes | Partial | Test does not verify actual tab-focus transitions |
| AC-3.11 | HTML values treated as text | Yes | Yes | None |
| AC-3.12 | Values not persisted across sessions | Yes | Yes | None |
| AC-4.1 | CLI merge command | No (in this repo) | No (in this repo) | Deferred to `liminaldb-cli` |
| AC-4.2 | CLI unfilled warning/stderr behavior | No (in this repo) | No (in this repo) | Deferred to `liminaldb-cli` |
| AC-5.1 | MCP `merge_prompt` tool behavior | Yes | Yes | None |
| AC-5.2 | MCP `get_prompt` includes `mergeFields` | Yes | Yes | None |

TC coverage summary:
- **Fully covered:** TC-1.1c, 1.2a, 1.4a-d, 2.1a-d, 2.2a-c, 2.3a, 2.4a-b, 2.5a, 2.6a, 2.7a-b, 2.8b-c, 3.1a-b, 3.3a-b, 3.4a-b, 3.5a-b, 3.6a-c, 3.7a-e, 3.8a-b, 3.11a, 3.12a, 5.1a-c, 5.2a.
- **Partially covered:** TC-1.1a, 1.1b, 1.3a, 1.3b, 2.8a, 3.2a-d, 3.9a-c, 3.10a.
- **Not covered in this repo:** TC-4.1a, 4.1b, 4.2a, 4.2b.

### 6. Interface Compliance
- **REST endpoints:** `GET /api/prompts`, `GET /api/prompts/:slug`, and `POST /api/prompts/:slug/merge` are implemented with expected payload shapes and error model.
- **Convex functions/DTOs:** `mergeFields` is present in `getPromptBySlug`, `listPrompts`, `listPromptsRanked`, and `searchPrompts` return schemas.
- **MCP tools:** `merge_prompt` is implemented and `get_prompt` returns `mergeFields`.
- **UI components:** Merge toggle, merge mode, dirty-state confirmation, save-before-switch, and copy flow are implemented.
- **Deviation:** CLI interface required by epic is not in this repo; cannot claim full interface completion here.
- **Deviation:** Merge-mode replacement strategy differs from tech design's text-node replacement approach.

### 7. Architecture Alignment
Overall architecture follows the design: parser in Convex model layer, merge engine in service layer, route/MCP orchestration, and dedicated UI merge-mode component.
Misalignment points:
- UI merge placeholder injection uses global HTML string replacement instead of safer DOM text-node replacement.
- Line-edit persistence path introduces data coupling bug with model patch semantics (`parameters` clearing).

### 8. Test Quality Assessment
- **Coverage completeness:** Good on parser/merge utility/API endpoint and broad UI scenarios; weaker on cross-surface CLI and some edge rendering contexts.
- **Test isolation:** Strong unit/service isolation with mocks; integration test exists for API merge happy/error paths.
- **Mock fidelity:** Adequate for handler wiring; limited for validating end-to-end usage tracking guarantees and real markdown/DOM edge behavior.
- **Edge case coverage:** Good for parser validity, duplicate fields, literal merge syntax, newlines, dirty-state flows; missing link/attribute placeholder replacement regression test.
- **Integration adequacy:** API integration exists; no equivalent integration for MCP merge usage tracking guarantees or UI merge interactions against live backend.

### 9. Summary Table

| Category | Count |
|----------|-------|
| Critical | 1 |
| Major | 3 |
| Minor | 4 |
| ACs Covered | 26/28 |
| TCs Covered | 56/63 |
