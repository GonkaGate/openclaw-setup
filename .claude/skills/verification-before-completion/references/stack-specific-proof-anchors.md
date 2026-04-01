# Stack-Specific Proof Anchors

Use this file when the proof workflow is already clear, but exact stack
semantics could still make a tempting proof set look stronger than it really
is.

This file is intentionally compact. It should sharpen proof choice, not
duplicate the full deep-research base.

## API Contract

- Request validation is a runtime behavior, not just a schema shape.
  Ajv coercion, defaults, and removal settings can change what the handler
  actually receives, so static type agreement alone does not prove the request
  path.
- Response serialization is not the same thing as strict response validation.
  A response schema can shape serialization without proving every runtime
  response invariant you might assume.
- If a route accepts non-JSON content types through parsers but lacks the
  matching `body.content` schema map, the request can be parsed without
  actually being validated.
  Proof must cover the real content-type path, not just the visible schema.

## Fastify Runtime

- `app.inject()` proves in-process HTTP behavior and loads plugins through
  Fastify readiness, but it does not prove `onListen`, real socket lifecycle,
  or network-stack behavior.
- Stream, buffer, hijacked, or manual raw-response paths can bypass ordinary
  response-schema expectations.
  A route proof that only inspects schema presence may overclaim what the
  runtime actually enforces.
- Hook timing and decorator visibility are runtime facts.
  If the claim depends on plugin order or lifecycle surface, static inspection
  is weaker than a targeted runtime probe.

## Prisma / PostgreSQL

- A new uniqueness guarantee on existing data needs a duplicate preflight, not
  just tests that pass on clean fixtures.
- `CREATE INDEX CONCURRENTLY` is not valid inside a transaction block.
  Migration safety can require checking the actual migration shape, not only
  post-change application behavior.
- Transaction retry safety is about retrying the whole transaction boundary,
  not one statement.
  Proof for retry-sensitive changes should exercise the full transaction
  contract.

## Redis Runtime

- TTL is not a precise timer.
  A proof that assumes "TTL reached zero" equals "state disappeared exactly
  then" is overclaiming Redis behavior.
- `SET key value NX EX ttl` is a different correctness class from `SETNX`
  followed by `EXPIRE`.
  Proof should target the actual atomic pattern, not a mocked approximation.
- For `SET ... NX` style guards, success is a truthiness contract, not a
  string-equality contract to `'OK'`.
- Script-cache behavior is operationally real.
  If the change depends on Lua commands, `NOSCRIPT` fallback can matter to
  closeout confidence.

## Workflow State

- A happy-path transition proof does not prove illegal-transition handling,
  recovery, or re-entry safety.
- Timers, deadlines, and cancellation are safer when modeled as persisted
  transitions rather than in-memory assumptions.
  Proof should target the persisted lifecycle if the claim depends on recovery.
- If state changes can happen from more than one path, a single-path test may
  overclaim lifecycle integrity.

## Vitest / Proof Harness

- `inject()` is the right HTTP proof layer often, but not for `onListen`,
  real sockets, SSE/WebSocket lifecycle, or shutdown-specific behavior.
- With Prisma or other native-heavy paths, `pool: 'forks'` is often the safer
  realism default; harness shape can affect whether a passing test is actually
  trustworthy.
- A mocked harness imported too early can quietly collapse the intended proof
  boundary.
  If the claim depends on real interception or real module boundaries, proof
  can be weaker than it looks.

## Anchor Rule

Use this file only when one of these is true:

1. the chosen proof layer seems right in the abstract but may be wrong for
   this stack
2. the change touches a seam with a known false-proof pattern
3. a smaller proof layer is tempting, but a concrete stack fact might defeat it
