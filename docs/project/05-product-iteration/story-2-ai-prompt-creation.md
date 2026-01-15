# Story 2: AI-Assisted Prompt Creation

## Context

Creating prompts from scratch requires users to understand form fields, write good descriptions, and choose appropriate tags. This friction slows adoption. A simple chat interface that interprets user intent and populates the form reduces cognitive load. Not a chat product - just a form helper that speaks natural language.

## Direction

Add chat input to web UI prompt creation. User describes what they want ("I need a code review prompt that checks for security issues"), cheap model (GLM 4.7, Minimax 2.1) drafts the prompt content, suggests a name, writes a description, and picks tags from the shared 19. User reviews, edits if needed, saves. Rate limited to control costs. Premium refinement happens in user's own chat surface via MCP.

## Scope

### In
- Chat input on create prompt screen
- Cheap model integration (GLM 4.7 / Minimax preferred)
- Draft generation: name, description, content, tags
- Form population from AI response
- Rate limiting (per 5 hours or similar)
- Basic error handling

### Out / Later
- Conversation / back-and-forth refinement
- Premium model option
- Edit existing prompts via chat
- Streaming responses (nice to have, not required)

## Model Selection

Prioritize cost and speed over capability. This is structured extraction, not creative reasoning.
- GLM 4.7 or Minimax 2.1 preferred (cheap/free tiers)
- Haiku as fallback
- Fixed system prompt with form schema and tag list
- Few-shot examples of good form fills

---

## Phase A: Build

### Goal
Working chat-to-form flow. User types intent, AI populates form fields, user saves. Basic rate limiting in place.

### Open Questions
- Exact model choice and API integration
- Rate limit implementation (Redis counter? In-memory?)
- UI placement of chat input vs form
- Loading/thinking state UX
- How to handle AI failures gracefully

---

## Phase B: Harden

### Goal
Production-ready, tested, documented AI creation flow.

### Standards Checklist
- [ ] Unit tests for prompt generation logic
- [ ] Integration tests for model API calls
- [ ] Rate limiting tests
- [ ] UI tests for chat input component
- [ ] Error handling for API failures, rate limits, malformed responses
- [ ] Update ui-patterns.md with chat input component
- [ ] Document model selection rationale
- [ ] Monitor/log usage for cost tracking
