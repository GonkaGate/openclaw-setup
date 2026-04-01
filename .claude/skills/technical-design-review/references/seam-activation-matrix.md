# Seam Activation Matrix

Use this reference to decide which shared topics the current design review
actually needs.

Always start from `ts-backend-architecture`.

## Base Architecture

- `Load when`
  Every real technical design review.
- `What it owns`
  ownership boundaries, dependency direction, composition root, config and
  error boundaries, module publication surfaces
- `Do not let it drift into`
  framework-lifecycle trivia, database mechanics, or operational tuning unless
  the design explicitly depends on them

## `api-contract`

- `Load when`
  the design changes request or response shapes, schema ownership,
  compatibility, serializer behavior, or OpenAPI/publication surfaces
- `Primary review questions`
  what contract changes are being promised, who owns the source of truth, and
  where validation or serialization drift could appear

## `fastify-runtime`

- `Load when`
  the design depends on hooks, decorators, plugin scope, request lifecycle,
  streaming, or error-handler behavior
- `Primary review questions`
  whether the design places work on the correct lifecycle surface and whether
  runtime visibility or order assumptions are sound

## `prisma-postgresql`

- `Load when`
  the design introduces schema changes, migrations, transaction boundaries,
  query ownership, uniqueness or backfill assumptions, or DB-backed correctness
- `Primary review questions`
  whether the data boundary is owned clearly, whether migrations are safe, and
  whether transaction or query assumptions are actually valid

## `redis-runtime`

- `Load when`
  the design uses Redis for cache coherence, coordination, TTL semantics, Lua,
  queues, replay-sensitive state, or background coordination
- `Primary review questions`
  whether Redis is acting as cache, lock, queue, or state machine, and whether
  those semantics are bounded and operationally honest

## `node-reliability`

- `Load when`
  the design depends on deadlines, retries, degradation, shutdown, recovery,
  replay, admission, or backlog behavior
- `Primary review questions`
  what happens under partial failure, whether work keeps spending after the
  caller or budget is gone, and whether the recovery path is actually safe

## `node-security`

- `Load when`
  the design changes trust boundaries, auth, secret handling, outbound HTTP,
  logging exposure, or fail-open behavior
- `Primary review questions`
  where trust changes, what attacker-influenced path opens, and whether safety
  depends on a hidden fail-open assumption

## `node-performance`

- `Load when`
  the design changes hot-path work, queueing behavior, pool contention,
  backpressure, payload cost, or measurement-sensitive bottlenecks
- `Primary review questions`
  which resource or queue can saturate, whether the design adds hidden waiting,
  and what evidence would prove the intended payoff

## `vitest-qa`

- `Load when`
  the design relies on a proof plan, proposes a testing strategy, or claims a
  specific layer will make the change safe
- `Primary review questions`
  what the proposed tests would actually prove, what they would not prove, and
  whether the chosen layer matches the risk being managed

## Review Rule

If you cannot explain why a topic changes the verdict, do not load it.

Prefer one dominant adjacent seam plus only the supporting seams that change
the verdict materially.

If more than three adjacent seams seem active, first ask whether:

- the proposal bundles multiple design decisions that should be split
- the architecture boundary is still unclear and is causing fake cross-seam
  sprawl
- one seam should own the core verdict while the others become secondary
  consequences
