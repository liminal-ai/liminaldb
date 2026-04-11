# Epic: Skill Data Model & Storage Foundation

This epic extends the Convex data layer from prompt-only storage to skills-capable storage. It introduces the skill entity model, evolves the tag system from 19 fixed global tags to user-owned tags with seed-and-suggest, and establishes multi-file artifact storage. Nothing in this epic is user-facing on its own. It provides schema, validation, and data operations that Epics 2 (Capture), 3 (Retrieval), and 4 (Management) depend on.

---

## User Profile

**Primary User:** AI power user who works across multiple chat and coding surfaces daily.
**Context:** This user captures reusable workflows from model conversations and wants them stored as structured, portable skills. They do not interact with Epic 1 directly — this epic provides the data layer that capture, retrieval, and management surfaces build on.
**Mental Model:** "The system should be able to store any skill I throw at it — from a simple markdown draft to a multi-file package — and keep it organized with my other skills and prompts."
**Key Constraint:** The data model must serve both simple capture (name + SKILL.md, nothing else) and advanced use (multi-file packages with scripts and references) without schema changes or migrations between the two.

---

## Feature Overview

LiminalDB currently stores prompts: text content with metadata, tags from a fixed global set of 19, and ranking/usage signals. Skills are a richer artifact type — structured multi-file packages with a SKILL.md entrypoint and optional resource files at arbitrary paths.

This epic adds skills as a first-class entity alongside prompts. It also evolves the tag system from fixed globals to user-owned tags that serve both prompts and skills. After this epic ships, the data layer can store, validate, retrieve, search, rank, and manage skills. The API/MCP surface (Epic 2), search surface (Epic 3), and web management surface (Epic 4) build on these operations.

Skills coexist with prompts. The existing prompt system remains unchanged. Both artifact types share the same user-scoped tag set.

---

## Scope

### In Scope

- Skill entity with identity fields, metadata, SKILL.md entrypoint content, and optional resource files
- Skill CRUD data operations (create, read, update, delete) at the model layer
- User-scoped tags replacing fixed global tags
- Tag seeding for new users and migration for existing users
- Tag suggestion on save (prefix/fuzzy match against existing user tags)
- Tag creation on save when no suggestion is accepted
- Multi-file storage model: SKILL.md entrypoint plus resource files at arbitrary relative paths
- Slug auto-generation from skill name
- Search text construction for skills (parallel to prompt searchText)
- Ranking model applied to skills (same formula as prompts)
- Validation rules and error codes for skill operations
- Coexistence with existing prompt entities and operations

### Out of Scope

- Skill execution, validation, or testing
- Any user-facing surface (MCP tools, REST endpoints, CLI commands, web UI) — those are Epics 2-4
- Dedicated tag management UI or tag deletion/cleanup operations
- Import from external sources (fast-follow)
- Scan or trust signal metadata
- Eval storage or orchestration
- Semantic/vector search (keyword + tag search with ranking is the baseline)
- Template merge for skills (merge stays in the prompt surface)

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Skill slugs follow the same format as prompt slugs: lowercase alphanumeric + dashes, max 200 chars | Validated | Reuses existing `SLUG_REGEX` |
| A2 | Skill slugs and prompt slugs occupy separate namespaces — a user can have a prompt `my-tool` and a skill `my-tool` without conflict | Working | Separate tables, separate indexes |
| A3 | Resource file paths are relative, forward-slash separated, no leading slash, no `..` traversal | Working | Portable across OS; stored exactly as authored |
| A4 | Resource file content is stored as text strings, not binary | Working | Matches the markdown-first market (91% non-scripted). Binary asset support is deferred. |
| A5 | Tag names are normalized to lowercase trimmed on write; comparison is case-insensitive | Validated | Extends current tag normalization pattern |
| A6 | The starter tag set for new users includes the current 19 global tags plus skill-relevant additions | Working | Exact set defined in Flow 4 |
| A7 | Convex document size limits can accommodate skills with up to 20 resource files of typical size (each under 100KB of text content) | Needs validation | Convex docs have a 1MB limit; resource files in a separate table avoids this |
| A8 | Tag suggestion uses prefix matching and Levenshtein distance; exact algorithm is a tech design decision | Working | The epic defines the behavioral contract, not the algorithm |
| A9 | User-owned tags do not carry a dimension field; the dimension concept from global tags is not carried forward | Working | Dimensions were presentation grouping for the fixed 19; user-created tags do not fit neatly into purpose/domain/task |
| A10 | The maximum number of skills per user is 1000, matching the prompt limit | Working | Can be raised later; consistent with existing limit pattern |
| A11 | A skill's searchText field is built from slug + name + description + entrypoint content, lowercased | Working | Parallels prompt searchText construction |

---

## Dependencies

Technical dependencies:
- Convex schema extension (new tables, indexes, search index)
- Existing trigger infrastructure (`convex/functions.ts` wrapped mutations)
- Existing RLS infrastructure (`convex/auth/rls.ts`)
- Existing ranking infrastructure (`convex/model/ranking.ts`)

Process dependencies:
- None — this is the first epic in the skills sequence

---

## Flows & Requirements

### 1. Skill Creation

A skill is created with metadata, SKILL.md entrypoint content, and optionally one or more resource files. This is the model-layer operation that Epic 2's capture surfaces call.

1. Caller provides skill input: name, description, entrypoint content, optional slug, optional tags, optional resource files
2. System normalizes and validates all fields (name length, description length, entrypoint content length, slug format, tag names, resource file paths and sizes)
3. If no slug is provided, system generates one from the skill name
4. System checks that the generated or provided slug does not already exist for this user in the skills table
5. For each tag name provided, system checks the user's existing tags for matches; creates new user-owned tags for any names not already present
6. System stores the skill record with metadata, entrypoint content, and resource files
7. System constructs and stores the searchText field
8. System returns the created skill's ID and slug, along with any tag suggestions that were generated

#### Acceptance Criteria

**AC-1.1:** A skill can be created with only a name and SKILL.md entrypoint content — no other fields required

- **TC-1.1a: Minimal skill creation**
  - Given: A valid userId, name "Deploy to Staging", and entrypoint content "## Steps\n1. Run deploy script"
  - When: Skill creation is called with no slug, no description, no tags, no resource files
  - Then: Skill is created with an auto-generated slug, empty description, empty tags, empty resource files, searchText populated, pinned=false, favorited=false, usageCount=0

- **TC-1.1b: Entrypoint content is required**
  - Given: A valid userId and name "My Skill"
  - When: Skill creation is called with empty or whitespace-only entrypoint content
  - Then: Creation fails with error code SKILL_CONTENT_REQUIRED

- **TC-1.1c: Name is required**
  - Given: A valid userId and entrypoint content
  - When: Skill creation is called with empty or whitespace-only name
  - Then: Creation fails with error code SKILL_NAME_REQUIRED

**AC-1.2:** Skill slug is auto-generated from name when not provided

- **TC-1.2a: Slug generated from name**
  - Given: Name "Deploy to Staging" and no slug provided
  - When: Skill is created
  - Then: Slug is "deploy-to-staging"

- **TC-1.2b: Slug generation handles special characters**
  - Given: Name "My Skill (v2) -- Final!" and no slug provided
  - When: Skill is created
  - Then: Slug contains only lowercase alphanumeric and dashes, matches SLUG_REGEX

- **TC-1.2c: Slug generation handles collision**
  - Given: A skill with slug "deploy-to-staging" already exists for this user
  - When: A new skill with name "Deploy to Staging" is created with no explicit slug
  - Then: System generates an alternative slug (e.g., "deploy-to-staging-2") that does not collide

- **TC-1.2d: Explicit slug is used when provided**
  - Given: Name "My Skill" and slug "custom-slug" provided
  - When: Skill is created
  - Then: Skill is stored with slug "custom-slug", not auto-generated

**AC-1.3:** Skill creation validates all field constraints

- **TC-1.3a: Name length limit**
  - Given: Name exceeding 200 characters
  - When: Skill creation is called
  - Then: Creation fails with error indicating name too long

- **TC-1.3b: Description length limit**
  - Given: Description exceeding 2000 characters
  - When: Skill creation is called
  - Then: Creation fails with error indicating description too long

- **TC-1.3c: Entrypoint content length limit**
  - Given: Entrypoint content exceeding 100,000 characters
  - When: Skill creation is called
  - Then: Creation fails with error indicating content too long

- **TC-1.3d: Slug format validation**
  - Given: Explicit slug "My Skill!" (contains uppercase and special chars)
  - When: Skill creation is called
  - Then: Creation fails with error code INVALID_SLUG

- **TC-1.3e: Duplicate slug for same user**
  - Given: A skill with slug "my-skill" already exists for this user
  - When: Skill creation is called with slug "my-skill"
  - Then: Creation fails with error code DUPLICATE_SKILL_SLUG

- **TC-1.3f: Same slug allowed for different users**
  - Given: User A has a skill with slug "my-skill"
  - When: User B creates a skill with slug "my-skill"
  - Then: Creation succeeds — slugs are unique per user, not globally

- **TC-1.3g: Max tags per skill**
  - Given: Skill creation input with 51 tags
  - When: Skill creation is called
  - Then: Creation fails with error indicating too many tags (max 50)

**AC-1.4:** Skill creation enforces the per-user skill limit

- **TC-1.4a: Under limit**
  - Given: User has 999 skills
  - When: User creates one more skill
  - Then: Creation succeeds

- **TC-1.4b: At limit**
  - Given: User has 1000 skills
  - When: User attempts to create another skill
  - Then: Creation fails with error code MAX_SKILLS_EXCEEDED, including currentCount and maxSkills in the error

- **TC-1.4c: Limit is separate from prompts**
  - Given: User has 1000 prompts and 0 skills
  - When: User creates a skill
  - Then: Creation succeeds — skill and prompt limits are independent

**AC-1.5:** Skill creation stores resource files at arbitrary relative paths

- **TC-1.5a: Skill with resource files**
  - Given: Entrypoint content plus resource files at paths "scripts/run.py", "references/api-docs.md", "examples/basic.md"
  - When: Skill is created
  - Then: All resource files are stored with their paths and content preserved

- **TC-1.5b: Resource file path validation — no absolute paths**
  - Given: A resource file with path "/scripts/run.py" (leading slash)
  - When: Skill creation is called
  - Then: Creation fails with error code INVALID_RESOURCE_PATH

- **TC-1.5c: Resource file path validation — no traversal**
  - Given: A resource file with path "../escape/run.py"
  - When: Skill creation is called
  - Then: Creation fails with error code INVALID_RESOURCE_PATH

- **TC-1.5d: Resource file path validation — no empty path**
  - Given: A resource file with empty or whitespace-only path
  - When: Skill creation is called
  - Then: Creation fails with error code INVALID_RESOURCE_PATH

- **TC-1.5e: Resource file content limit**
  - Given: A resource file with content exceeding 100,000 characters
  - When: Skill creation is called
  - Then: Creation fails with error code RESOURCE_FILE_TOO_LARGE

- **TC-1.5f: Max resource files per skill**
  - Given: A skill with 51 resource files
  - When: Skill creation is called
  - Then: Creation fails with error code TOO_MANY_RESOURCE_FILES (max 50)

- **TC-1.5g: Duplicate resource file paths**
  - Given: Two resource files with the same path "scripts/run.py"
  - When: Skill creation is called
  - Then: Creation fails with error code INVALID_RESOURCE_PATH (duplicate)

- **TC-1.5h: Arbitrary directory structure**
  - Given: Resource files at paths "deeply/nested/dir/file.txt", "flat-file.md", "config/settings.yaml"
  - When: Skill is created
  - Then: All paths are stored exactly as provided — no restriction on directory depth or directory names

**AC-1.6:** Skill creation initializes ranking and usage fields

- **TC-1.6a: Default ranking fields**
  - Given: A new skill is created
  - When: The stored record is examined
  - Then: pinned=false, favorited=false, usageCount=0, lastUsedAt is not set

**AC-1.7:** Skill creation builds searchText for the search index

- **TC-1.7a: searchText construction**
  - Given: Skill with slug "deploy-staging", name "Deploy to Staging", description "How to deploy", entrypoint content "Run the deploy script"
  - When: Skill is created
  - Then: searchText is "deploy-staging deploy to staging how to deploy run the deploy script" (lowercased concatenation)

- **TC-1.7b: searchText with empty description**
  - Given: Skill with slug "my-skill", name "My Skill", empty description, entrypoint content "Do things"
  - When: Skill is created
  - Then: searchText is "my-skill my skill  do things" (empty description produces double space, trimmed on search)

---

### 2. Skill Retrieval

Getting a skill by slug, listing skills for a user, and retrieving resource file content. This is the data layer that Epic 3's search and retrieval surfaces build on.

1. Caller requests a skill by slug, or requests a list of skills with optional filters
2. System fetches the skill(s) scoped to the authenticated user
3. System applies RLS checks
4. For single-skill retrieval, system returns full skill data including metadata, entrypoint content, and resource file listing
5. For list operations, system applies ranking and returns DTOs

#### Acceptance Criteria

**AC-2.1:** A skill can be retrieved by slug with full content

- **TC-2.1a: Skill exists**
  - Given: A skill with slug "deploy-staging" exists for this user, with 2 resource files
  - When: getBySlug is called with userId and slug "deploy-staging"
  - Then: Returns SkillDTO with all metadata, entrypoint content, and resourceFiles array containing both files with paths and content

- **TC-2.1b: Skill not found**
  - Given: No skill with slug "nonexistent" exists for this user
  - When: getBySlug is called
  - Then: Returns null

- **TC-2.1c: Skill belongs to different user**
  - Given: User B has a skill "deploy-staging" but User A requests it
  - When: User A calls getBySlug with their userId
  - Then: Returns null (userId index scoping prevents cross-user access)

- **TC-2.1d: Simple skill has empty resource files array**
  - Given: A skill with no resource files
  - When: getBySlug is called
  - Then: Returns SkillDTO with resourceFiles as an empty array

**AC-2.2:** Skills can be listed for a user with ranking applied

- **TC-2.2a: Basic listing**
  - Given: User has 5 skills with varying usage
  - When: listSkillsRanked is called
  - Then: Returns up to 5 skills ordered by rank score

- **TC-2.2b: Pinned skills first**
  - Given: User has skills A (pinned), B (not pinned, high usage), C (not pinned, low usage)
  - When: List is returned in "list" mode
  - Then: A appears before B and C regardless of score

- **TC-2.2c: Never-used skills after used skills**
  - Given: Skills with usageCount > 0 and skills with usageCount = 0
  - When: List is returned in "list" mode
  - Then: All used skills appear before all never-used skills (within each pinned tier)

- **TC-2.2d: Limit respected**
  - Given: User has 100 skills
  - When: List is requested with limit=10
  - Then: Returns exactly 10 skills

- **TC-2.2e: Tag filtering on list**
  - Given: User has skills tagged "code" and skills tagged "writing"
  - When: List is requested with tags=["code"]
  - Then: Only skills with the "code" tag are returned (ANY-of matching)

- **TC-2.2f: Empty library**
  - Given: User has no skills
  - When: List is requested
  - Then: Returns empty array

- **TC-2.2g: Default and max limit**
  - Given: User has 100 skills
  - When: List is requested with no limit specified
  - Then: Returns up to 50 skills (default limit); max limit is 1000

**AC-2.3:** Skill search uses the searchText index with ranking

- **TC-2.3a: Keyword match**
  - Given: Skills with "deploy" in name/description/entrypoint
  - When: Search is called with query "deploy"
  - Then: Matching skills are returned ranked by score

- **TC-2.3b: Search with tag filter**
  - Given: Skills matching "deploy" with various tags
  - When: Search is called with query "deploy" and tags=["code"]
  - Then: Only skills matching both the keyword and the tag are returned

- **TC-2.3c: Empty query falls back to ranked list**
  - Given: User has skills
  - When: Search is called with empty or whitespace query
  - Then: Returns ranked list (same behavior as listSkillsRanked)

- **TC-2.3d: Search over-fetches for tag filtering**
  - Given: Search with tag filter applied
  - When: System executes search
  - Then: Over-fetches up to searchRerankLimit (200) candidates before applying tag filter and reranking

**AC-2.4:** Resource files are accessible from a retrieved skill

- **TC-2.4a: Resource files included in DTO**
  - Given: A skill with 3 resource files at "scripts/run.py", "references/api.md", "examples/basic.md"
  - When: Skill is retrieved by slug
  - Then: DTO includes a resourceFiles array with path and content for each file

- **TC-2.4b: Resource file order**
  - Given: A skill with resource files at various paths
  - When: Skill is retrieved
  - Then: Resource files are returned in a consistent order (alphabetical by path)

---

### 3. Skill Update & Delete

Updating skill metadata, entrypoint content, adding/removing resource files, and deleting a skill.

Steps for update:
1. Caller provides the current slug and the updated fields
2. System validates all updated fields
3. If slug is changing, system checks new slug does not conflict
4. System handles tag changes (add new user tags if needed, update skill-tag associations)
5. System rebuilds searchText if name, description, slug, or entrypoint changed
6. System persists the update

Steps for delete:
1. Caller provides the slug
2. System finds the skill and checks ownership
3. System removes skill-tag associations
4. System removes all resource files associated with the skill
5. System deletes the skill record

#### Acceptance Criteria

**AC-3.1:** Skill metadata can be updated by slug

- **TC-3.1a: Update name and description**
  - Given: An existing skill with slug "deploy-staging"
  - When: Update is called with new name "Deploy to Production" and new description
  - Then: Skill record is updated, searchText is rebuilt

- **TC-3.1b: Slug rename**
  - Given: An existing skill with slug "old-slug"
  - When: Update is called with slug changed to "new-slug"
  - Then: Skill is now accessible at "new-slug", not at "old-slug"

- **TC-3.1c: Slug rename collision**
  - Given: Skills "alpha" and "beta" exist for the same user
  - When: Update changes "alpha"'s slug to "beta"
  - Then: Update fails with error code DUPLICATE_SKILL_SLUG

- **TC-3.1d: Update nonexistent skill**
  - Given: No skill with slug "nonexistent" exists for this user
  - When: Update is called
  - Then: Returns false (not found)

- **TC-3.1e: Validation on update**
  - Given: An existing skill
  - When: Update is called with name exceeding 200 chars
  - Then: Update fails with validation error

**AC-3.2:** Skill entrypoint content can be updated

- **TC-3.2a: Update entrypoint**
  - Given: A skill with entrypoint content "V1 instructions"
  - When: Update is called with new entrypoint content "V2 instructions"
  - Then: Entrypoint content is "V2 instructions" and searchText is rebuilt

- **TC-3.2b: Entrypoint cannot be set to empty**
  - Given: A skill with existing content
  - When: Update is called with empty entrypoint content
  - Then: Update fails with error code SKILL_CONTENT_REQUIRED

**AC-3.3:** Resource files can be added and removed

- **TC-3.3a: Add resource file to simple skill**
  - Given: A skill with no resource files
  - When: Update adds a resource file at path "scripts/run.py" with content
  - Then: Skill now has one resource file; the skill remains the same entity (no migration)

- **TC-3.3b: Remove resource file**
  - Given: A skill with resource files at "scripts/run.py" and "examples/basic.md"
  - When: Update removes "scripts/run.py"
  - Then: Skill has only "examples/basic.md" remaining

- **TC-3.3c: Replace resource file content**
  - Given: A skill with resource file "scripts/run.py" containing "v1 code"
  - When: Update provides "scripts/run.py" with content "v2 code"
  - Then: Resource file content is updated to "v2 code"

- **TC-3.3d: Resource file validation on update**
  - Given: An existing skill
  - When: Update adds a resource file with path "../escape/file.txt"
  - Then: Update fails with error code INVALID_RESOURCE_PATH

- **TC-3.3e: Resource file count limit on update**
  - Given: A skill with 49 resource files
  - When: Update adds 2 more resource files
  - Then: Update fails with error code TOO_MANY_RESOURCE_FILES (total would exceed 50)

**AC-3.4:** Skill tags can be updated with add/remove semantics

- **TC-3.4a: Add new tag**
  - Given: A skill with tags ["code"]
  - When: Update sets tags to ["code", "deploy"]
  - Then: Skill has tags ["code", "deploy"]; if "deploy" is new for this user, a user tag is created

- **TC-3.4b: Remove tag**
  - Given: A skill with tags ["code", "deploy"]
  - When: Update sets tags to ["code"]
  - Then: Skill has tags ["code"]; the "deploy" user tag record is not deleted (tags accumulate)

- **TC-3.4c: Tag suggestions on update**
  - Given: User has tag "deployment" and update sets tags to ["deploy"]
  - When: Update completes
  - Then: Update succeeds with "deploy" as a new tag; response includes suggestion that "deployment" is a close match

**AC-3.5:** Skill deletion removes the skill and its associations

- **TC-3.5a: Delete existing skill**
  - Given: A skill with slug "deploy-staging" with 3 resource files and tag associations
  - When: Delete is called
  - Then: The skill record, all associated resource file records, and all skill-tag junction records are removed

- **TC-3.5b: Delete nonexistent skill**
  - Given: No skill with slug "nonexistent" for this user
  - When: Delete is called
  - Then: Returns false (not found)

- **TC-3.5c: Delete does not affect user tags**
  - Given: A skill tagged with "code"
  - When: The skill is deleted
  - Then: The user's "code" tag record still exists (tags are never deleted in this epic)

- **TC-3.5d: RLS enforcement on delete**
  - Given: User A's skill "deploy-staging"
  - When: User B attempts to delete it
  - Then: RLS violation error or skill not found (userId index scoping prevents cross-user access)

**AC-3.6:** Skill usage flags can be updated

- **TC-3.6a: Pin a skill**
  - Given: A skill with pinned=false
  - When: updateSkillFlags is called with pinned=true
  - Then: Skill record has pinned=true

- **TC-3.6b: Favorite a skill**
  - Given: A skill with favorited=false
  - When: updateSkillFlags is called with favorited=true
  - Then: Skill record has favorited=true

- **TC-3.6c: Track usage**
  - Given: A skill with usageCount=5
  - When: trackSkillUse is called
  - Then: usageCount=6 and lastUsedAt is set to current time

- **TC-3.6d: Partial flag update**
  - Given: A skill with pinned=false and favorited=true
  - When: updateSkillFlags is called with only pinned=true
  - Then: pinned=true and favorited remains true (unchanged fields are not modified)

---

### 4. Tag System Evolution

Tags transition from 19 fixed global records to user-scoped records that serve both prompts and skills.

1. New user tag records store tags per user: userId, name, createdAt
2. When a user saves a skill or prompt with tags, the system checks each tag name against the user's tag set
3. For each tag name that matches an existing user tag, the system uses that tag
4. For each tag name that does not match, the system checks for close-match suggestions
5. If close matches exist, the system returns suggestions alongside the save result (does not block the save)
6. If the caller provided the tag name explicitly, the system creates a new user-owned tag
7. Tag names are normalized on write: trimmed and lowercased

#### Acceptance Criteria

**AC-4.1:** Tags are user-scoped records with userId and name

- **TC-4.1a: User tag creation**
  - Given: User A has no tag named "deployment"
  - When: User A saves a skill with tag "deployment"
  - Then: A user-owned tag "deployment" is created for User A

- **TC-4.1b: User tag isolation**
  - Given: User A has a tag "deployment", User B does not
  - When: User B's tags are queried
  - Then: "deployment" is not in User B's tag set

- **TC-4.1c: Tag name normalization**
  - Given: Tag name "  Deploy  " with leading/trailing spaces and mixed case
  - When: Tag is created
  - Then: Tag is stored as "deploy" (trimmed and lowercased)

- **TC-4.1d: Duplicate tag prevention**
  - Given: User A already has tag "code"
  - When: User A saves a skill with tag "code"
  - Then: No duplicate tag is created; the existing tag is used

- **TC-4.1e: Tag name length limit**
  - Given: Tag name exceeding 100 characters
  - When: Tag creation is attempted
  - Then: Fails with error code TAG_NAME_TOO_LONG

- **TC-4.1f: Empty tag name rejected**
  - Given: Tag name is empty or whitespace-only after trimming
  - When: Tag creation is attempted
  - Then: Fails with error code TAG_NAME_REQUIRED

- **TC-4.1g: Tag name format**
  - Given: Tag names "code-review", "code_review", "code123"
  - When: Tags are created
  - Then: All are accepted — tag names allow lowercase alphanumeric, dashes, and underscores

**AC-4.2:** Tag suggestions surface close matches during save without blocking

- **TC-4.2a: Prefix match suggestion**
  - Given: User has tag "deployment" and saves a skill with tag "deploy"
  - When: Save completes
  - Then: Save succeeds with "deploy" as a new tag, and the response includes a suggestion that "deployment" is a close match

- **TC-4.2b: Close match suggestion (typo)**
  - Given: User has tag "debugging" and saves with tag "debuging" (typo)
  - When: Save completes
  - Then: Save succeeds with "debuging" as a new tag, and the response suggests "debugging" as a close match

- **TC-4.2c: No suggestions for exact match**
  - Given: User has tag "code" and saves with tag "code"
  - When: Save completes
  - Then: Existing tag is used, no suggestions returned for "code"

- **TC-4.2d: No suggestions when no close match exists**
  - Given: User's tags are ["code", "writing", "deploy"]
  - When: Save includes tag "astronomy"
  - Then: New tag "astronomy" is created, no suggestions for it

- **TC-4.2e: Suggestions do not block save**
  - Given: Close matches exist for a provided tag name
  - When: Save is called
  - Then: The skill/prompt is saved immediately; suggestions are informational in the response

- **TC-4.2f: Multiple tags with suggestions**
  - Given: User has tags ["deployment", "debugging"]
  - When: Save includes tags ["deploy", "debug", "newconcept"]
  - Then: All three tags are created/resolved; suggestions returned for "deploy" (close to "deployment") and "debug" (close to "debugging"); no suggestion for "newconcept"

**AC-4.3:** Tags are shared between skills and prompts for the same user

- **TC-4.3a: Tag created via skill is available to prompts**
  - Given: User creates tag "deploy" by saving a skill
  - When: User saves a prompt with tag "deploy"
  - Then: The same user tag is reused (no new tag created)

- **TC-4.3b: Tag created via prompt is available to skills**
  - Given: User creates tag "review" by saving a prompt
  - When: User saves a skill with tag "review"
  - Then: The same user tag is reused

- **TC-4.3c: Tag listing returns all user tags regardless of origin**
  - Given: Tags created via both skill and prompt saves
  - When: User's tags are listed
  - Then: All tags appear in a single flat list, sorted alphabetically

**AC-4.4:** User tags have no dimension field

- **TC-4.4a: No dimension on user tags**
  - Given: A user-owned tag is created
  - When: The tag record is examined
  - Then: There is no dimension field; the tag has userId, name, and createdAt only

- **TC-4.4b: Starter tags also lack dimension**
  - Given: A new user receives the starter tag set
  - When: The seeded tag records are examined
  - Then: None have a dimension field, including the 19 tags that had dimensions in the global system

---

### 5. Tag Migration

The migration path from global tags to user-owned tags for existing users, and seeding for new users.

Steps for existing user migration:
1. For each existing user in the users table, create user-owned copies of the starter tag set
2. For each prompt that references a global tag (via the promptTags junction table), update the reference to point to the user's corresponding user-owned tag
3. The global tags table and promptTags junction table remain in place during migration for backward compatibility

Steps for new user seeding:
1. When a new user record is created, seed their user tag set with the starter tags
2. The seeding operation is idempotent — running it on a user who already has tags does not create duplicates

#### Acceptance Criteria

**AC-5.1:** Existing users receive user-owned copies of the starter tag set

- **TC-5.1a: Migration creates user tags**
  - Given: An existing user with prompts tagged using global tags
  - When: The migration runs for this user
  - Then: User-owned tags are created for each tag in the starter set

- **TC-5.1b: Migration is idempotent**
  - Given: The migration has already run for a user
  - When: The migration runs again
  - Then: No duplicate tags are created; existing user tags are preserved

- **TC-5.1c: Migration handles users with no prompts**
  - Given: A user who has never created a prompt
  - When: The migration runs
  - Then: User still receives the starter tag set

**AC-5.2:** Prompt tag references are updated to point to user-owned tags

- **TC-5.2a: Junction table updated**
  - Given: A prompt with tags ["code", "review"] referencing global tag IDs
  - When: The migration runs
  - Then: The promptTags junction entries reference the user's own "code" and "review" tag IDs (in userTags, not global tags)

- **TC-5.2b: Denormalized tagNames unchanged**
  - Given: A prompt with tagNames ["code", "review"]
  - When: The migration runs
  - Then: The prompt's tagNames array is unchanged (names are the same; only the underlying tag IDs in the junction change)

- **TC-5.2c: Prompt queries work identically after migration**
  - Given: A prompt searchable by tag "code" before migration
  - When: After migration
  - Then: The same prompt is still returned when filtering by tag "code"

**AC-5.3:** New users receive the starter tag set on account creation

- **TC-5.3a: New user seeding**
  - Given: A new user signs up
  - When: Their user record is created
  - Then: User-owned tags for the starter set are created

- **TC-5.3b: Seeding is idempotent**
  - Given: A user who already has the starter tags
  - When: The seeding function runs again (e.g., on re-login)
  - Then: No duplicate tags are created

**AC-5.4:** The starter tag set includes the 19 current global tags plus skill-relevant additions

- **TC-5.4a: Starter set includes all 19 globals**
  - Given: The starter tag set definition
  - When: Examined
  - Then: It includes: instruction, reference, persona, workflow, snippet, code, writing, analysis, planning, design, data, communication, review, summarize, explain, debug, transform, extract, translate

- **TC-5.4b: Starter set includes skill-relevant additions**
  - Given: The starter tag set definition
  - When: Examined
  - Then: It includes skill-relevant tags: automation, agent, tool, deployment, testing, configuration, documentation, integration

**AC-5.5:** Existing prompt operations are unaffected during and after migration

- **TC-5.5a: Prompt CRUD works during migration**
  - Given: The migration is in progress (some users migrated, some not)
  - When: A user creates, reads, updates, or deletes a prompt
  - Then: All operations succeed without error

- **TC-5.5b: Prompt search works after migration**
  - Given: The migration has completed
  - When: A user searches prompts by keyword and tag
  - Then: Results are identical to pre-migration results

- **TC-5.5c: Prompt import works after migration**
  - Given: The migration has completed
  - When: A user imports prompts with tags
  - Then: Import succeeds using user-owned tags (tag names validated against user's tag set, not the global enum)

- **TC-5.5d: Prompt tag filtering works after migration**
  - Given: A user whose prompts have been migrated to user-owned tags
  - When: listPromptsRanked is called with tags=["code"]
  - Then: Returns the same prompts as before migration

---

## Data Contracts

### Skill Entity (Stored Shape)

```typescript
interface SkillRecord {
  _id: Id<"skills">;
  _creationTime: number;
  userId: string;
  slug: string;
  name: string;
  description: string;
  entrypoint: string;
  tagNames: string[];
  searchText: string;
  pinned: boolean;
  favorited: boolean;
  usageCount: number;
  lastUsedAt?: number;
}
```

### Resource File (Stored Shape)

```typescript
interface ResourceFileRecord {
  _id: Id<"skillFiles">;
  _creationTime: number;
  skillId: Id<"skills">;
  path: string;
  content: string;
}
```

### Skill Input (Creation/Update)

```typescript
interface SkillInput {
  slug?: string;
  name: string;
  description?: string;
  entrypoint: string;
  tags?: string[];
  resourceFiles?: ResourceFileInput[];
}

interface ResourceFileInput {
  path: string;
  content: string;
}
```

### Skill DTO (Query Output)

```typescript
interface SkillDTO {
  slug: string;
  name: string;
  description: string;
  entrypoint: string;
  tags: string[];
  resourceFiles: ResourceFileOutput[];
}

interface SkillDTOv2 extends SkillDTO {
  pinned: boolean;
  favorited: boolean;
  usageCount: number;
  lastUsedAt?: number;
}

interface ResourceFileOutput {
  path: string;
  content: string;
}
```

### User Tag (Replacing Global Tag)

```typescript
interface UserTagRecord {
  _id: Id<"userTags">;
  _creationTime: number;
  userId: string;
  name: string;
}
```

### Skill-Tag Junction

```typescript
interface SkillTagRecord {
  _id: Id<"skillTags">;
  skillId: Id<"skills">;
  tagId: Id<"userTags">;
}
```

### Tag Suggestion Response

```typescript
interface TagSuggestion {
  provided: string;
  suggestions: string[];
}

interface SkillCreateResult {
  skillId: Id<"skills">;
  slug: string;
  tagSuggestions: TagSuggestion[];
}
```

### Error Responses

| Code | Description |
|------|-------------|
| SKILL_NAME_REQUIRED | Name is empty or whitespace-only |
| SKILL_CONTENT_REQUIRED | Entrypoint content is empty or whitespace-only |
| DUPLICATE_SKILL_SLUG | A skill with this slug already exists for this user |
| MAX_SKILLS_EXCEEDED | User has reached the 1000-skill limit |
| INVALID_SLUG | Slug does not match the required format (lowercase alphanumeric + dashes) |
| INVALID_RESOURCE_PATH | Resource file path is absolute, contains "..", is empty, or is a duplicate within the skill |
| RESOURCE_FILE_TOO_LARGE | Resource file content exceeds 100,000 characters |
| TOO_MANY_RESOURCE_FILES | More than 50 resource files in a single skill |
| TOO_MANY_TAGS | More than 50 tags on a single skill |
| TAG_NAME_REQUIRED | Tag name is empty or whitespace-only after normalization |
| TAG_NAME_TOO_LONG | Tag name exceeds 100 characters |
| RLS_VIOLATION | Authenticated user does not own the resource |

### Validation Limits

```typescript
const SKILL_LIMITS = {
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  ENTRYPOINT_MAX_LENGTH: 100_000,
  SLUG_MAX_LENGTH: 200,
  TAG_NAME_MAX_LENGTH: 100,
  MAX_TAGS_PER_SKILL: 50,
  MAX_RESOURCE_FILES: 50,
  RESOURCE_FILE_MAX_LENGTH: 100_000,
  MAX_SKILLS_PER_USER: 1000,
} as const;
```

### Starter Tag Set

```typescript
const STARTER_TAGS = [
  // Original 19 global tags
  "instruction", "reference", "persona", "workflow", "snippet",
  "code", "writing", "analysis", "planning", "design", "data", "communication",
  "review", "summarize", "explain", "debug", "transform", "extract", "translate",
  // Skill-relevant additions
  "automation", "agent", "tool", "deployment", "testing",
  "configuration", "documentation", "integration",
] as const;
```

---

## Non-Functional Requirements

### Performance

- Skill creation completes in under 2 seconds for simple skills (no resource files)
- Skill creation completes in under 5 seconds for skills with up to 20 resource files
- Skill retrieval by slug completes within the same latency envelope as prompt retrieval by slug
- Search and list operations return within 1 second for libraries of up to 1000 skills
- Tag suggestion computation adds less than 200ms to save operations

### Data Integrity

- Skill creation is atomic: if any validation fails, no partial data is written
- Resource file writes are atomic with the skill record (all files succeed or none)
- Tag migration is idempotent: safe to run multiple times without creating duplicates
- Prompt operations remain fully functional throughout and after tag migration
- Search index updates are synchronous (consistent with existing prompt search index)

### Security

- All skill data operations require an authenticated userId
- All skill data is scoped to the authenticated user via index-level filtering and RLS assertions
- Skills table has RLS rules matching the prompt table pattern (isOwner for read/insert/modify/delete)
- skillTags junction table follows the same indirect ownership model as promptTags

### Observability

- Skill creation/update/delete operations are logged with the same granularity as prompt operations
- Migration progress is reportable (count of users migrated, tags created)

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. **Storage topology:** Should resource files be stored as a separate Convex table (`skillFiles`) or as an array field on the skill document? A separate table scales better for skills with many files and avoids the 1MB document limit. An array field is simpler for small skills. The data contracts support either implementation.

2. **Tag migration strategy:** Should the migration run as a one-shot internal mutation, a batched migration with cursor-based progress (following the `backfillSearchText` pattern), or an on-demand per-user migration (migrate a user's tags on their first post-migration login)? The epic requires idempotency regardless of strategy.

3. **Tag suggestion algorithm:** The epic specifies prefix matching and close-match detection. The exact algorithm (Levenshtein distance threshold, prefix length threshold, maximum suggestions returned) is a tech design decision. A reasonable starting point: prefix match if the input is a prefix of an existing tag name, or Levenshtein distance <= 2 for tags of similar length.

4. **Prompt-tag junction migration:** When updating promptTags from global tag IDs to user-owned tag IDs, should this happen in-transaction with the user tag creation, or as a separate follow-up pass? In-transaction is simpler but may hit Convex mutation size limits for users with many prompts and tags.

5. **Skill search index:** Should skills have their own full-text search index (parallel to the prompt search index), or should a unified search index span both types? Separate indexes are simpler to implement and match the current architecture. A unified index requires a discriminator field.

6. **Slug auto-generation:** What is the exact algorithm for generating a slug from a name and resolving collisions? The simplest approach: slugify the name, check for existence, append "-2", "-3", etc. until a free slug is found. Cap the collision loop to prevent unbounded iteration.

7. **Global tags table disposition:** After migration, should the global `tags` table be deprecated (left in schema but unused) or actively maintained alongside `userTags`? The safest path is to leave it in place and stop writing to it, removing it in a later cleanup pass.

---

## Recommended Story Breakdown

### Story 1: Skill Entity & CRUD Operations

**Delivers:** Skills table schema, skillFiles table schema, skill creation/retrieval/update/delete at the model layer, validation rules, slug auto-generation, searchText construction, ranking integration, RLS rules for skills.
**Prerequisite:** None
**ACs covered:**
- AC-1.1 (minimal creation)
- AC-1.2 (slug auto-generation)
- AC-1.3 (field validation)
- AC-1.4 (per-user limit)
- AC-1.5 (resource files)
- AC-1.6 (ranking field defaults)
- AC-1.7 (searchText)
- AC-2.1 (get by slug)
- AC-2.2 (list ranked)
- AC-2.3 (search)
- AC-2.4 (resource file retrieval)
- AC-3.1 (metadata update)
- AC-3.2 (entrypoint update)
- AC-3.3 (resource file add/remove)
- AC-3.5 (delete)
- AC-3.6 (flags and usage tracking)

### Story 2: User-Scoped Tags & Suggestion

**Delivers:** userTags table schema, skillTags junction table schema, user tag creation on save, tag normalization, tag suggestion on save (prefix + close match), tag listing per user, shared tag namespace for skills and prompts.
**Prerequisite:** None (can run in parallel with Story 1 if the tag interface contract is agreed up front)
**ACs covered:**
- AC-4.1 (user-scoped tags)
- AC-4.2 (tag suggestions)
- AC-4.3 (shared between skills and prompts)
- AC-4.4 (no dimension field)
- AC-3.4 (skill tag update semantics)

### Story 3: Tag Migration

**Delivers:** Migration internal mutation to create user-owned tags from global tags for existing users, update promptTags junction references, new user seeding on account creation, idempotency guarantees.
**Prerequisite:** Story 2 (userTags table must exist)
**ACs covered:**
- AC-5.1 (existing user migration)
- AC-5.2 (prompt junction update)
- AC-5.3 (new user seeding)
- AC-5.4 (starter tag set)

### Story 4: Prompt-Tag Integration Update

**Delivers:** Update prompt model layer to use userTags instead of global tags for tag validation on save. Update prompt tag suggestion to use the same suggestion logic as skills. Ensure all prompt operations continue to pass existing tests.
**Prerequisite:** Story 2, Story 3
**ACs covered:**
- AC-4.3 (prompt side of shared tags)
- AC-5.5 (prompt operations unaffected)

---

## Validation Checklist

- [ ] User Profile has all four fields (Primary User, Context, Mental Model, Key Constraint)
- [ ] Feature Overview present
- [ ] Scope has In Scope, Out of Scope, and Assumptions table
- [ ] 5 flows covering creation, retrieval, update/delete, tag evolution, and tag migration
- [ ] Every AC is testable (no vague terms like "appropriate" or "properly")
- [ ] Every AC has at least one TC in Given-When-Then format
- [ ] TCs cover happy path, edge cases, and error handling
- [ ] Data contracts are fully typed TypeScript interfaces
- [ ] Error responses have specific codes and descriptions
- [ ] Validation limits are explicit constants
- [ ] Non-functional requirements cover performance, data integrity, security, and observability
- [ ] Tech design questions separate implementation decisions from functional spec
- [ ] Story breakdown covers all ACs with clear sequencing
- [ ] Existing prompt operations explicitly preserved (AC-5.5)
- [ ] Skills and prompts coexist without interference
- [ ] Tag evolution covers both new users and existing users
- [ ] Resource file paths validated to prevent traversal
- [ ] Ranking model applies to skills consistently with prompts
