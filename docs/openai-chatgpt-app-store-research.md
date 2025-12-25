# OpenAI ChatGPT App Store Research

**Date:** 2025-12-17
**Source:** OpenAI Developer Documentation
**Status:** App submissions now open (announced today)

---

## Executive Summary

OpenAI announced on December 17, 2025 that developers can now submit apps for review and publication in ChatGPT. Apps extend ChatGPT conversations by bringing in new context and letting users take actions. First approved apps will begin rolling out in the new year.

---

## Key Announcements

### What's New
- **App submissions now open** for review and publication
- **App directory** available inside ChatGPT at chatgpt.com/apps
- **Deep links** available for developers to send users directly to their app page
- Apps can be triggered via @ mention, tools menu, or proactive suggestions

### Monetization (Current State)
- **Physical goods only** - can link out to external websites/apps for transactions
- **NO digital goods** - subscriptions, digital content, tokens, credits NOT allowed
- Future: exploring additional monetization options including digital goods

### Technical Foundation
- Built on **MCP (Model Context Protocol)** servers
- **Apps SDK** now in beta
- Open-source resources:
  - [Example apps](https://github.com/openai/openai-apps-sdk-examples)
  - [UI library](https://github.com/openai/apps-sdk-ui)
  - [Figma components](https://www.figma.com/community/file/1560064615791108827)

---

## App Requirements

### Must-Have Qualities
1. **Clear purpose** - functionality not natively supported by ChatGPT
2. **Reliability** - predictable, accurate, low latency
3. **Complete** - no trials or demos accepted
4. **General audience** - suitable for ages 13+
5. **Privacy policy** - required with every submission

### Prohibited Content
- Adult content, gambling, illegal drugs
- Tobacco/nicotine, weapons
- Counterfeit goods, malware
- Digital goods sales (for now)
- Advertising or apps that are primarily ad vehicles
- PHI (Protected Health Information)
- PCI data, government IDs, credentials

### What Makes Apps Get Rejected
- Unclear tool descriptions
- Incorrect action labels (read vs write)
- Requesting unnecessary data
- Missing test credentials for authenticated apps
- Incomplete or demo-quality submissions

---

## UX Principles (Critical for Approval)

### Core Philosophy
> "An app should do at least one thing BETTER because it lives in ChatGPT"

### Three Value Propositions
1. **Conversational leverage** - natural language unlocks workflows traditional UI cannot
2. **Native fit** - feels embedded, seamless handoffs between model and tools
3. **Composability** - small, reusable actions model can mix with other apps

### Design Principles

#### 1. Extract, Don't Port
- Don't mirror your full website
- Identify atomic actions that can be extracted as tools
- Minimum inputs/outputs needed for model to act

#### 2. Design for Conversational Entry
- Support open-ended prompts ("Help me plan...")
- Support direct commands ("Book the room Thursday at 3pm")
- Support first-run onboarding

#### 3. Design for ChatGPT Environment
- Use UI selectively to clarify actions, capture inputs, present results
- Skip ornamental components
- Lean on conversation for history, confirmation, follow-up

#### 4. Optimize for Conversation, Not Navigation
- Model handles state management and routing
- Your app supplies: clear actions, concise responses, follow-up suggestions

#### 5. Embrace the Ecosystem
- Accept rich natural language instead of form fields
- Personalize with conversation context
- Compose with other apps when it saves user time

### Pre-Publish Checklist (All Must Be YES)
- [ ] Does at least one capability rely on ChatGPT's strengths?
- [ ] Does app provide value users cannot achieve without it?
- [ ] Are tools atomic, self-contained, explicit inputs/outputs?
- [ ] Would replacing widgets with plain text degrade experience?
- [ ] Can users finish one meaningful task without leaving ChatGPT?
- [ ] Does app respond quickly enough for chat rhythm?
- [ ] Is it easy to imagine prompts that would select this app?
- [ ] Does app take advantage of platform behaviors?

### Anti-Patterns to Avoid
- Long-form or static content (use a website)
- Complex multi-step workflows
- Ads, upsells, or irrelevant messaging
- Surfacing sensitive/private info in cards
- Duplicating ChatGPT system functions

---

## UI Guidelines

### Display Modes

#### 1. Inline Cards
- Single-purpose widgets in conversation
- Quick confirmations, simple actions, visual aids
- Max 2 primary actions at bottom
- No nested scrolling
- No deep navigation or multiple views

#### 2. Inline Carousel
- 3-8 items for scannability
- Each item: image, title, 2-3 lines metadata max
- Single optional CTA per item
- Good for: restaurants, playlists, events, products

#### 3. Fullscreen
- Rich tasks that can't fit in a card
- Explorable maps, editing canvases, detailed browsing
- ChatGPT composer remains overlaid
- Design UX to work WITH system composer

#### 4. Picture-in-Picture (PiP)
- Persistent floating window
- For games, live collaboration, quizzes, learning
- Must respond to chat input
- Close automatically when session ends

### Visual Design Rules

#### Color
- Use system colors for text, icons, dividers
- Brand accents on logos, icons, primary buttons only
- No custom gradients breaking minimal look

#### Typography
- Inherit system font stack (SF Pro / Roboto)
- Prefer body and body-small sizes
- No custom fonts, even in fullscreen

#### Spacing
- Use system grid spacing
- Consistent padding, no cramming
- Respect corner radius consistency

#### Accessibility
- WCAG AA contrast minimum
- Alt text for all images
- Support text resizing

---

## Tool Design (MCP)

### Tool Names
- Human-readable, specific, descriptive
- Plain language verbs (e.g., `get_order_status`)
- No promotional language (`best`, `official`, `pick_me`)

### Tool Descriptions
- Explain purpose clearly and accurately
- Must not favor/disparage other apps
- Must not recommend overly-broad triggering

### Tool Annotations (Critical!)
- `readOnlyHint` - only retrieves data, no changes
- `openWorldHint` - interacts with external systems
- `destructiveHint` - creates, updates, deletes
- **Incorrect annotations = common rejection cause**

### Tool Inputs
- Minimum information necessary
- No full conversation history "just in case"
- No precise location (use coarse geo from system)

---

## Good App Examples

Apps that work well:
- **Booking a ride** - conversational, time-bound, clear CTA
- **Ordering food** - clear action, visual summary
- **Checking availability** - quick lookup, structured response
- **Tracking delivery** - status update, visual progress

Apps that DON'T work:
- Replicating long-form website content
- Complex multi-step workflows requiring navigation
- Advertising vehicles
- Static frames with no meaningful interaction

---

## Submission Process

1. Build with Apps SDK (MCP server)
2. Test thoroughly (stability, responsiveness, low latency)
3. Prepare:
   - MCP connectivity details
   - Testing guidelines
   - Directory metadata
   - Country availability settings
   - Privacy policy
   - Test credentials (for authenticated apps)
4. Submit via [OpenAI Platform Dashboard](https://platform.openai.com/apps-manage)
5. Track approval status in dashboard
6. First approved apps roll out in new year

---

## Strategic Observations

### Opportunity Signals
- First-mover advantage in new ecosystem
- Physical goods commerce enabled
- Conversational entry point is unique value prop
- Composability with other apps is a differentiator

### Constraints to Work Within
- No digital goods (yet) - limits SaaS plays
- Must be general audience (13+)
- No PHI - limits healthcare apps significantly
- Quality bar is high - no demos, must be complete

### Questions for Brainstorming
1. What workflows start in conversation naturally?
2. What can we do BETTER because we have conversational context?
3. What atomic actions would users @ mention us for?
4. How do we create value with physical goods linkout?
5. What's our unique data or capability ChatGPT doesn't have?
