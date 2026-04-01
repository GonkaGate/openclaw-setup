# Architecture Hard Anchors

Use this reference when the draft review turns on exact architecture boundary
semantics rather than on broad architecture shape alone.

These anchors are the compact "hard skill" layer for the base architecture
pass. Use them when they materially change the verdict, not as a substitute
for the shared architecture research.

## Publication Surface And Import Boundaries

- Package `"exports"` maps are not packaging trivia.
  They define the stable public entrypoints of a module or package.
- A design that normalizes barrel-heavy or deep-import access for convenience
  may be weakening the publication surface, not just changing file
  organization.
- In Node ESM graphs, barrel and deep-import sprawl can create real cycle and
  refactor hazards.
  "We can clean this up later" is not a neutral assumption if the proposal
  relies on unstable internals.

## Composition Root And Dependency Publication

- Composition root should stay the single place that loads config, creates
  infrastructure clients, assembles the dependency bag, and starts the app.
- New dependencies should be published from composition root downward.
  If a design creates or discovers dependencies inside service modules, that
  is an architecture change, not harmless wiring.
- A DI container or service locator visible throughout the app hides
  dependencies and weakens seams, even if the runtime still works.
  Container access outside composition root is a real design smell, not just a
  style preference.

## Transport, Contract, And Service Separation

- `FastifyRequest`, `FastifyReply`, HTTP status details, and route schemas
  belong to the transport boundary.
  If they leak into the service layer, the design is transport-contaminated.
- Shared shapes across transport and app should move through a neutral DTO or
  contract module.
  Making app logic depend directly on Fastify modules is not the same thing as
  reusing a contract.

## Config, Error, And Logging Boundaries

- Scattered `process.env` reads are hidden dependencies.
  A design that lets modules "read env when needed" is proposing config
  leakage, not convenience.
- Error translation to HTTP belongs at the transport boundary.
  Deep `reply.code(...)` usage or HTTP-shaped errors inside services is a
  design flaw unless the module truly owns transport.
- Logger access should come through dependency bag or request-scoped context.
  A global logger singleton weakens seams and obscures request-context
  ownership.

## Runtime-Correct Module Baseline

- `moduleResolution` is architecture when Node runs the emitted graph directly.
  A proposal that assumes bundler-style import behavior while deploying plain
  Node ESM may be run-wrong even if TypeScript passes.
- ESM baseline consistency is part of architecture, not tooling trivia.
  Import-graph choices that only work under one build mode are design facts
  the review should call out when the proposal depends on them.

## Review Rule

Load this file only when one of these facts changes the verdict.
If the same conclusion stands without exact architecture invariants, prefer the
lighter references.
