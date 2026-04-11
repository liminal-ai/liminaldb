# Phase 4: Prompt UI

**Epic:** 01-promptdb-insert-get
**Status:** Draft
**Created:** 2025-01-03

---

## Story

> As an authenticated user, I want to view and create prompts through a web UI so that I can manage my prompt library without using the API directly.

---

## User Flows

### F1: Access & Authentication
User navigates to `/prompts`. If not authenticated, they are redirected to login. After OAuth completes, they return to `/prompts`.

### F2: Browse & View Prompts
User sees their prompts listed in sidebar. They click a prompt to view its full content in the main area. They can search to filter the list.

### F3: Create Prompt
User clicks "New Prompt", which loads the editor module. They fill out the form (slug, name, description, content, tags) and save. The new prompt appears in their list.

---

## Acceptance Criteria

### F1: Access & Authentication
| ID | Criterion |
|----|-----------|
| AC-1.1 | Unauthenticated user is redirected to `/auth/login` |
| AC-1.2 | After OAuth, user returns to `/prompts` with session |
| AC-1.3 | Authenticated user sees the prompts view |

### F2: Browse & View Prompts
| ID | Criterion |
|----|-----------|
| AC-2.1 | User's prompts are listed in sidebar on page load |
| AC-2.2 | Clicking a prompt shows its content in main area |
| AC-2.3 | Search filters the prompt list (server-side, temporary*) |
| AC-2.4 | Copy button copies prompt content to clipboard |

*\*AC-2.3 Note: Server-side search is a temporary implementation with known limitations (filters after fetch, not true typeahead). Will be replaced in Feature 4 (Search). Testing is minimal for this criterion.*

### F3: Create Prompt
| ID | Criterion |
|----|-----------|
| AC-3.1 | "New Prompt" loads the editor module |
| AC-3.2 | Submitting valid form creates prompt and updates list |
| AC-3.3 | Validation errors are shown to user |
| AC-3.4 | Duplicate slug error is shown to user |

---

## Test Conditions

### TC-1: Authentication (F1)
| ID | Test | Verifies |
|----|------|----------|
| TC-1.1 | GET `/prompts` without cookie → 302 to `/auth/login` | AC-1.1 |
| TC-1.2 | GET `/prompts` with valid cookie → 200 HTML | AC-1.3 |
| TC-1.3 | OAuth callback sets cookie, redirects to `/prompts` | AC-1.2 |

### TC-2: List & View (F2)
| ID | Test | Verifies |
|----|------|----------|
| TC-2.1 | GET `/api/prompts` returns user's prompts | AC-2.1 |
| TC-2.1b | GET `/api/prompts?q=` passes query to Convex | AC-2.3 |
| TC-2.1c | GET `/api/prompts` without auth returns 401 | AC-2.1 |
| TC-2.2 | Page load fetches and renders prompt list | AC-2.1 |
| TC-2.3 | Click prompt item → content displayed | AC-2.2 |
| TC-2.4 | Type in search → API called with query param | AC-2.3 (minimal) |
| TC-2.5 | Click copy → content in clipboard, toast shown | AC-2.4 |

### TC-3: Create (F3)
| ID | Test | Verifies |
|----|------|----------|
| TC-3.1 | Click "New Prompt" → editor module loads | AC-3.1 |
| TC-3.2 | POST `/api/prompts` with valid data → 201 | AC-3.2 |
| TC-3.3 | Submit valid form → returns to prompts, list refreshed | AC-3.2 |
| TC-3.4 | Submit invalid slug → error shown | AC-3.3 |
| TC-3.5 | POST `/api/prompts` duplicate slug → 409, error shown | AC-3.4 |

---

## Decisions

1. **UI Test Approach:** Vitest + jsdom for DOM interaction tests (TC-2.2 through TC-3.5)
2. **Search:** Server-side `?q=` param (temporary implementation, replaced in Feature 4)

---

## Definition of Done

- [ ] POC templates deleted, new templates implemented per spec
- [ ] All TC-1, TC-2, TC-3 tests passing
- [ ] `GET /api/prompts` has test coverage
- [ ] Auth gate on `/prompts` working
- [ ] Routes structured: `/prompts`, `/prompts/new`, `/_m/*`
- [ ] UI renders prompts from API
- [ ] Create prompt works end-to-end
- [ ] Passes lint, typecheck, format
- [ ] Merged to main via PR
