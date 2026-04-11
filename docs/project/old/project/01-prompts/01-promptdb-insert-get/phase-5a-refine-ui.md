# Phase 5a: Refine UI (Visual Iteration)

**Type:** Spike / Exploratory
**Model:** Opus with `/frontend-design` skill
**Branch:** `ui-refinement`

---

## Starting Prompt

```
Load /frontend-design skill.

We're iterating on UI layout and polish for the prompts interface. The Phase 4 implementation is functionally complete but visually broken - layout and design polish was lost during implementation.

## Key Files

Templates:
- src/ui/templates/shell.html (outer chrome, header, iframe container)
- src/ui/templates/prompts.html (prompts list module)
- src/ui/templates/prompt-editor.html (create form)

CSS:
- public/shared/themes/base.css (tokens, resets)
- public/shared/themes/modern-dark.css (theme)

Docs:
- docs/ui-architecture.md (shell + module pattern)

## Your Mandate

1. Iterate visually with my feedback until the UI looks polished and usable
2. You have freedom to make API changes (new fields, new endpoints) if needed for the UI
3. Keep behavioral tests passing: `bun run test:service`
4. Run quality gates periodically: `bun run format && bun run lint && bun run typecheck`
5. Commit incrementally so changes are recoverable

---

Start by showing me the current state of /prompts in the browser so we can assess what needs fixing.
```

---

## Notes

- This is exploratory "spike" work - iterate freely, discover what's needed
- Don't worry about TDD during iteration - tests come in Phase 5b
- When visually satisfied, hand off to Phase 5b for hardening
