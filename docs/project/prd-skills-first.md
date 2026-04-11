# PRD: Skills-First LiminalDB

This document defines the product requirements for the first skills-focused release of LiminalDB. It is structured as a set of collapsed epics — enough detail to plan and sequence the work, with line-level acceptance criteria and test conditions deferred to the full epic phase.

---

## Product Thesis

LiminalDB started as a personal prompt library with MCP and web access. The prompt capability works: CRUD, search with ranking, import/export, template merge, drafts, and a polished web UI with shell/portlet architecture. That product is intact and will remain available.

The market has shifted. The most active area of tooling growth in the AI agent ecosystem is now skills — portable instruction packages that move across agent surfaces. Prompt libraries still have value, but they solve a narrower problem. A user who discovers a complex, reusable workflow in a chat session today has no good way to preserve it as a structured, portable skill without leaving their current context, creating files manually, and organizing them by hand. Most of that work gets lost.

LiminalDB's next release centers on skills. The product thesis is:

**LiminalDB is the place where reusable workflows discovered in chat become portable skills before they disappear.**

The highest-value workflow is chat-native capture: a user is working in a model surface, realizes they just performed a reusable process, and says "turn this into a skill and save it." The skill draft is saved immediately. The user retrieves it later from any connected surface. Over time, simple drafts can be refined into richer multi-file skills.

This is different from what skills.sh does. skills.sh is a public registry — discovery, distribution, and install. LiminalDB's wedge is personal: capture, organize, retrieve, and manage your own skills across surfaces. The system is also different from a skill IDE or hosted sandbox. LiminalDB does not execute skills, run evals, or provide a code editor. It stores skill artifacts, makes them findable, and keeps them portable.

---

## Target User

**Primary User:** AI power user who works across multiple chat and coding surfaces daily.

**Context:** This user switches between Claude Code, ChatGPT, Cursor, VS Code, shells, and agent harnesses while solving real tasks. They accumulate workflow knowledge — useful processes, repeatable patterns, orchestration sequences — as a natural byproduct of working with models. They are comfortable telling a model to save, retrieve, or restructure information on their behalf.

**Mental Model:** "When I discover something reusable while working, I want to save it as a skill and get it back later from whatever surface I'm in."

**Key Constraint:** The user prioritizes staying in flow. They will not leave a chat session to visit a web app to manually enter a skill. If capture requires switching context, it won't happen. The capture moment must be served where the user already is.

---

## Market Context

Two signals inform the scope of this release.

**Skills are where the ecosystem is converging.** OpenAI's Apps SDK, Anthropic's official skills guide, the Agent Skills specification (agentskills.io), and active public registries like skills.sh all point to skills as the primary portable unit for agent customization. Prompt libraries are useful but less differentiated now than they were a year ago.

**Most popular skills are markdown-first.** A survey of the top 600 skills on skills.sh by install count found that approximately 9% include a `scripts/` directory. The remaining 91% are instruction-only or reference-only packages — structured markdown with metadata, no executable code. Anthropic's own skills repo is more script-heavy (~47%), but the broader installed market is overwhelmingly non-scripted. This means a skills product that does not solve code execution up front is still addressing the majority use case.

These two signals together define the opportunity: there is strong market pull toward skills, and the most popular skills are simple enough that a storage-and-retrieval product can serve them without hosted execution.

---

## Product-Market-Fit Hypothesis

The hypothesis this release tests:

**Power users who work across AI surfaces will find meaningful value in a system that lets them capture skill drafts in-flow, retrieve them from any connected surface, and manage a personal skill library — even without hosted execution, eval workspaces, or a public marketplace.**

If this hypothesis holds, the product has a foundation for later additions: import/sync from external repos, trust/scanning pipelines, eval workspaces, and eventually execution environments. If it does not hold, those additions won't save it.

The first meaningful signal is whether the capture-and-retrieve loop gets used. If users save skills and retrieve them across surfaces, the product has pull. If they save skills and never come back, or if the friction of saving is too high, the product does not.

---

## Scope Boundary

### What This Release Is

A personal skill library with chat-native capture, cross-surface retrieval, and web-based management. Skills are stored as structured artifacts. Prompts continue to work as a simpler artifact type within the same system.

### What This Release Is Not

- A hosted runtime for skill scripts or eval execution
- A browser-based code editor or IDE
- A public skills marketplace or registry
- A replacement for skills.sh's discovery and distribution functions
- An embedded MCP UI product
- A team or organization collaboration tool

LiminalDB can store skills that contain any combination of files — scripts, references, examples, configs, assets, or any other resources the skill author includes. It does not execute, validate, or test stored code in this release. Execution remains the responsibility of the user's local tool surface.

---

## Existing Product Foundation

This release extends a working product. The current LiminalDB codebase provides:

- **Prompt CRUD** with slug-based addressing, batch insert, validation, and a 1000-per-user limit
- **Search and ranking** with full-text search, tag filtering, and a scoring formula based on usage frequency, recency, pin/favorite flags
- **Template merge** for `{{fieldName}}` substitution in prompt content — available via MCP, REST, and web UI
- **Import/export** in YAML format with duplicate detection on import preview
- **Drafts** with Redis-backed auto-save, 24-hour TTL, and browser recovery
- **Authentication** via WorkOS AuthKit with dual channels: HttpOnly cookies for the web UI and Bearer tokens for MCP/API
- **MCP integration** with ~12 tools, SSE transport, and RFC 9728 OAuth discovery
- **Web UI** with shell/portlet architecture, semantic prompt rendering, line editing, 6 themes, and integration setup guides
- **CLI** (separate repo, `liminaldb-cli`) wrapping the REST API with OAuth device flow and API key auth
- **CI/CD** with PR quality gates, per-PR preview environments (Fly.io + Convex preview branches), staging and production deploy workflows
- **Test suite** with 544 tests across service, Convex, UI component, and integration categories

The skills release builds on this stack. It does not replace the prompt system. Prompts remain a first-class artifact type — a simpler, lighter-weight alternative to skills for users who just need to save and retrieve text content.

---

## Cross-Cutting Decisions

### Tags: Seed-and-Suggest

The current tag system has 19 fixed global tags across three dimensions (purpose, domain, task). These are shared and immutable. Skills need flexible, user-owned tags that can grow organically.

The transition: tags become user-scoped records. Every new user starts with a seeded starter set (a curated expansion of the current 19). Existing users get user-owned copies of the current global tags at migration time.

New tags are created implicitly when a user or model saves a skill or prompt with a tag name that does not yet exist in the user's tag set. On save, the system suggests existing tags that are close matches (fuzzy or prefix) to reduce near-duplicate tag sprawl. If the user or model overrides the suggestion, the new tag is created.

There is no dedicated tag management UI in the first release. Tags emerge from usage. Cleanup and consolidation can be addressed later once usage patterns are visible.

This applies to both skills and prompts. The same tag set serves both artifact types.

### Prompts: Continue As-Is

The prompt system remains unchanged. Users can save, retrieve, edit, search, import, export, and merge prompts exactly as before. The web UI, MCP tools, CLI commands, and REST endpoints for prompts are not being removed or modified as part of the skills release.

Prompts and skills coexist in the same user library. They share the same tag system. They appear in the same web management interface. A prompt is a simpler artifact (text content with metadata). A skill is a richer artifact (structured multi-file package with an entrypoint).

No migration or unification is required. If usage data later shows that prompts are unused, they can be deprecated. Until then, removing working functionality before there is user signal would be premature.

### Template Merge: Unchanged for Prompts, Not Added to Skills

Template merge (`{{fieldName}}` substitution) stays in the prompt surface. It is available via the `merge_prompt` MCP tool, the `POST /api/prompts/:slug/merge` REST endpoint, and the merge mode in the web UI.

Merge is not added to skills. Skills are structured artifact packages, not text templates. "Merging" a skill does not have a clear meaning. A SKILL.md file might contain template variables, but the skill as a whole is something you install or invoke, not something you fill in fields and get output from. Adding merge to skills would require defining what merge means for a multi-file artifact, which adds conceptual overhead for unclear benefit.

### CLI: Feature Requirements, Not Implementation Scope

The CLI lives in a separate repository (`apps/liminaldb-cli`). It already supports OAuth device flow, API key auth, and prompt management commands wrapping the REST API.

This PRD defines what skill operations the CLI must support as part of each epic. It does not prescribe which repo implements them. The CLI may lag the MCP and web surfaces by an epic or two, and that is acceptable. The CLI's job is to provide a universal fallback for surfaces where MCP is not available but shell access is.

---

## Epic 1: Skill Data Model & Storage Foundation

### Overview

This epic extends the Convex data layer from prompt-only storage to skills-capable storage. It introduces the skill entity model, evolves the tag system to user-owned tags, and establishes the multi-file artifact structure that all downstream epics depend on.

Nothing in this epic is user-facing on its own. It provides the schema, validation, and data operations that Epic 2 (Capture), Epic 3 (Retrieval), and Epic 4 (Management) build on.

### In Scope

- Skill entity with identity, metadata, entrypoint, and optional resource files
- User-scoped tags replacing fixed global tags
- Tag seeding for new and existing users
- Tag suggestion on save (fuzzy/prefix match)
- Multi-file storage model supporting SKILL.md plus resource files at arbitrary relative paths
- Simple-to-advanced skill progression without schema changes
- Coexistence with existing prompt entities

### Out of Scope

- Skill execution or validation
- Eval storage or orchestration
- Any user-facing UI or API surface (those are Epic 2-4)

### Core Flows & Requirements

#### 1. Skill Entity Model

A skill is a structured artifact set owned by a single user. The minimum skill consists of metadata plus a SKILL.md entrypoint. An advanced skill additionally contains resource files at arbitrary relative paths — commonly `scripts/`, `references/`, `examples/`, `config/`, or `assets/`, but not limited to any predefined set of directories. The storage model accepts whatever directory structure the skill author uses.

Skill identity fields:
- slug (unique per user, same format as prompt slugs)
- name
- description
- tags (user-scoped, shared with prompts)
- created/updated timestamps
- usage metadata (usage count, last used, pinned, favorited)

Skill content:
- entrypoint content (the SKILL.md body)
- resource files, each with a path (e.g., `scripts/run_eval.py`), content type indicator, and content body

The data model stores file content directly rather than referencing external filesystems. Exported skills reconstruct the directory structure from stored paths.

#### 2. Tag System Evolution

Tags transition from 19 fixed global records to user-scoped records that serve both prompts and skills.

Migration path:
1. Create a user-owned tag record for each of the current 19 global tags, for each existing user
2. Update prompt tag references to point to user-owned tag records instead of global records
3. New users receive the same starter set on account creation

Tag creation:
- When a save operation includes a tag name that does not exist in the user's tag set, the system checks for close matches among existing tags
- If close matches exist, the system returns suggestions but does not block the save
- If no close matches exist or the user/model overrides suggestions, a new tag is created
- Tag names are normalized (lowercased, trimmed) to reduce trivial duplicates

Tag deletion and cleanup are not in scope for the first release. Tags accumulate. Orphaned tags (zero attached skills or prompts) can be addressed in a later cleanup pass.

#### 3. Simple-to-Advanced Progression

The data model supports two authoring levels without separate entity types:

- **Simple skill:** Metadata + SKILL.md content. No resource files. This is the default capture artifact.
- **Advanced skill:** Metadata + SKILL.md content + one or more resource files. Created by adding files to an existing simple skill, or by saving a complete multi-file package at capture time.

Both levels use the same entity and the same storage model. The difference is whether resource files are present. No schema change or migration is needed to promote a simple skill to an advanced one.

### High-Level Acceptance Criteria

- **AC-1.1:** A skill can be created with metadata and a SKILL.md entrypoint, with no resource files required
- **AC-1.2:** A skill can store resource files at arbitrary relative paths — the system does not constrain which directories are allowed
- **AC-1.3:** Resource files preserve their logical paths so export can reconstruct directory structure
- **AC-1.4:** Each user starts with a seeded tag set covering the current global taxonomy
- **AC-1.5:** Saving a skill or prompt with a new tag name creates a user-owned tag if no close match is accepted
- **AC-1.6:** Tag suggestions surface existing close-match tags during save without blocking the operation
- **AC-1.7:** Skills and prompts share the same tag namespace per user
- **AC-1.8:** Existing prompt data and operations are unaffected by the schema changes
- **AC-1.9:** Skill slugs are unique per user and follow the same format constraints as prompt slugs
- **AC-1.10:** A simple skill can have resource files added to it later without data migration

### Key Considerations

- The current prompt entity has a `searchText` field built by concatenating slug, name, description, and content. Skills will need an equivalent search field, likely built from the same core fields plus the SKILL.md entrypoint.
- The current ranking model (usage + recency + favorite + pinned) applies naturally to skills. Whether skills and prompts share a single ranked list or are ranked within their own type is a design decision for the epic phase.
- Resource file content storage in Convex has size implications. Large script files or binary assets may need a size limit or deferred handling. The initial limit should be documented in the epic.
- The tag migration must be idempotent and safe to re-run. Existing prompt functionality must remain fully operational throughout and after migration.

---

## Epic 2: Skill Capture

### Overview

This epic delivers the chat-native and CLI-native skill save flows. After this epic ships, a user can save a skill draft from a model surface (via MCP) or a shell surface (via CLI) without switching to the web app.

Capture is the center of the product thesis. If this flow is high-friction or unreliable, the downstream retrieval and management features have nothing to work with. The default capture path should produce a usable simple skill with minimal input from the user.

### In Scope

- MCP tools for saving skill drafts (simple and advanced)
- REST API endpoints for skill creation (used by CLI and web)
- Simple capture flow: model structures a SKILL.md draft, saves with title + description + tags
- Advanced capture flow: model structures a multi-file skill with SKILL.md + resource files
- Tag suggestion responses during capture
- CLI save command extension (requirements only — implementation in CLI repo)

### Out of Scope

- Web-based skill creation (that is Epic 4)
- Skill editing or refinement after initial capture (that is Epic 4)
- Import from external sources (that is fast-follow)
- Skill execution or validation

### Core Flows & Requirements

#### 1. Simple Skill Draft from Chat

The most common capture flow. The user is in a chat or harness, realizes a recent process is reusable, and asks the model to save it.

1. User tells the model to capture the current process as a skill
2. Model assembles a SKILL.md draft from the conversation context — title, description, and structured instructions
3. Model calls the MCP `save_skill` tool (or equivalent) with the draft content and suggested tags
4. System validates the input, checks for tag suggestions, and stores the skill
5. System returns confirmation with the skill slug and any tag suggestions that were auto-resolved
6. User continues their original work

The model does the structuring work. The system does the storage work. The user's only action is the initial request.

Default behavior:
- If no slug is provided, the system generates one from the skill name
- If no tags are provided, the skill is saved with no tags (tags can be added later)
- If provided tags include close matches to existing user tags, the system resolves them and reports what it did

#### 2. Advanced Skill Capture

Less common but supported. The user or model saves a multi-file skill in a single operation.

1. User asks the model to create a detailed skill from the current context
2. Model structures a SKILL.md entrypoint plus one or more resource files (scripts, references, examples)
3. Model calls the save tool with the full file set
4. System stores the entrypoint and all resource files as a single skill
5. System returns confirmation

This flow is identical to simple capture except that resource files are included. The same MCP tool handles both — the presence or absence of resource files determines whether the result is a simple or advanced skill.

#### 3. CLI Capture

For surfaces where MCP is not available but the user has shell access.

1. User asks the model to save a skill, or manually runs the CLI
2. Model runs `liminaldb skill save` (or equivalent) with content piped or passed as arguments
3. CLI calls the REST API to create the skill
4. CLI returns confirmation with the skill slug

The CLI capture flow mirrors the MCP flow but uses the REST API as transport. The CLI may also support saving from a local file or directory:

1. User has a skill directory on disk (e.g., from a prior session)
2. User runs `liminaldb skill save --from ./my-skill/`
3. CLI reads the directory, identifies SKILL.md and any resource files, and saves them as a single skill

### High-Level Acceptance Criteria

- **AC-2.1:** A skill draft can be saved via MCP with only a name and SKILL.md content — no other fields required
- **AC-2.2:** The MCP save tool accepts optional resource files in a single call
- **AC-2.3:** Slug is auto-generated from name if not provided
- **AC-2.4:** Tag suggestions are returned in the save response when close matches exist
- **AC-2.5:** The REST API supports the same skill creation operations used by MCP, CLI, and web
- **AC-2.6:** A skill saved via MCP is immediately retrievable via CLI, web, or MCP
- **AC-2.7:** Saving a skill with a duplicate slug for the same user returns a clear conflict error
- **AC-2.8:** The capture flow completes in a single tool call — no multi-step wizard or confirmation needed
- **AC-2.9:** CLI can save a skill from piped content or from a local directory

### Key Considerations

- The MCP tool schema needs careful design. The prompt `save_prompts` tool accepts a batch of prompts. The skill save tool should accept a single skill at a time (skills are structurally more complex than prompts — batching adds payload complexity without a clear use case for the first release).
- SKILL.md content may be large. The current prompt content limit is 100,000 characters. Skills may need a comparable or larger limit for the entrypoint, plus separate limits for individual resource files and total resource file count.
- The save tool description visible to models in MCP tool listings needs to be clear enough that models understand when to use it and what arguments to pass. This is part of the product surface, not just a technical detail.
- Auto-slug generation should handle collisions gracefully (e.g., append a numeric suffix).

---

## Epic 3: Skill Retrieval & Search

### Overview

This epic delivers skill retrieval across MCP, CLI, and web. After this epic ships, a user can ask for a skill by topic, task, or intent and get back a useful result regardless of which surface they are in.

Retrieval is the other half of the capture-and-retrieve loop. If capture is easy but retrieval is unreliable or slow, the stored skills have no practical value. The retrieval system must handle natural-language queries, return relevant results even when the query is vague, and work the same way across all three surfaces.

### In Scope

- MCP tools for skill retrieval and search
- REST API endpoints for skill search, get, and list
- Keyword + tag search with ranking
- Single best match vs. shortlist behavior
- Skill listing with ranked ordering
- CLI retrieval commands (requirements only)
- Usage tracking on retrieval (for ranking feedback)

### Out of Scope

- Semantic/vector search (desirable for later, but not required for the first release — keyword + tag search with the existing ranking model provides a solid baseline)
- Cross-user or public skill search
- Skill recommendation or suggestion without explicit query

### Core Flows & Requirements

#### 1. Find Skill by Intent

The primary retrieval flow. The user asks for a skill by describing what they need, not necessarily by the exact skill name.

1. User asks for a skill in a model surface or shell ("find my skill for deploying to staging" or "get my code review skill")
2. Model calls the MCP `search_skills` tool (or CLI equivalent) with a query string and optional tag filter
3. System runs keyword search against skill names, descriptions, tags, and SKILL.md content
4. System applies ranking (usage, recency, pin/favorite signals) to order results
5. System returns results — a single best match if confidence is high, or a shortlist if multiple results are close
6. Model presents the result to the user
7. Usage is tracked for the retrieved skill

If the user knows the exact slug:
1. User or model calls `get_skill` with the slug
2. System returns the full skill (metadata, SKILL.md content, resource file listing)
3. Usage is tracked

#### 2. List and Browse Skills

Used when the user wants to see what they have rather than search for something specific.

1. User requests a skill list (via MCP, CLI, or web)
2. System returns skills ranked by the existing ranking formula (pinned first, then by usage/recency/favorite score)
3. Optional tag filter narrows the list
4. Optional limit controls result count

The same ranking model used for prompts applies to skills. Pinned skills appear first. Within each tier, skills are sorted by composite score. Never-used skills sort below used skills in list mode (matching current prompt behavior).

#### 3. Unified Search Across Types

When a user searches, they may want prompts, skills, or both. The system should support:
- Search skills only
- Search prompts only
- Search both (default behavior on the web, optional parameter on MCP/CLI)

Results from both types use the same ranking formula and are interleaved by score, with type indicators so the caller can distinguish them.

### High-Level Acceptance Criteria

- **AC-3.1:** Skills are searchable by keyword across name, description, tags, and SKILL.md content
- **AC-3.2:** Search results are ranked by the same scoring formula used for prompts (usage, recency, pin, favorite)
- **AC-3.3:** Search returns a shortlist when multiple results are close, rather than always returning just the top result
- **AC-3.4:** A single skill can be retrieved by slug with full content (metadata, entrypoint, resource file listing)
- **AC-3.5:** Skill retrieval tracks usage for ranking feedback
- **AC-3.6:** Tag filtering can be applied to skill search and list operations
- **AC-3.7:** List operations return skills in ranked order with pinned skills first
- **AC-3.8:** MCP, CLI, and REST all use the same retrieval logic and return consistent results
- **AC-3.9:** Search can return results across both skills and prompts with type indicators
- **AC-3.10:** Newly created skills are discoverable in search immediately (no manual indexing step)

### Key Considerations

- The current search infrastructure uses a Convex full-text search index on a denormalized `searchText` field. Skills will need an equivalent field. Whether skills and prompts share a search index or have separate indexes is a design decision for the epic.
- The `searchRerankLimit` (currently 200) may need adjustment if the combined skill + prompt set is large. Over-fetching for reranking has a performance cost.
- Semantic/vector search is explicitly out of scope for this release but should not be architecturally blocked. The data model and retrieval interface should allow adding a vector search signal later without restructuring the API contract.
- The shortlist vs. single-result behavior needs a clear heuristic. One approach: if the top result's score is significantly above the second result, return it alone; otherwise, return the top N. The exact threshold is a design/tuning decision.

---

## Epic 4: Skill Library Management (Web)

### Overview

This epic extends the web UI from a prompt-only library to a combined prompt and skill library. After this epic ships, users can browse, search, view, edit, and export skills in the web app.

The web app is the management surface, not the primary capture surface. Users arrive here after capture has already happened — to review what they've saved, refine drafts, clean up metadata, organize their library, or export skills for use outside LiminalDB.

### In Scope

- Skills browsable and searchable alongside prompts in the web library
- Skill detail view showing metadata, SKILL.md content, and resource file listing
- Skill metadata editing (name, description, tags)
- SKILL.md content editing
- Resource file viewing and basic management (add, view, remove)
- Skill export as a downloadable directory structure (zip or equivalent)
- Navigation and UI updates to accommodate skills alongside prompts
- Onboarding and help content updated for skills

### Out of Scope

- Code editor for scripts or resource files (plain text editing is fine; syntax highlighting and IDE features are not in scope)
- Skill execution, testing, or eval from the web UI
- Bulk skill operations beyond what the current import/export model supports
- Skill creation from scratch in the web UI (capture via MCP/CLI is the intended primary creation path; web creation is a lower-priority convenience)

### Core Flows & Requirements

#### 1. Browse and Search the Combined Library

The sidebar and main content area currently show prompts. They expand to show both prompts and skills.

1. User opens the web app
2. Sidebar shows a combined list of skills and prompts, ranked by the standard formula
3. User can filter by type (skills only, prompts only, both)
4. User can search by keyword and filter by tags
5. Search results span both types, with visual indicators distinguishing skills from prompts

The existing shell/portlet architecture supports this extension. The sidebar list, search field, and tag filter in the shell frame apply to both entity types. The portlet content area renders the selected item based on its type.

#### 2. View Skill Details

When a user selects a skill in the sidebar:

1. Content area shows the skill metadata: name, description, tags, usage stats, timestamps
2. Below metadata, the SKILL.md content is rendered (using the existing semantic parser or a comparable renderer)
3. If the skill has resource files, a file listing shows the file tree with paths and sizes
4. User can expand a resource file to view its content (plain text rendering)

#### 3. Edit Skill Metadata and Content

After capture, users refine skills in the web app.

1. User opens a skill and enters edit mode
2. User can edit name, description, and tags
3. User can edit the SKILL.md content in a text area
4. User can add or remove resource files
5. Drafts auto-save to Redis (same pattern as prompt drafts)
6. User saves or discards changes

Tag editing in the skill editor uses the same seed-and-suggest behavior as capture: existing tags are suggested, new tags can be created.

#### 4. Export and Package

Users export skills for use outside LiminalDB — installing them locally, sharing via Git, or packaging for distribution.

1. User selects a skill to export
2. System generates a downloadable package that reconstructs the skill's directory structure:
   - `SKILL.md` at the root
   - resource files in their original directory structure
   - Metadata in a frontmatter block or companion file
3. User downloads the package

The export format should produce a standard skill directory that is immediately usable by agent surfaces expecting that structure (e.g., a Claude Code skill directory, a `.codex/skills/` entry).

#### 5. Onboarding and Help Content

The current landing page and integration guides are prompt-focused. They need updating to explain skills.

1. Landing page introduces both prompts and skills as artifact types
2. Getting Started guide includes a "save your first skill" flow alongside the existing prompt flow
3. Integration guides (Claude.ai, Claude Code, Cursor, VS Code) explain how to use MCP tools for both prompts and skills
4. Help section covers skill-specific operations and FAQ

### High-Level Acceptance Criteria

- **AC-4.1:** Skills appear in the sidebar alongside prompts, with visual distinction between types
- **AC-4.2:** The sidebar supports filtering by type (skills only, prompts only, both)
- **AC-4.3:** Selecting a skill shows its metadata, SKILL.md content rendered, and resource file listing
- **AC-4.4:** Resource file content is viewable in plain text within the skill detail view
- **AC-4.5:** Skill metadata (name, description, tags) is editable in the web app
- **AC-4.6:** SKILL.md content is editable in a text area
- **AC-4.7:** Resource files can be added and removed from a skill
- **AC-4.8:** Skill edits auto-save as drafts with the same TTL and recovery behavior as prompt drafts
- **AC-4.9:** Exported skills reconstruct a valid directory structure usable by standard agent surfaces
- **AC-4.10:** Onboarding content explains skills and the capture-from-chat workflow
- **AC-4.11:** Search in the web UI returns both skills and prompts with type indicators

### Key Considerations

- The shell/portlet postMessage protocol currently passes prompt-specific state. Extending it to skills requires updating the message schema (e.g., `portlet:skill-count`, type-aware `history:push` paths like `/skills/:slug`).
- The existing prompt viewer uses a semantic parser (`SemanticParser` in `prompt-viewer.js`) that highlights XML tags, variables, and code blocks. SKILL.md content may benefit from the same rendering, but the parser was built for prompt syntax. Whether to reuse, extend, or replace it is a design decision.
- File tree rendering for resource files is a net-new UI component. It does not need to be fancy — a flat list of paths with expand/collapse for content is sufficient.
- The export format needs a specification. A zip file containing the directory structure is the simplest approach. Whether frontmatter metadata is embedded in SKILL.md (as most skills do in the wild) or provided as a separate file is a design choice that affects import compatibility.
- Skill creation from the web UI is lower priority than MCP/CLI capture but may be a convenient "new skill" button flow. If included, it should mirror the simplicity of the current prompt creation form — not a complex multi-step wizard.

---

## Fast-Follow Capabilities

These capabilities are important to the long-term product but are not required to validate the core capture-retrieve-manage loop. They are described at lower detail so later epics can expand them.

### Import & Sync

**Import:** Users can bring existing skills into LiminalDB from external sources — a GitHub repo URL, a local directory path (via CLI), or a packaged skill archive.

Key requirements:
- Import preserves the original multi-file directory structure
- Import detects and reports duplicate slugs before writing (same pattern as prompt import preview)
- Import handles SKILL.md frontmatter metadata (name, description, tags) if present
- CLI supports `liminaldb skill import --from <source>` for local directories and archives

**Sync:** Users can track the upstream source of an imported skill and pull updates.

Key requirements:
- The system stores the source URL or path for imported skills
- Users can check for updates from the upstream source
- Update pulls show a diff or change summary before applying
- Sync is manual (user-triggered), not automatic

### Scan & Trust Signals

Users want confidence that skills they import or receive from others are safe to use. The scan pipeline provides trust metadata without promising full security validation.

Key requirements:
- Static scan: structural checks, file/path heuristics, regex patterns for known injection markers
- LLM review: an LLM assesses the skill content for prompt injection, exfiltration attempts, or misdirection
- Honeypot/canary scan: the skill is presented to a model along with fake "tempting" tools (file writes to sensitive paths, web calls to exfiltration endpoints); if the model calls any of those tools while processing the skill, the skill is flagged as suspect
- Scan results are stored per skill and surfaced in the management UI as trust labels (clean, suspicious, manual review needed)
- Scan runs on import and can be re-triggered manually

The scan pipeline is a strong differentiator from pure registries. Its scope and depth can grow over time.

---

## Non-Functional Requirements

### Performance

- Skill save operations complete in under 2 seconds for simple skills and under 5 seconds for skills with up to 20 resource files
- Search results return within 1 second for libraries of up to 1000 skills
- Export packaging completes within 5 seconds for skills with up to 50 resource files

### Security

- All skill operations require authentication
- All skill data is scoped to the authenticated user
- Script-bearing skills are stored artifacts, not executable code — the system never evaluates or runs stored script content
- Exported skill packages do not include authentication tokens, API keys, or session data

### Reliability

- Skill capture must not fail silently — errors during save are reported to the caller with enough detail to retry or adjust
- Draft auto-save for web editing uses the same reliability model as prompt drafts (Redis with TTL, recovery on page reload)
- Schema migrations (tag evolution, new entities) are idempotent and backward-compatible with existing prompt data

### Operational

- The skills release does not require hosted inference or external API calls for core operations (save, retrieve, search, manage, export)
- MCP, CLI, and web use the same auth model — no separate identity systems
- The existing CI/CD pipeline (PR checks, preview environments, staging and production deploys) applies to skills code without requiring new infrastructure

---

## Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Most early users get the most value from markdown-first skills | Working | Supported by skills.sh sample (~91% non-scripted in top 600) |
| A2 | The default capture artifact is a simple SKILL.md draft | Working | Advanced multi-file capture is supported but not the default path |
| A3 | Users will accept MCP where supported and CLI where MCP is unavailable | Working | Cross-surface access is the core product requirement |
| A4 | Script-bearing skills need storage even when execution is deferred | Working | Storage does not imply runtime support |
| A5 | Prompts remain useful and should coexist with skills | Working | No migration or removal planned |
| A6 | User-owned tags with seeding and suggestion reduce sprawl enough for the first release without a tag management UI | Working | Revisit if tag sprawl becomes a real problem in beta |
| A7 | The existing CLI repo can be extended for skills without merging into the main codebase | Working | CLI is a REST API wrapper; new endpoints enable new commands |
| A8 | Keyword + tag search with the existing ranking model provides adequate retrieval quality for the first release | Working | Semantic/vector search is a later enhancement |
| A9 | The existing Convex data layer can support multi-file skill storage within its size and document limits | Needs validation | Large skills with many resource files may hit Convex document size constraints |

---

## Recommended Epic Sequencing

```
Epic 1: Skill Data Model & Storage Foundation
    │
    ├──→ Epic 2: Skill Capture (MCP + API + CLI requirements)
    │        │
    │        └──→ Epic 3: Skill Retrieval & Search
    │                 │
    │                 └──→ Epic 4: Skill Library Management (Web)
    │
    └──→ [Tag migration runs independently, can start with Epic 1]

Fast-Follow (after core epics validated):
    Epic 5: Import & Sync
    Epic 6: Scan & Trust Signals
```

**Sequencing rationale:**
- Epic 1 is pure foundation. Everything depends on it.
- Epic 2 (Capture) must come before Epic 3 (Retrieval) — you need skills in the system before retrieval has something to find.
- Epic 3 before Epic 4 because retrieval via MCP/CLI is higher-value than web management for the target user. The web UI can be browsed with basic listing even before full search is wired up.
- Epic 4 can begin in parallel with Epic 3 for UI scaffolding, but full functionality depends on retrieval being available.
- CLI commands within each epic can lag slightly — the REST API endpoints they depend on ship with the epic, and CLI implementation follows.
- Fast-follow epics are independent of each other and can be sequenced based on user demand after the core loop is validated.

---

## Validation Checklist

- [ ] PRD stays focused on the first skills release
- [ ] Skills are the center of the narrative, with prompts as supporting context
- [ ] Core value loop is capture → retrieve → manage
- [ ] Each collapsed epic has clear scope, flows, and high-level ACs
- [ ] ACs are testable and specific (no "appropriate" or "properly")
- [ ] Import/sync/scan are present but clearly fast-follow
- [ ] Script-bearing skills are supported as stored artifacts, not as hosted runtime features
- [ ] MCP, CLI, and web are represented across the epic set
- [ ] Tag evolution is addressed as part of the data model foundation
- [ ] Existing prompt functionality is explicitly preserved
- [ ] Template merge is left in prompts and not added to skills
- [ ] The document does not drift into full epic-level TC detail or tech design
- [ ] Cross-cutting decisions are documented and rationale is visible
- [ ] Market context and PMF hypothesis give a reader enough background to understand why this scope
