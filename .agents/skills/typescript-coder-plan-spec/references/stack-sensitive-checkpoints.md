# Stack-Sensitive Checkpoints

Use this reference when a plan depends on exact stack semantics rather than on
generic sequencing heuristics.

Only keep an anchor here if it can materially change:

- phase order
- rollback or compatibility shape
- proof honesty
- or whether a phase belongs in the plan at all

## API Contract

- Keep one source of truth from TypeBox schema to route schema to published
  OpenAPI.
  If the change still depends on parallel manual TS interfaces or manual
  OpenAPI edits, the plan is probably hiding contract drift instead of
  sequencing real work.
- Response-shape changes are not just TypeScript changes.
  `fast-json-stringify` shapes output from the declared response schema and may
  drop undeclared fields, so schema work often belongs before handler cleanup
  or response refactors that assume the new shape.
- Fastify's Ajv defaults can mutate validated input through defaults,
  additional-field removal, and coercion.
  If the change affects query/body semantics, the plan may need an explicit
  compatibility step or validation-policy check instead of treating it as a
  pure handler edit.
- If compatibility matters, plan the contract window explicitly rather than
  hiding it inside one handler step.

## Fastify Runtime

- Provider plugins, decorators, and shared hooks must land before consumers
  that assume visibility or order.
- When request shape changes, declare decorator shape in bootstrap and
  initialize per-request state in hooks.
  If the refactor moves both at once, plan provider-first rollout so route
  consumers never observe a missing decorator.
- Async hooks that send a reply need `return reply`.
  If a change moves auth, deny, or early-response behavior into hooks, the plan
  should include runtime validation for double-send or continued execution
  risks, not just route assertions.
- `handlerTimeout` is cooperative.
  If the change introduces deadline handling, plan abort propagation and
  cleanup explicitly; a timeout does not magically stop in-flight work.
- `return503OnClosing` and closing semantics can matter for shutdown-sensitive
  changes.
  If the work touches startup/shutdown or long-lived connections, validation
  may need a real close-path check instead of only happy-path route tests.
- Some behaviors need more than `inject()` to prove honestly.
  Streaming, socket, abort, or real startup/shutdown behavior may require a
  stronger validation step than route-level tests.

## Prisma And PostgreSQL

- Production migration order is not `migrate dev` thinking.
  The plan should assume committed migrations plus `prisma migrate deploy`, and
  treat critical DDL as SQL-level sequencing when Prisma's default abstraction
  would hide lock or transaction behavior.
- Schema changes on existing data may need expand-and-contract sequencing.
- New uniqueness or stricter constraints can require preflight checks or staged
  backfills before enforcement.
- Separate schema introduction, data repair or backfill, and cleanup when real
  data already exists.
- `NOT VALID` plus later `VALIDATE CONSTRAINT` can be the honest two-phase path
  for large tables; if the plan jumps straight to strict validation on a live
  table, it may be hiding lock risk.
- `CREATE INDEX CONCURRENTLY` is often the right rollout shape for live write
  traffic, but it cannot run inside a transaction block.
  If the plan treats it like ordinary migration SQL, sequencing is probably
  wrong.
- Interactive or Serializable transaction changes can require retry around the
  whole transactional function, not around one query.
  If the feature relies on stronger isolation, the plan should include retry
  ownership and proof for that behavior.

## Redis Runtime

- `SET key value NX EX ttl` is the safe default for expiring markers.
  If the plan still assumes `SETNX` then `EXPIRE`, it is probably missing a
  race-sensitive protocol detail.
- For lock-like markers, value token plus Lua-guarded release is the safe
  pattern.
  If the change alters acquisition or release semantics, plan both sides of the
  protocol together.
- Script changes are not just code deployment.
  `EVALSHA` depends on volatile script cache; pipeline plus `EVALSHA` needs
  special care because `NOSCRIPT` inside an already-sent pipeline is not a
  normal recovery path.
- TTL is part of the state protocol, not just cleanup.
  If TTL meaning changes, old and new state may need a compatibility window or
  key-version boundary.
- Offline queue and timeout behavior are not automatic reliability wins.
  If the change assumes a timed-out Redis command definitely did nothing, or
  assumes queued commands are harmless, the plan is hiding replay or
  double-apply risk.
- Script, key, or reply-shape changes can require compatibility windows.
- For `SET ... NX` guards, truthiness is the safe check, not string equality to
  `OK`.

## Workflow State Machines

- Durable workflow truth should be staged before new workers or handlers assume
  new transitions.
  If the queue currently behaves like the source of truth, planning may need a
  deeper design handoff before execution sequencing is honest.
- One transition path should own state change.
  If the change would still let several services or handlers update workflow
  state ad hoc, the plan is probably pretending implementation can fix a design
  gap.
- State snapshot and transition history should move together transactionally.
  If a phase changes one without the other, recovery and audit semantics may
  break.
- Lease-style ownership without fencing is not enough.
  If concurrency changes depend on worker leases, include version or equivalent
  stale-owner protection in the execution order.
- Timeouts, retries, waits, and cancellation usually need explicit transition
  handling in the plan, not implicit background behavior.
- In-flight workflows need a migration story when state shape or legal
  transitions change.

## Vitest Proof

- `inject()` boots plugins but does not prove `onListen` behavior.
  If the change touches `onListen`, WebSocket setup, socket lifecycle, or other
  listen-time side effects, the plan should not claim route-test proof.
- `inject()` is honest for many route and hook behaviors, but not for every
  socket or streaming claim.
- DB cleanup strategy changes proof shape.
  `TRUNCATE` brings strong reset semantics but also `ACCESS EXCLUSIVE` locking,
  so parallel test phases may need worker isolation or reduced parallelism
  instead of a naive shared-DB plan.
- Redis proof also needs cleanup semantics to be honest.
  If a phase relies on real Redis behavior, note whether cleanup is sync,
  namespaced, or per-worker; otherwise the validation step is weaker than it
  sounds.
- Real DB or Redis behavior needs isolation and cleanup assumptions to be
  named, or the validation step is weaker than it sounds.
