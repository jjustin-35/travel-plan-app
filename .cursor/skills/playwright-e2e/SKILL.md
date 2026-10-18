---
name: playwright-e2e
description: >-
  Authors Playwright E2E tests from a confirmed feature spec, or from the
  branch diff when no spec exists. Drafts the E2E plan for user confirmation
  before writing tests. Use when the user asks for Playwright E2E, automated
  E2E, e2e tests, or 自動化 E2E.
---

# Playwright E2E

Write Playwright end-to-end tests for this repo. Plan first; write tests only after the case list is confirmed.

## When to use

The user asks for Playwright / automated E2E tests, or feature-development step 4 points here for automation.

## Source of cases (priority)

1. Confirmed spec at `spec/<FEATURE-SLUG>.md` — use its Scope summary, Prerequisites, E2E test cases, and Negative / edge cases.
2. If no matching spec: derive scope from the branch diff, draft the plan in the format below, show it to the user, and **stop**. Do not write test code until the user confirms.

When the user's latest instructions conflict with the spec or draft plan, list the conflicts and stop.

## Branch diff (no-spec path)

Compare the current branch to the default base (`main` or `master`):

```bash
git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main
git diff --stat <base>...HEAD
git log --oneline <base>...HEAD
```

Infer affected routes, UI flows, and APIs from the diff. Do not invent product behavior that the diff does not support. Mark unknowns as *TBD*.

## Plan format (required)

Always present (or reuse from the spec) this structure before coding tests when there is no confirmed spec. When a spec already has these sections, reuse them; do not rewrite unless the user asks.

```markdown
## Scope summary
- [Affected app(s), key paths under repo]

## Feature / behavior summary
- [2–4 bullets, user-facing]

## Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: [specifics or *TBD* with questions]

## E2E test cases

### TC-01 — [short title]
1. [Navigate / open …]
2. [Action …]
**Expected:** [observable result]

### TC-02 — …
…

## Negative / edge cases (optional)
- …
```

Done with planning when the user has confirmed the cases (or a confirmed spec already contains them).

## Playwright setup

If Playwright is not installed in the repo yet:

1. Add `@playwright/test` as a dev dependency and create `playwright.config.ts`.
2. Default `testDir`: `e2e/`.
3. `baseURL`: `http://localhost:3000` (or `NEXT_PUBLIC_APP_URL`).
4. Prefer `webServer` in config to run `npm run dev` for local runs when appropriate.
5. Add npm scripts, e.g. `test:e2e` → `playwright test`, `test:e2e:ui` → `playwright test --ui`.
6. Install browsers with `npx playwright install` when needed.

Match existing repo conventions if a Playwright setup already exists; do not duplicate config.

## Writing tests

After confirmation:

1. Map each `TC-xx` to one test (or a clearly named `test.describe` group). Keep titles aligned with the plan (`TC-01 — …`).
2. Put specs under `e2e/` (e.g. `e2e/<feature-slug>.spec.ts`).
3. Prefer user-facing selectors: `getByRole`, `getByLabel`, `getByText`. Avoid brittle CSS/XPath tied to styling.
4. Assert **Expected** outcomes from the plan; do not weaken assertions to get green.
5. Isolate auth/test data via env or documented fixtures; never hardcode secrets from `.env.local` into the repo. Use `.env.example` / test env vars and mark missing credentials as blockers.
6. Cover optional negative / edge cases when they are in the confirmed plan.
7. Run the new tests and fix failures caused by the tests (selectors, waits). If the product is wrong, report it; do not silently change product code unless the user asks.

## Done when

- Confirmed plan exists (spec or user-approved draft), and
- Playwright tests for those cases are written under `e2e/`, and
- Tests were executed; pass/fail or blockers are reported to the user.
