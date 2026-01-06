# Phase 5b: Harden & Integrate (Stabilization)

**Type:** Stabilization / TDD Retrofit
**Model:** Opus (planner/orchestrator)
**Branch:** `ui-refinement` (continuing from 5a)

---

## Starting Prompt

```
You are stabilizing exploratory UI work from Phase 5a. The visual iteration is complete, but changes were made without full TDD rigor. Your job is to harden and integrate those changes properly.

## Context

- Branch: `ui-refinement`
- Phase 5a made visual improvements and possibly API changes
- A scratch list of non-CSS changes should exist (API changes, behavior changes)
- Tests may be missing or out of sync

## Your Tasks

1. **Audit the diff** - Review all changes from main to current HEAD
2. **Identify behavioral changes** - What's new/different beyond CSS?
3. **Write missing tests** - For each behavioral change:
   - Service tests for new API endpoints or changed responses
   - UI service tests for new interactions
   - Integration tests if new flows exist
4. **Align with architecture** - Ensure changes follow existing patterns:
   - Route registration pattern in src/routes/
   - Model functions in convex/model/
   - Proper typing and validation
5. **Run full quality gates**:
   ```bash
   bun run format
   bun run lint
   bun run typecheck
   bun run test:service
   ```
6. **Prepare PR** - Clean commit history, comprehensive description

## Reference Documents

- docs/ui-architecture.md - UI patterns
- docs/epics/01-promptdb-insert-get/phase-4-tech-design.md - API patterns
- tests/service/ui/setup.ts - UI test utilities
- tests/integration/ - Integration test patterns

---

Start by running `git diff main --stat` to see what changed, then audit the changes systematically.
```

---

## Notes

- This phase retrofits TDD rigor onto exploratory work
- Every behavioral change needs a test
- CSS-only changes don't need tests
- Use senior-engineer agent for implementation tasks
- Final PR should look like proper TDD work (tests + implementation together)
- If scratch list is missing, reconstruct it from the diff
