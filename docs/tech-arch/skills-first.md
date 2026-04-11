# Skills-First Technical Architecture

High-level technical architecture for the first skills-focused release of LiminalDB. This document shapes scope and later design work. It does not define implementation-level algorithms, schemas, or file-by-file plans.

## Purpose

The first skills release extends LiminalDB from a prompt-centered system into a skills-centered system without turning it into a hosted runtime or browser IDE.

The technical architecture must support:

- chat-native skill capture
- cross-surface skill retrieval
- structured multi-file skill storage
- web-based library management
- packaging and export

The architecture must explicitly avoid promising:

- hosted script execution
- hosted eval workspaces
- full code editing in the browser

## System Baseline

The first skills release builds on the current LiminalDB stack:

- **Runtime:** Bun
- **HTTP/API layer:** Fastify
- **Database:** Convex
- **Ephemeral/cache layer:** Redis
- **Auth:** WorkOS AuthKit + JWT validation
- **Cross-surface protocol:** MCP
- **Current web UI:** shell + portlet architecture

This is an extension of the current platform, not a replacement architecture.

## Product Boundary

The first skills release is a storage, capture, retrieval, and management system.

It is not:

- a hosted sandbox
- a code execution environment
- a benchmark or eval platform
- a browser-based IDE
- a public distribution marketplace

This boundary is important because skill artifacts may contain scripts, but the product does not execute those scripts in this release.

## Architectural Goals

### 1. Preserve Cross-Surface Capture

The system should make it possible to capture a skill from the surface where the user is already working.

That means the first-release architecture must support:

- MCP save flows in model-native surfaces
- CLI save flows in shell-access surfaces
- web-based follow-up management after capture

### 2. Treat Skills as Structured Artifacts

Skills are not just prompt records with a larger text field. The system should support a structured multi-file model.

The architecture should support:

- required `SKILL.md`
- optional `scripts/`
- optional `references/`
- optional `assets/`
- metadata for retrieval, organization, timestamps, and usage

### 3. Support a Simple-to-Advanced Progression

The first capture path should optimize for simple skill drafts. The same storage model must still support richer skills later.

That means the architecture should support:

- lightweight `SKILL.md`-first capture
- later addition of progressive disclosure resources
- exportable artifact sets without data-model redesign

## Core Components

### Clients

The first release supports three first-class client surfaces:

- **MCP clients**
  - primary chat-native capture and retrieval path
- **CLI client**
  - fallback path where MCP is unavailable but shell execution is available
- **Web app**
  - browse, manage, refine, and export the personal skill library

The architecture should treat these as different access surfaces over the same skill system.

### Fastify Application Layer

Fastify remains the request boundary for:

- auth enforcement
- MCP routing
- CLI-facing API access
- web-serving and web API routes
- packaging/export endpoints

Fastify is still the correct boundary because it already owns:

- protocol mediation for MCP
- authentication transformation
- same-origin web serving

### Convex Data Layer

Convex remains the source of truth for user-scoped structured data.

For the first skills release, Convex should evolve from prompt-centric entities toward a skills-capable model that can represent:

- skill metadata
- entrypoint content
- grouped skill files/resources
- retrieval fields
- usage and ranking signals

This model should support both simple skill drafts and richer multi-file skills without forcing the same authoring complexity on every user.

### Redis

Redis remains useful for ephemeral state and short-lived edit support where needed, but it is not the source of truth for the skill library itself.

Likely first-release uses:

- draft persistence for in-progress edits
- short-lived capture or management state

## Skills-First Data Model Direction

The exact schema belongs in later design, but the high-level model should separate:

- **skill identity and metadata**
- **skill entrypoint**
- **skill resources/files**

The minimum conceptual model is:

- skill record
  - id, owner, name, slug, description
  - tags/topics
  - created/updated metadata
  - usage metadata
- entrypoint
  - `SKILL.md`
- resource set
  - typed logical files under `scripts/`, `references/`, and `assets/`

The architecture should preserve file structure and resource paths so exported skills remain portable.

## Retrieval Architecture

The first release should support skill retrieval through combined signals rather than a single search mode.

High-level retrieval signals:

- keyword matching
- semantic/vector matching
- tags/topics
- optional ranking signals such as recency or usage

The architecture should support:

- single best match when confidence is strong
- shortlist returns when confidence is lower
- the same retrieval model across MCP, CLI, and web surfaces

The exact ranking formula, vector implementation, and fallback ordering belong in later design work.

## Packaging and Export

Packaging/export is a core first-release capability because stored skills must remain portable outside LiminalDB.

The architecture should support:

- reconstructing a skill as a portable directory structure
- packaging for download/export
- preserving `SKILL.md` and all stored resources in export output

This capability should work for both simple and advanced skills.

## Auth Approach

WorkOS remains the primary auth system for interactive product use.

First-release auth posture:

- OAuth-based interactive access for web and MCP-connected users
- CLI uses the same core auth model rather than inventing a parallel identity system

API-key support may become useful later for automation or advanced workflows, but it should be treated as an adjacent or future capability unless first-release implementation proves it is required.

## Access Surface Roles

### MCP

MCP is the primary chat-native integration point.

Primary jobs in this release:

- save skill draft
- retrieve skills
- list/search skills
- update skill metadata or core content when appropriate

### CLI

CLI is the fallback path where users can run commands but cannot configure or rely on MCP.

Primary jobs in this release:

- authenticate
- save or update skill drafts
- retrieve/search skills
- export/package on demand

### Web

The web app is the management surface rather than the center of first-use value.

Primary jobs in this release:

- browse and search the library
- refine skills after capture
- manage metadata and files
- export/package skills

## Tradeoff: Storage and Retrieval Now, Execution Later

The central architectural tradeoff in this release is deliberate:

- **What the product does now:** store, capture, retrieve, and manage skills
- **What the product does later:** execute scripts, run eval workspaces, and host inference-heavy orchestration

This tradeoff keeps the first release aligned with the most common current skill pattern, which is still predominantly markdown-first, while preserving room for richer skills as stored artifacts.

## Script-Bearing Skills

The system should support script-bearing skills structurally:

- preserve their files
- surface them in management views
- return them through retrieval flows
- package and export them cleanly

The system should not imply in this release that:

- scripts can be executed in the product
- script correctness is validated in the product
- evals for those scripts can run in the product

Execution and validation remain the responsibility of the current tool surface or future products.

## Fast Follow Architecture Areas

These capabilities should be anticipated, but not treated as required for the first release:

### Import

- import from packages or external repositories
- normalize imported skills into the same internal artifact model

### Sync

- retain upstream source metadata
- support update pulls from external sources

### Scan and Trust Signals

- attach scan state or trust metadata to stored skills
- surface warnings or trust labels in management and retrieval flows

These should remain separable modules so their addition does not require re-architecting the first-release core.

## Explicit Non-Goals

The first skills release should not depend on:

- hosted script execution
- hosted eval or benchmark infrastructure
- full browser-based code editing
- embedded MCP UI as a primary workflow
- public publishing and marketplace mechanics

## Validation Checklist

- [ ] Architecture stays focused on the first skills release
- [ ] Core value remains capture + retrieve + manage
- [ ] MCP + CLI + web are all represented as first-release surfaces
- [ ] Script-bearing skills are supported as stored artifacts only
- [ ] Import/sync/scan are visible but clearly fast-follow
- [ ] The document stays above implementation-level tech design detail
