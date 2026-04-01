# Seam Activation Matrix

Use this reference to decide which shared topics the current closeout question
actually needs.

Load a topic only if it changes the proof choice.

## `api-contract`

- `Load when`
  request or response shapes, validation, serialization, content-type mapping,
  headers, or compatibility-sensitive docs/publication changed
- `Typical proof obligations`
  - schema rejects bad inputs
  - serializer emits the promised shape
  - status and header behavior matches the contract
- `Typical smallest checks`
  - focused route or `app.inject()` checks
  - targeted contract diff when compatibility is the claim

## `fastify-runtime`

- `Load when`
  hooks, decorators, plugin order, reply ownership, error flow, startup,
  shutdown, streaming, or lifecycle timing changed
- `Typical proof obligations`
  - the code runs on the intended lifecycle surface
  - visibility and order assumptions actually hold
  - startup or shutdown behavior matches the claim
- `Typical smallest checks`
  - `app.inject()` for in-process request lifecycle
  - targeted real-runtime proof for `listen()`, socket, shutdown, or stream
    behavior that `inject()` cannot cover

## `prisma-postgresql`

- `Load when`
  schema, migration SQL, uniqueness, backfills, transactions, locks, or query
  semantics changed
- `Typical proof obligations`
  - migration is safe on current data shape
  - constraints behave as claimed
  - transaction/query semantics match the intended guarantee
- `Typical smallest checks`
  - duplicate preflight or migration precheck
  - targeted integration proof against real Postgres
  - focused query or transaction verification

## `redis-runtime`

- `Load when`
  TTL, scripts, guards, reconnect, readiness, cache/state protocols, or
  coordination behavior changed
- `Typical proof obligations`
  - Redis semantics match the claimed behavior under real replies and timing
  - guard or script logic behaves correctly under runtime semantics
- `Typical smallest checks`
  - targeted real Redis integration proof
  - readiness/reconnect probe if lifecycle behavior changed

## `runtime-workflow-state-machines`

- `Load when`
  legal transitions, waits, timers, cancellation, recovery, or re-entry rules
  changed
- `Typical proof obligations`
  - legal transitions are enforced
  - illegal transitions are rejected
  - recovery or re-entry remains coherent after interruption
- `Typical smallest checks`
  - persisted transition checks
  - targeted recovery or replay scenario

## `vitest-qa`

- `Load when`
  the main question is what proof layer, harness realism, or isolation model is
  sufficient
- `Typical proof obligations`
  - the retained test layer is actually capable of proving the claim
  - mocks versus real dependencies are chosen honestly
- `Typical smallest checks`
  - a focused test-layer decision
  - a narrowed harness or isolation recommendation

## Activation Rule

If you cannot explain how a topic changes the proof choice, do not load it.
