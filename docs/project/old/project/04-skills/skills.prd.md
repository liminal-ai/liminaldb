### *This is a PRD elaborated to feature-level detail. It will be sharded into separate feature specs before implementation.*

---

# PRD: Skills Management

## Profile

**Persona:** AI power user who builds specialized workflows across multiple chat surfaces (Claude Code, Cursor, ChatGPT, VS Code).

**Current pain:** Complex tasks require procedural knowledge that no model fully possesses. Users write detailed prompts with instructions, examples, and references - but these get lost in chat histories. When they find a good workflow, they can't package it for reuse or share it across surfaces. Platforms without native skills support have no way to access skill-like capabilities.

**What they can do after this feature:**
- Create skills with SKILL.md entry points and bundled resources (scripts, references, assets)
- Edit skills with full file management in web UI
- Import skills from `.skill` packages (zip format)
- Export skills as distributable `.skill` packages
- Use skills from any MCP-enabled chat surface via progressive disclosure
- Create skills conversationally through MCP tools (AI-assisted skill creation)
- Search, organize, and rank skills like prompts (tags, pin, favorite, usage tracking)
- Access skills across all their chat surfaces with consistent experience

---

## Scope

### In Scope

**Core skill lifecycle:**
- Create, read, update, delete skills
- File management within skills (add, edit, remove bundled resources)
- Validation against SKILL.md format (frontmatter required fields)

**Package management:**
- Import `.skill` packages (zip with directory structure)
- Export skills as `.skill` packages
- Pre-build zip at save time for instant download

**MCP runtime (skills for surfaces without native support):**
- List/search skills (metadata for triggering)
- Load skill (returns SKILL.md body)
- Get skill resource (returns individual file by path)
- Get skill bundle (returns all files)
- Track skill usage

**MCP skill creation (AI-assisted):**
- Create skill via MCP tools
- Add/update files via MCP tools
- Validate and finalize skill via MCP

**Organization (shared patterns with prompts):**
- Tags (same system as prompts)
- Pin and favorite skills
- Usage tracking and ranking
- Full-text search on name + description

**Web UI:**
- Skills list view (separate from prompts, but similar patterns)
- Skill viewer (SKILL.md + file tree)
- Skill editor (edit SKILL.md, manage files)
- Import/export controls

### Out of Scope

- Skill versioning (future feature - track changes over time)
- Skill sharing/publishing (future - public skill library)
- Skill forking (future - copy and modify others' skills)
- Binary file support in v1 (images, fonts - text files only initially)
- Real-time collaboration on skills
- Skill marketplace/discovery
- Skill execution/sandboxing (LiminalDB provides context, not compute)
- Nested skills (skills referencing other skills)

---

## Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Skills under 50KB uncompressed (must fit in context) | Unvalidated | Review Anthropic skill examples |
| A2 | Text files only for v1 is acceptable | Unvalidated | Check user expectations |
| A3 | Same tags can apply to both prompts and skills | Unvalidated | Confirm UX intent |
| A4 | Users want separate views for prompts vs skills | Unvalidated | Could be unified list with type filter |
| A5 | SKILL.md frontmatter parsing is reliable | Unvalidated | Test with Anthropic examples |

---

## Flow Overview

Skills management has two primary user journeys: **authoring** (create/edit skills) and **using** (run skills via MCP).

**Authoring Journey:**
User creates a skill by writing SKILL.md with frontmatter (name, description) and body (instructions). They can add bundled resources - scripts for automation, references for documentation, assets for templates. The skill is validated and saved. They can later edit, export as `.skill` package, or delete.

**Using Journey:**
User is in a chat surface (Claude Code, Cursor, etc.) that connects to LiminalDB via MCP. When their request matches a skill's description, the model calls `load_skill` to get the SKILL.md body. The skill instructions tell the model when to fetch additional resources via `get_skill_resource`. The model follows the skill's workflow, potentially running scripts or referencing documentation. This provides skills capability to any MCP surface, not just those with native support.

**AI-Assisted Creation:**
User asks the model to help create a skill. The model uses MCP tools to create a skill record, add files, and finalize it. This enables skill creation without leaving the chat surface.

---

## User Flows & Acceptance Criteria

### Flow 1: View Skills List (Web UI)

**Before:** User has no way to see their skills.

**After:** User sees a list of their skills, ranked by usage/recency, with search and tag filtering.

**Flow:**
1. User navigates to Skills view
2. Skills load, sorted by ranking (pinned first, then by score)
3. User can search by typing in search box
4. User can filter by tags
5. User selects a skill to view details

**Variations:**
- Zero skills shows "Create your first skill" call-to-action
- Search with no matches shows "No skills match your search"
- Cold load shows top-ranked skills immediately

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-1 | User can view a list of their skills |
| AC-2 | Skills are sorted by ranking (pinned first, then by usage/recency score) |
| AC-3 | User can search skills by name or description |
| AC-4 | Search is case-insensitive |
| AC-5 | User can filter skills by tags (ANY-of selected tags) |
| AC-6 | Search and tag filter can be combined |
| AC-7 | Empty state shows "Create your first skill" prompt |
| AC-8 | No matches shows "No skills match your search" message |

**Test Conditions:**

- **TC-1:** Given user has skills, when navigating to Skills view, then skills list displays *(AC-1)*
- **TC-2:** Given skills with varying usage, when list loads, then sorted by ranking *(AC-2)*
- **TC-3:** Given skill with "code-review" in name, when user searches "code", then skill appears *(AC-3)*
- **TC-4:** Given skill with "SQL" in description, when user searches "sql", then skill appears *(AC-4)*
- **TC-5:** Given skills with tags, when user selects tag filter, then matching skills shown *(AC-5)*
- **TC-6:** Given search "review" and tag "code", when applied together, then intersection returned *(AC-6)*
- **TC-7:** Given user has no skills, when viewing list, then "Create your first skill" shown *(AC-7)*
- **TC-8:** Given no skills match query, when searching, then "No skills match" shown *(AC-8)*

---

### Flow 2: View Skill Details (Web UI)

**Before:** User selects a skill from the list.

**After:** User sees full skill details: SKILL.md content, file tree of bundled resources, metadata.

**Flow:**
1. User clicks a skill in the list
2. Skill detail view loads
3. SKILL.md content displayed (rendered markdown)
4. File tree shows bundled resources with folder structure
5. User can click a file to view its contents
6. Metadata shown: tags, usage count, last used, created date

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-9 | Selecting a skill shows its detail view |
| AC-10 | SKILL.md content is displayed as rendered markdown |
| AC-11 | File tree shows bundled resources organized by folder (scripts/, references/, assets/) |
| AC-12 | User can click a file in the tree to view its contents |
| AC-13 | File contents display with appropriate formatting (markdown rendered, code syntax highlighted) |
| AC-14 | Skill metadata (tags, usage, dates) is visible |
| AC-15 | User can switch between rendered and raw view of SKILL.md |

**Test Conditions:**

- **TC-9:** Given skill selected, when view loads, then skill details displayed *(AC-9)*
- **TC-10:** Given skill with SKILL.md, when viewing, then markdown rendered *(AC-10)*
- **TC-11:** Given skill with files in scripts/ and references/, when viewing, then file tree shows folders *(AC-11)*
- **TC-12:** Given file tree displayed, when user clicks file, then file content shown *(AC-12)*
- **TC-13:** Given markdown file selected, when viewing, then rendered as markdown *(AC-13)*
- **TC-14:** Given skill viewed, then tags and usage count visible *(AC-14)*
- **TC-15:** Given SKILL.md displayed, when user clicks "Raw", then shows raw markdown *(AC-15)*

---

### Flow 3: Create Skill (Web UI)

**Before:** User wants to create a new skill.

**After:** User has created a skill with SKILL.md and optionally bundled resources.

**Flow:**
1. User clicks "New Skill" button
2. Editor opens with SKILL.md template (frontmatter stub)
3. User fills in name and description in frontmatter
4. User writes skill body (instructions)
5. User can add files via file tree panel
6. User clicks Save
7. Skill validates (frontmatter required fields)
8. If valid, skill created and appears in list
9. If invalid, errors shown inline

**Validation rules:**
- SKILL.md must have YAML frontmatter with `name` (required) and `description` (required)
- Slug auto-generated from name (can be edited)
- File paths must be valid (no `..`, no absolute paths)
- Total skill size under limit (50KB uncompressed)

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-16 | User can initiate skill creation from Skills view |
| AC-17 | New skill editor shows SKILL.md template with frontmatter stub |
| AC-18 | User can edit SKILL.md content directly |
| AC-19 | User can add files to the skill (creates entry in file tree) |
| AC-20 | User can specify file path when adding (e.g., scripts/helper.py) |
| AC-21 | User can edit file contents after adding |
| AC-22 | Saving validates SKILL.md frontmatter |
| AC-23 | Missing `name` in frontmatter shows validation error |
| AC-24 | Missing `description` in frontmatter shows validation error |
| AC-25 | Valid skill is saved and appears in skills list |
| AC-26 | Slug is auto-generated from name |
| AC-27 | User can edit auto-generated slug before saving |
| AC-28 | Duplicate slug shows error |

**Test Conditions:**

- **TC-16:** Given Skills view, when user clicks "New Skill", then editor opens *(AC-16)*
- **TC-17:** Given new skill editor, then SKILL.md template with frontmatter shown *(AC-17)*
- **TC-18:** Given editor open, when user types in SKILL.md area, then content updates *(AC-18)*
- **TC-19:** Given editor open, when user clicks "Add File", then file entry created *(AC-19)*
- **TC-20:** Given adding file, when user enters "scripts/validate.py", then file appears under scripts/ *(AC-20)*
- **TC-21:** Given file added, when user clicks file, then can edit contents *(AC-21)*
- **TC-22:** Given skill without name in frontmatter, when saving, then validation error shown *(AC-22, AC-23)*
- **TC-23:** Given skill without description in frontmatter, when saving, then validation error shown *(AC-22, AC-24)*
- **TC-24:** Given valid skill, when saving, then skill created and appears in list *(AC-25)*
- **TC-25:** Given name "Code Review Helper", then slug auto-generated as "code-review-helper" *(AC-26)*
- **TC-26:** Given auto-generated slug, when user edits it, then edited slug used *(AC-27)*
- **TC-27:** Given existing skill "my-skill", when creating new skill with same slug, then error shown *(AC-28)*

---

### Flow 4: Edit Skill (Web UI)

**Before:** User wants to modify an existing skill.

**After:** User has updated the skill's content and/or files.

**Flow:**
1. User views a skill
2. User clicks "Edit" button
3. Editor opens with current SKILL.md and file tree
4. User modifies SKILL.md and/or files
5. User can add, edit, or delete files
6. User clicks Save
7. Changes validated and saved
8. Pre-built zip regenerated

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-29 | User can enter edit mode from skill detail view |
| AC-30 | Edit mode shows current SKILL.md content |
| AC-31 | Edit mode shows current file tree |
| AC-32 | User can modify SKILL.md content |
| AC-33 | User can add new files |
| AC-34 | User can edit existing file contents |
| AC-35 | User can delete files from the skill |
| AC-36 | Deleting a file requires confirmation |
| AC-37 | Saving updates the skill |
| AC-38 | Pre-built zip is regenerated on save |
| AC-39 | User can cancel edit (discards changes) |

**Test Conditions:**

- **TC-28:** Given skill detail view, when user clicks "Edit", then editor opens *(AC-29)*
- **TC-29:** Given edit mode, then current SKILL.md content displayed *(AC-30)*
- **TC-30:** Given edit mode with files, then file tree shows existing files *(AC-31)*
- **TC-31:** Given edit mode, when user modifies SKILL.md, then changes reflected *(AC-32)*
- **TC-32:** Given edit mode, when user adds file, then file appears in tree *(AC-33)*
- **TC-33:** Given edit mode with file, when user clicks file and edits, then content updates *(AC-34)*
- **TC-34:** Given edit mode with file, when user clicks delete on file, then confirmation shown *(AC-35, AC-36)*
- **TC-35:** Given changes made, when user clicks Save, then skill updated *(AC-37)*
- **TC-36:** Given skill saved, then downloadable zip is current *(AC-38)*
- **TC-37:** Given changes made, when user clicks Cancel, then changes discarded *(AC-39)*

---

### Flow 5: Delete Skill (Web UI)

**Before:** User wants to remove a skill.

**After:** Skill and all its files are deleted.

**Flow:**
1. User views a skill
2. User clicks "Delete" button
3. Confirmation dialog appears
4. User confirms deletion
5. Skill and all files removed
6. User returned to skills list

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-40 | User can initiate skill deletion from detail view |
| AC-41 | Deletion requires confirmation |
| AC-42 | Confirming deletes skill and all associated files |
| AC-43 | After deletion, user returned to skills list |
| AC-44 | Deleted skill no longer appears in list |

**Test Conditions:**

- **TC-38:** Given skill detail view, when user clicks "Delete", then confirmation shown *(AC-40, AC-41)*
- **TC-39:** Given confirmation shown, when user confirms, then skill deleted *(AC-42)*
- **TC-40:** Given skill deleted, then user sees skills list *(AC-43)*
- **TC-41:** Given skill deleted, then skill not in list *(AC-44)*

---

### Flow 6: Pin/Favorite Skills (Web UI)

**Before:** No way to mark important skills.

**After:** User can pin skills (always at top) and favorite skills (boosted in ranking).

**Flow:**
Identical to prompts - pin icon in header, star icon in header, immediate UI update.

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-45 | User can pin a skill from skill detail view |
| AC-46 | User can unpin a previously pinned skill |
| AC-47 | User can favorite a skill from skill detail view |
| AC-48 | User can unfavorite a previously favorited skill |
| AC-49 | Pinned skills appear at top of skills list |
| AC-50 | Favorited skills rank higher than non-favorited |
| AC-51 | Pin/favorite changes reflect immediately in UI |

**Test Conditions:**

- **TC-42:** Given skill view, when user clicks pin, then skill becomes pinned *(AC-45)*
- **TC-43:** Given pinned skill, when user clicks pin, then skill becomes unpinned *(AC-46)*
- **TC-44:** Given skill view, when user clicks star, then skill becomes favorited *(AC-47)*
- **TC-45:** Given favorited skill, when user clicks star, then skill becomes unfavorited *(AC-48)*
- **TC-46:** Given pinned skill, when viewing list, then pinned skill at top *(AC-49)*
- **TC-47:** Given favorited and non-favorited with similar usage, then favorited ranks higher *(AC-50)*
- **TC-48:** Given pin/favorite clicked, then change reflects immediately *(AC-51)*

---

### Flow 7: Import Skill Package (Web UI)

**Before:** User has a `.skill` file they want to add to their library.

**After:** Skill is imported and available in their library.

**Flow:**
1. User clicks "Import" in Skills view
2. File picker opens (accepts `.skill` files)
3. User selects a `.skill` file
4. System unzips and validates
5. Preview shown: name, description, file count
6. User can edit slug before importing (in case of conflict)
7. User confirms import
8. Skill created with all files
9. Skill appears in list

**Validation on import:**
- Must be valid zip
- Must contain SKILL.md at root
- SKILL.md must have valid frontmatter
- Slug conflict handled (user edits or auto-suffix)

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-52 | User can initiate import from Skills view |
| AC-53 | File picker accepts `.skill` files |
| AC-54 | Invalid zip shows error message |
| AC-55 | Missing SKILL.md shows error message |
| AC-56 | Invalid frontmatter shows error message |
| AC-57 | Valid package shows import preview (name, description, file list) |
| AC-58 | User can edit slug before confirming import |
| AC-59 | Confirming import creates skill with all files |
| AC-60 | Imported skill appears in skills list |
| AC-61 | Slug conflict shows warning and allows edit |

**Test Conditions:**

- **TC-49:** Given Skills view, when user clicks "Import", then file picker opens *(AC-52, AC-53)*
- **TC-50:** Given non-zip file selected, then error shown *(AC-54)*
- **TC-51:** Given zip without SKILL.md, then error shown *(AC-55)*
- **TC-52:** Given SKILL.md without frontmatter, then error shown *(AC-56)*
- **TC-53:** Given valid .skill file, then preview shows name, description, files *(AC-57)*
- **TC-54:** Given preview shown, when user edits slug, then slug updated *(AC-58)*
- **TC-55:** Given preview confirmed, then skill created with files *(AC-59)*
- **TC-56:** Given import complete, then skill in list *(AC-60)*
- **TC-57:** Given existing "my-skill", when importing skill with same slug, then conflict warning shown *(AC-61)*

---

### Flow 8: Export Skill Package (Web UI)

**Before:** User wants to download a skill as a `.skill` package.

**After:** User downloads a `.skill` file they can share or back up.

**Flow:**
1. User views a skill
2. User clicks "Export" or "Download" button
3. Pre-built `.skill` file downloads immediately

**Note:** Zip is pre-built at save time, so download is instant.

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-62 | User can export skill from detail view |
| AC-63 | Export downloads a `.skill` file |
| AC-64 | Downloaded file is named `{slug}.skill` |
| AC-65 | Downloaded file contains SKILL.md at root |
| AC-66 | Downloaded file contains all bundled resources with correct paths |
| AC-67 | Download is instant (pre-built zip) |

**Test Conditions:**

- **TC-58:** Given skill detail view, when user clicks "Export", then download starts *(AC-62, AC-63)*
- **TC-59:** Given skill "code-review", then downloaded file is "code-review.skill" *(AC-64)*
- **TC-60:** Given downloaded file, when unzipped, then SKILL.md at root *(AC-65)*
- **TC-61:** Given skill with scripts/helper.py, when unzipped, then scripts/helper.py present *(AC-66)*
- **TC-62:** Given export clicked, then download starts immediately (no spinner) *(AC-67)*

---

### Flow 9: Use Skill via MCP (Progressive Disclosure)

**Before:** User is in a chat surface (Claude Code, Cursor, etc.) that doesn't have native skills support.

**After:** User can invoke and use skills through LiminalDB's MCP tools, with progressive disclosure of skill content.

**Flow:**
1. Model has access to skill metadata (name, description) for triggering decisions
2. User request matches a skill's description
3. Model calls `load_skill(slug)` to get SKILL.md body
4. Model reads instructions in SKILL.md
5. When SKILL.md references a bundled resource, model calls `get_skill_resource(slug, path)`
6. Model follows skill workflow, fetching resources as needed
7. Model calls `track_skill_use(slug)` to record usage

**MCP Tools (Skills Runtime):**

| Tool | Purpose | Returns |
|------|---------|---------|
| `list_skills` | Get all skills (ranked, for triggering) | Array of {slug, name, description} |
| `search_skills` | Search skills by query/tags | Array of {slug, name, description} |
| `load_skill` | Get SKILL.md body (entry point) | {slug, name, description, content} |
| `get_skill_resource` | Get specific bundled file | {path, content} |
| `get_skill_bundle` | Get all files for a skill | Array of {path, content} |
| `track_skill_use` | Record skill usage | {tracked: boolean} |

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-68 | MCP tool `list_skills` returns skills sorted by ranking |
| AC-69 | MCP tool `list_skills` returns only metadata (slug, name, description) not full content |
| AC-70 | MCP tool `search_skills` accepts query string |
| AC-71 | MCP tool `search_skills` accepts optional tags filter |
| AC-72 | MCP tool `load_skill` accepts slug and returns SKILL.md content |
| AC-73 | MCP tool `load_skill` returns skill not found error for invalid slug |
| AC-74 | MCP tool `get_skill_resource` accepts slug and path |
| AC-75 | MCP tool `get_skill_resource` returns file content |
| AC-76 | MCP tool `get_skill_resource` returns not found error for invalid path |
| AC-77 | MCP tool `get_skill_bundle` returns all files for a skill |
| AC-78 | MCP tool `track_skill_use` increments usage count |
| AC-79 | MCP tool `track_skill_use` updates last-used timestamp |
| AC-80 | All MCP skill tools require authentication |
| AC-81 | MCP skill tools return clear error messages on failure |

**Test Conditions:**

- **TC-63:** Given MCP client, when `list_skills` called, then ranked skills returned *(AC-68)*
- **TC-64:** Given `list_skills` response, then only slug/name/description present, not content *(AC-69)*
- **TC-65:** Given skills exist, when `search_skills` called with query, then matches returned *(AC-70)*
- **TC-66:** Given skills with tags, when `search_skills` called with tags, then filtered results *(AC-71)*
- **TC-67:** Given skill exists, when `load_skill` called, then SKILL.md content returned *(AC-72)*
- **TC-68:** Given invalid slug, when `load_skill` called, then "skill not found" error *(AC-73)*
- **TC-69:** Given skill with file, when `get_skill_resource` called with valid path, then content returned *(AC-74, AC-75)*
- **TC-70:** Given skill, when `get_skill_resource` called with invalid path, then "file not found" error *(AC-76)*
- **TC-71:** Given skill with files, when `get_skill_bundle` called, then all files returned *(AC-77)*
- **TC-72:** Given skill, when `track_skill_use` called, then usage count incremented *(AC-78)*
- **TC-73:** Given skill, when `track_skill_use` called, then lastUsedAt updated *(AC-79)*
- **TC-74:** Given unauthenticated request, when any skill MCP tool called, then auth error *(AC-80)*
- **TC-75:** Given MCP operation fails, then clear error message returned *(AC-81)*

---

### Flow 10: Create Skill via MCP (AI-Assisted)

**Before:** User wants to create a skill without leaving their chat surface.

**After:** User can instruct the model to create a skill, and the model uses MCP tools to do so.

**Flow:**
1. User tells model "Create a skill for code review that checks for common issues"
2. Model calls `create_skill` with name, description, and SKILL.md content
3. Model can call `add_skill_file` to add bundled resources
4. Model can call `update_skill_file` to modify files
5. Model calls `finalize_skill` when done (triggers zip build)
6. Skill is now available in user's library

**MCP Tools (Skill Creation):**

| Tool | Purpose | Input |
|------|---------|-------|
| `create_skill` | Create new skill with SKILL.md | {slug, name, description, content} |
| `add_skill_file` | Add file to skill | {slug, path, content} |
| `update_skill_file` | Update existing file | {slug, path, content} |
| `delete_skill_file` | Remove file from skill | {slug, path} |
| `update_skill` | Update SKILL.md or metadata | {slug, updates} |
| `delete_skill` | Delete entire skill | {slug} |

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-82 | MCP tool `create_skill` creates a new skill |
| AC-83 | MCP tool `create_skill` validates frontmatter (name, description required) |
| AC-84 | MCP tool `create_skill` returns error on duplicate slug |
| AC-85 | MCP tool `add_skill_file` adds file to existing skill |
| AC-86 | MCP tool `add_skill_file` creates folder structure from path |
| AC-87 | MCP tool `update_skill_file` modifies existing file |
| AC-88 | MCP tool `update_skill_file` returns error for non-existent file |
| AC-89 | MCP tool `delete_skill_file` removes file from skill |
| AC-90 | MCP tool `update_skill` modifies SKILL.md content |
| AC-91 | MCP tool `update_skill` can update metadata (tags, pinned, favorited) |
| AC-92 | MCP tool `delete_skill` removes skill and all files |
| AC-93 | Skill modifications trigger zip rebuild |

**Test Conditions:**

- **TC-76:** Given MCP client, when `create_skill` called with valid data, then skill created *(AC-82)*
- **TC-77:** Given create without name, then validation error *(AC-83)*
- **TC-78:** Given existing slug, when `create_skill` called, then duplicate error *(AC-84)*
- **TC-79:** Given skill exists, when `add_skill_file` called, then file added *(AC-85)*
- **TC-80:** Given path "scripts/helpers/validate.py", when added, then folder structure created *(AC-86)*
- **TC-81:** Given file exists, when `update_skill_file` called, then content updated *(AC-87)*
- **TC-82:** Given file doesn't exist, when `update_skill_file` called, then error *(AC-88)*
- **TC-83:** Given file exists, when `delete_skill_file` called, then file removed *(AC-89)*
- **TC-84:** Given skill exists, when `update_skill` called with content, then SKILL.md updated *(AC-90)*
- **TC-85:** Given skill exists, when `update_skill` called with tags, then tags updated *(AC-91)*
- **TC-86:** Given skill exists, when `delete_skill` called, then skill and files removed *(AC-92)*
- **TC-87:** Given skill modified via MCP, then zip is rebuilt *(AC-93)*

---

### Flow 11: Durable Drafts for Skills (Web UI)

**Before:** User editing a skill loses work on browser refresh.

**After:** Skill edits persist as drafts (same pattern as prompts).

**Flow:**
Identical to prompt drafts - auto-save to Redis, 24h TTL, cross-tab sync, draft indicator in header.

**Acceptance Criteria:**

| ID | Criteria |
|----|----------|
| AC-94 | Skill edits auto-save as drafts |
| AC-95 | Skill drafts survive browser refresh |
| AC-96 | Skill drafts accessible from other tabs |
| AC-97 | "Unsaved changes" indicator appears when skill drafts exist |
| AC-98 | User can save draft (commits to database) |
| AC-99 | User can discard draft (clears without saving) |
| AC-100 | Skill drafts expire after 24 hours |

**Test Conditions:**

- **TC-88:** Given user editing skill, when changes made, then draft auto-saved *(AC-94)*
- **TC-89:** Given skill draft exists, when browser refreshed, then draft restored *(AC-95)*
- **TC-90:** Given skill draft in Tab A, when Tab B opened, then indicator visible *(AC-96)*
- **TC-91:** Given skill draft exists, then "Unsaved changes" indicator shown *(AC-97)*
- **TC-92:** Given skill draft, when Save clicked, then skill updated *(AC-98)*
- **TC-93:** Given skill draft, when Discard clicked, then draft cleared *(AC-99)*
- **TC-94:** Given skill draft older than 24h, then draft expired *(AC-100)*

---

## Non-Functional Requirements

### Skill Size Limits

Skills must fit in model context windows. Enforce reasonable limits.

**Requirements:**
- Individual file max: 100KB
- Total skill max: 500KB (uncompressed)
- SKILL.md max: 50KB (should be <500 lines per best practice)
- Clear error messages when limits exceeded

### Performance

**Requirements:**
- Skill list loads within 200ms for up to 100 skills
- `load_skill` MCP tool responds within 100ms
- `get_skill_resource` responds within 100ms
- Zip download is instant (pre-built)
- Import validates and previews within 2 seconds

### MCP Runtime Reliability

**Requirements:**
- All MCP skill tools available when prompts tools are available
- Consistent error response format across all tools
- Usage tracking is non-blocking (fire and forget)

### Cross-Surface Consistency

**Requirements:**
- Skills visible in both web UI and MCP
- Same ranking applied in both surfaces
- Usage tracking works from both surfaces

---

## Architectural Overview

### Data Model

**New tables:**

```
skills
├── userId (string, indexed)
├── slug (string, unique per user)
├── name (string, from frontmatter)
├── description (string, from frontmatter)
├── skillMdContent (string, SKILL.md body)
├── tagNames (array, denormalized)
├── searchText (string, for search index)
├── pinned (boolean)
├── favorited (boolean)
├── usageCount (number)
├── lastUsedAt (number, optional)
├── zipFileId (file reference, pre-built package)

skillFiles
├── skillId (reference to skills)
├── path (string, e.g., "scripts/helper.py")
├── content (string, file content)
```

**Reused infrastructure:**
- Tags system (same `tags` and `skillTags` junction pattern)
- Ranking algorithm (same weights, same scoring)
- Redis drafts (same pattern, different key namespace)
- Search index (on skills.searchText)

### MCP Tools Summary

**Runtime tools (using skills):**
- `list_skills` - metadata for triggering
- `search_skills` - query-based discovery
- `load_skill` - get SKILL.md body
- `get_skill_resource` - get individual file
- `get_skill_bundle` - get all files
- `track_skill_use` - record usage

**Authoring tools (creating skills via MCP):**
- `create_skill` - create new skill
- `add_skill_file` - add bundled resource
- `update_skill_file` - modify file
- `delete_skill_file` - remove file
- `update_skill` - modify SKILL.md or metadata
- `delete_skill` - remove skill

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/skills` | GET | List user's skills (ranked) |
| `/api/skills` | POST | Create skill |
| `/api/skills/:slug` | GET | Get skill details |
| `/api/skills/:slug` | PUT | Update skill |
| `/api/skills/:slug` | DELETE | Delete skill |
| `/api/skills/:slug/files` | GET | List skill's files |
| `/api/skills/:slug/files` | POST | Add file to skill |
| `/api/skills/:slug/files/:path` | GET | Get file content |
| `/api/skills/:slug/files/:path` | PUT | Update file |
| `/api/skills/:slug/files/:path` | DELETE | Delete file |
| `/api/skills/:slug/download` | GET | Download .skill package |
| `/api/skills/import` | POST | Import .skill package |

### UI Components

**New portlet:** `skills.html` (parallel to `prompts.html`)

**New components:**
- `skill-viewer.js` - display SKILL.md + file tree
- `skill-editor.js` - edit SKILL.md + manage files
- `file-tree.js` - collapsible file browser
- `file-editor.js` - edit individual files

**Shared components (reused from prompts):**
- Toast notifications
- Confirmation modals
- Tag picker
- Search input

---

## Dependencies

- Prompts infrastructure must be stable (tags, ranking, drafts patterns)
- Convex file storage available (for pre-built zip)
- Redis available (for drafts)

## Related Features

- **Prompts (Epic 01-02):** Shares tags, ranking, drafts, search patterns
- **Harvest Flow (Future):** May harvest skills from conversations, not just prompts
