---
name: feature-development
description: >-
  Plans and implements a new feature in order: write a spec, add failing unit
  tests, implement until tests pass, run localhost E2E, then draft a PR
  description. Use when the user asks to develop a feature or 新功能 and
  provides a requirements document, pasted requirements, or a direct
  description. Do not use for bugfixes, small changes, or refactors.
---

# Feature development

Orchestrator skill. Run the steps below in order. For each step that names another skill, read and follow that skill. Do not duplicate its instructions here.

## When to use

The user asks to develop a feature or 新功能, and provides a requirements document, pasted requirements text, or a direct description.

Do not use this workflow for bugfixes, small changes, or refactors.

## Resume

When the feature's spec already exists, continue from the step the user names. Do not rewrite the spec.

Spec path: `spec/<FEATURE-SLUG>.md`

## Input priority

The user's latest instructions > provided requirements document or text. When these conflict, list the conflicts and stop. Do not choose a side.

There is no Jira ticket or HLD in this project. Treat the user's requirements document or narrative as the sole product source of truth (subject to the priority above).

## Feature slug

Derive `<FEATURE-SLUG>` as a short kebab-case name from the feature title (e.g. `trip-share-link`). If the user supplies an explicit slug or id, use that instead. One spec file per feature — unless scope highly overlaps an existing spec (see Related specs below).

## Related specs

Before writing a new spec, list and read files under `spec/`. Check whether any existing feature is related or overlapping.

| Situation | Action |
|-----------|--------|
| Related but distinct scope | Create a new `spec/<FEATURE-SLUG>.md`. Plan it using the related specs as context (routes, APIs, UI, auth, data). Add a **Related specs** section linking those files. |
| Scope highly overlaps an existing spec (same page/flow/API surface, incremental behavior) | Do **not** create a new file. Update the existing spec (acceptance criteria, implementation, test plan, etc.). Call out what changed when stopping for confirmation. |

When unsure whether overlap is "high", briefly state the candidates and ask the user before choosing new vs update.

## Steps

### 1. Write the spec

Plan the work from the provided requirements and information, after completing [Related specs](#related-specs).

- **New file:** `spec/<FEATURE-SLUG>.md` — include every template section, including **Related specs** (write `None` if none).
- **Update existing:** edit the matching `spec/<FEATURE-SLUG>.md` in place; keep sections consistent with the template; refresh **Related specs** if links change.

Do not put the spec in the skill folder. Create `spec/` if it does not exist.

Done when the spec is written or updated and you have stopped for the user's confirmation. Do not start step 2 before that confirmation.

### 2. Write unit tests first

Write the unit tests planned in the spec, TDD-style. Cover only the public interface and behaviors the spec already defines.

Tests in this step should fail because the behavior is not implemented yet. Do not change product code. Do not weaken assertions to make tests pass.

Done when the tests map to the spec's acceptance criteria and fail because the feature is not implemented yet.

### 3. Implement the feature

Implement against the spec until the step 2 tests pass. Change those tests only when the spec was wrong, the public interface must change, or a test is unstable.

Done when existing and new unit tests pass.

### 4. E2E

Run the spec's E2E test cases on localhost using the browser tools available in the session (navigate, snapshot, interact, screenshot as needed).

Base URL: `NEXT_PUBLIC_APP_URL` from `.env.local`, or `http://localhost:3000` if unset. Start the app with `npm run dev` if it is not already running.

For automated Playwright coverage, read and follow `.cursor/skills/playwright-e2e/SKILL.md` (after the cases pass or when the user asks for automation).

Done when the manual cases pass, or blockers are recorded. Commit after they pass (follow the project's commit skill / user commit rules). Do not start step 5 before that commit.

### 5. PR description

Produce a paste-ready PR description in Markdown from the committed branch diff and the confirmed spec. Include:

- Summary (1–3 bullets)
- Test plan (unit + the manual cases from the spec)
- Out of scope / known follow-ups if any

Do not push and do not open a PR unless the user asks.

## Spec template

```markdown
# <FEATURE-SLUG> <title>

## Related specs

- `spec/<other-feature>.md` — [why related]
- Or: None

## User Story

## Acceptance criteria

## Out of scope

## Technical choice

Write this section only when a new library is required. Otherwise write "None".

## Implementation

- Features to build
- Expected UI: page location, existing page, how it is presented
- Apps and routes to change

## Feature toggles, APIs, and permissions

Mark unknowns as TBD. Do not invent accounts, keys, or external resources.

## Public interface

Component paths, props, and main behaviors for the unit tests.

## Implementation steps

## Test plan

### Unit test

- [Behaviors / public interfaces to cover]

### Scope summary
- [Affected app(s), key paths under repo]

### Feature / behavior summary
- [2–4 bullets, user-facing]

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: [specifics or *TBD* with questions for QA/PM/backend]

### E2E test cases

#### TC-01 — [short title]
1. [Navigate / open …]
2. [Action …]
**Expected:** [observable result]

#### TC-02 — …
…

### Negative / edge cases (optional)
- …
```
