# Scope And Handoffs

Use this reference when the review starts drifting outside the exact seam of
TypeScript soundness, safety, and boundary clarity.

## This Skill Owns

Own the question:

- "Does the current type story prove what it claims?"

That includes:

- trust conversion from untrusted input to trusted internal data
- internal model invariants such as impossible states and mixed identifiers
- helper compositions that may erase or overstate shape
- strict-mode language semantics that materially change a safety verdict
- exported type surfaces that promise guarantees to consumers

## Hand Off To Neighbor TS Review Skills

- `typescript-idiomatic-review`
  when the main issue is payoff, readability, maintainability, or local code
  shape and the code may still be sound
- `typescript-language-simplifier-review`
  when the main issue is deleting helper or language complexity without
  changing the guarantees

## Hand Off To TS Design Skills

- `typescript-advanced-type-modeling`
  when the main task is inventing a better internal model, not reviewing the
  current one
- `typescript-runtime-boundary-modeling`
  when the main task is designing where the parser or trust boundary should
  live
- `typescript-public-api-design`
  when the main task is choosing a better exported surface rather than
  reviewing whether the current public surface is honest
- `typescript-modeling-spec`
  when the task is to plan the TS modeling choices before implementation

## Hand Off Outside The TS Composite

- `api-contract-review`
  when the real problem is HTTP or OpenAPI contract truth
- runtime, framework, or data specialists
  when the TS issue is only fallout from a deeper non-TS behavior problem

## Confusion Pairs

- `unsafe` versus `ugly`
  this skill owns the first, not the second
- `missing parser proof` versus `bad contract design`
  this skill owns the first, not the second
- `helper hides a false claim` versus `helper is overcomplicated`
  this skill owns the first; simplification review owns the second
- `exported type overpromises` versus `public API could feel nicer`
  this skill owns the first; public API design owns the second
