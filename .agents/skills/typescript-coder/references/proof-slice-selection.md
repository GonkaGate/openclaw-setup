# Proof Slice Selection

Choose the smallest proof that exercises the changed risk, not the broadest
test you can imagine.

## Quick Mapping

- local branching, narrowing, mapping, or helper behavior
  - prefer a tight unit test or existing focused test update
- route schema, validation, serialization, hook, or in-process handler behavior
  - prefer a route-level or `app.inject()` proof slice
- service behavior with simple collaborator contracts
  - prefer a focused service test with explicit doubles
- transaction, `Decimal`, query-shape, Redis TTL/Lua/guard, or other real state
  semantics
  - local proof is usually not enough; activate `vitest-qa` if proof must be
    convincing
- purely structural refactor with no changed behavior
  - no new test may be acceptable, but the summary must say what remains
    unproven

## Activate `vitest-qa` When

- the honest proof layer is non-obvious
- the change depends on realistic Fastify wiring or harness shape
- correctness depends on real Postgres or Redis behavior
- determinism or cleanup is part of whether the proof can be trusted

## Reject These Low-Signal Proof Moves

- tests that mirror private helper structure instead of the changed risk
- broad snapshots with unclear contract value
- integration breadth when one smaller layer proves the same thing
- claiming readiness from type-checking alone when runtime behavior changed
