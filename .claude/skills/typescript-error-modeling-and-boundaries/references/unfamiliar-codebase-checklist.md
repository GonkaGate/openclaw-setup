# Unfamiliar Codebase Checklist

Use this file when the task is to audit or refactor an existing backend rather
than design a new error model from scratch.

## 1. Lock Runtime And Compiler Facts

Check first:

- effective TypeScript strictness and whether caught values are treated as
  `unknown`
- actual Node version and any runtime flags that affect rejection or stack
  behavior
- whether the stack uses native TS execution or transpiled JS

If those facts are unknown, lower confidence on version-sensitive claims.

## 2. Find Stable Identity Or The Lack Of It

Look for:

- `code`, `kind`, or equivalent discriminants
- custom error classes and what fields they actually carry
- whether code branches on `message`, class name, or ad-hoc string literals

Smell:

- `message` is doing machine-contract work

## 3. Map The Real Translation Points

Find where failures change meaning:

- infrastructure adapter -> service or domain
- service or domain -> route, worker, or outer orchestration boundary
- internal error -> `AppError` or caller-facing shape

Smells:

- the same failure gets remapped repeatedly
- raw infrastructure errors leak through multiple layers unchanged
- the same boundary sometimes throws and sometimes returns explicit error
  values for the same reason

## 4. Check Delivery Boundaries

Inspect whether failure can arrive through:

- sync `throw`
- promise rejection
- callback error
- EventEmitter or stream `'error'`

Smells:

- floating promises with meaningful failure paths
- emitter or stream paths with no clear `'error'` strategy
- code that assumes outer `try/catch` covers later async delivery

## 5. Check Signal-Family Consistency

Ask:

- which failures are expected branching outcomes
- which failures are operational
- which failures are programmer bugs or invariant breaks

Smells:

- "not found" or validation failures only as exceptions
- expected domain outcomes mixed with raw infra exceptions in one contract
- `null` or `undefined` hiding several different reasons

## 6. Check Context Preservation

Look for:

- `cause` usage or another consistent cause-preservation mechanism
- caught-value normalization close to the boundary
- wrappers that add real operation context

Smells:

- `catch { return null; }`
- `throw "literal"` or `throw null`
- wrapper pyramids with repeated "Failed to X" text but no new signal

## 7. Check Repo-Local Handoffs

In this repo, verify:

- expected failures inside services or utils stay explicit intentionally rather
  than by accident
- route or handler boundaries are the place where expected failures become
  `AppError`
- final `/v1*` and `/api*` envelope shaping stays in transport or error-handler
  surfaces rather than bleeding into lower layers

## Strong Audit Output

A strong audit answer should leave with:

- the actual boundary map
- the current stable identity mechanism, or proof it is missing
- the main inconsistency or smell cluster
- one or two highest-value fixes, not a broad rewrite wishlist
