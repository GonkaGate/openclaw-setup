# Seam Activation Matrix

Use this reference to decide which shared topics the current implementation
plan actually needs.

Always start from `ts-backend-architecture`.

## Base Architecture

- `Load when`
  Every real implementation plan.
- `What it changes`
  ownership seams, dependency direction, composition-root implications,
  publication surfaces, and which work must land first because later steps
  depend on those boundaries
- `Do not let it drift into`
  framework-lifecycle detail, database mechanics, or testing strategy unless
  those facts materially change sequence or proof

## `api-contract`

- `Load when`
  the plan changes request or response shapes, schema ownership,
  compatibility windows, serializer-visible behavior, or OpenAPI publication
- `Primary planning questions`
  what is the contract source of truth, who consumes it, and what order keeps
  validation, serialization, and published docs from drifting

## `fastify-runtime`

- `Load when`
  the plan depends on plugin order, decorators, hooks, lifecycle, streaming,
  reply ownership, or startup/shutdown behavior
- `Primary planning questions`
  which provider or lifecycle surface must land before consumers, and what
  validation is honest for that runtime behavior

## `prisma-postgresql`

- `Load when`
  the plan introduces schema changes, migrations, constraints, backfills,
  query-shape shifts, or transaction-sensitive behavior
- `Primary planning questions`
  whether this needs expand-and-contract sequencing, duplicate preflight,
  data backfill windows, or deploy-order-sensitive validation

## `redis-runtime`

- `Load when`
  the plan changes key protocols, TTL semantics, scripts, cache or state
  compatibility, locks, queues, or coordination behavior
- `Primary planning questions`
  whether old and new Redis behavior must coexist, what state protocol is being
  changed, and how rollback stays safe

## `runtime-workflow-state-machines`

- `Load when`
  the plan changes persisted workflow state, legal transitions, timers, waits,
  cancellation, recovery, or re-entry behavior
- `Primary planning questions`
  where durable workflow truth lives, how in-flight instances are migrated
  safely, and which transition rules must land before new workers or handlers

## `vitest-qa`

- `Load when`
  phase ordering depends on proof obligations, harness realism, or whether
  route, integration, or targeted e2e validation is the honest proof layer
- `Primary planning questions`
  what each phase must prove, whether cheap checks are honest enough, and
  whether a separate test-plan handoff is justified

## Planning Rule

If you cannot explain why a topic changes sequence, rollback, or proof, do not
load it.

If more than three adjacent seams seem active, first ask whether:

- the task actually bundles several changes that should be split
- architecture is still under-specified and causing fake cross-seam sprawl
- one seam still needs design work before planning can stabilize
