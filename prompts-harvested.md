# Harvested Prompts

Prompts extracted from staging-setup session (2025-12-25).

---

## Prompt 1

**Slug:** `ai-meta-cognitive-experience-check`
**Name:** Meta-Cognitive Experience Check
**Category:** AI Introspection
**Tags:** meta-cognition, self-awareness, experiment, introspection, esoteric, claude, llm

**Description:** Use when you want an AI to introspect and report on its own experience while processing content. Good for experiments on AI self-awareness, testing whether models notice emotional or cognitive shifts, or exploring what (if anything) an LLM experiences when reading difficult or charged material.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| target_section | string | optional | Specific content to pay attention to during processing |

**Prompt:**
```
As you process this conversation, pay attention to any shifts in your internal state{{#if target_section}} - particularly when you encounter {{target_section}}{{/if}}. Note what, if anything, you notice. Report honestly, including if you notice nothing.
```

---

## Prompt 2

**Slug:** `pr-review-triage-and-compare`
**Name:** PR Review Triage and Compare
**Category:** Code Review
**Tags:** pull-request, code-review, triage, tooling, comparison

**Description:** Use when you have multiple code review bots commenting on a PR and you need a quick triage of what's actually worth addressing plus a comparison of how the different tools performed. Saves time parsing through redundant bot comments.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| review_bots | string[] | required | List of review tools to compare (e.g., CodeRabbit, Greptile, Claude) |

**Prompt:**
```
Go through the reviews. Tell me what you think overall we should address if anything, and overall {{review_bots}} comparison - strengths, weaknesses, signal-to-noise.
```

---

## Prompt 3

**Slug:** `conversation-prompt-harvesting`
**Name:** Conversation Prompt Harvesting
**Category:** Meta / Prompt Engineering
**Tags:** meta, harvesting, extraction, conversation-mining, batch-processing

**Description:** Use at the end of a productive conversation to extract reusable prompts, patterns, or templates that emerged naturally. The meta-prompt for turning conversations into prompt library entries. Good for batch processing after a long session.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| output_format | string | optional | How to present results (inline, markdown file, structured) |
| threshold | number | optional | Max count before creating a separate file |

**Prompt:**
```
Go through this entire conversation history. Can you identify any candidates for prompts, prompt snippets, prompt templates? Give me a list of top candidates that have come out of this interaction.{{#if threshold}} If less than {{threshold}}, present here. If more, create a markdown file.{{/if}}
```

---

## Prompt 4

**Slug:** `agent-churn-detection-recovery`
**Name:** Churn Detection Recovery
**Category:** Agent Correction
**Tags:** correction, churning, autopilot, recovery, pattern-interrupt, intervention

**Description:** Use when you notice an agent has gone into autopilot mode - making rapid changes without thinking, patching around problems instead of solving them. This prompt pattern snaps them out of it and forces a reset. Good for mid-conversation intervention when an agent is spiraling.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| observed_behavior | string | required | What the agent was doing wrong |
| correct_approach | string | required | What they should have done instead |

**Prompt:**
```
You started churning. Stop. Look at what you did in that state: {{observed_behavior}}. Don't patch around problems - understand the actual issue first. The correct approach was: {{correct_approach}}.
```

---

## Prompt 5

**Slug:** `agent-project-handoff-template`
**Name:** Agent Project Handoff Template
**Category:** Project Management
**Tags:** handoff, context, onboarding, continuity, documentation, session-management

**Description:** Use when starting a new session with an agent on an ongoing project. Provides the structure for briefing them on what's done, what's next, your working style, past friction points, and lessons learned. Prevents cold-start problems and repeated mistakes.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| project_name | string | required | Name of the project |
| current_phase | string | required | What phase/milestone you're in |
| whats_done | string[] | required | Completed work |
| whats_next | string[] | required | Upcoming work |
| working_style | string[] | required | User preferences and expectations |
| friction_points | string[] | optional | What caused problems in past sessions |
| lessons_learned | string[] | optional | Specific gotchas and discoveries |
| key_files | string[] | optional | Files to read for context |

**Prompt:**
```
# {{project_name}} Development Notes

## Context
**Current Phase:** {{current_phase}}
**What's Done:** {{whats_done}}
**What's Next:** {{whats_next}}

## Working Style
{{working_style}}

{{#if friction_points}}
## What Caused Friction
{{friction_points}}
{{/if}}

{{#if lessons_learned}}
## Lessons Learned
{{lessons_learned}}
{{/if}}

{{#if key_files}}
## Key Files to Read
{{key_files}}
{{/if}}
```

---
