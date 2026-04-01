# Stack-Specific Hard Anchors

Use this reference when the draft review turns on exact adjacent-stack
semantics rather than on architecture shape alone.

These anchors are not generic fixes. Use them to reject wrong design reasoning
when a proposal sounds plausible but depends on a false assumption about the
actual stack.

If the point depends on composition root, import boundaries, config leakage,
transport contamination, or Node ESM run-correctness, use
`architecture-hard-anchors.md` instead.

## Fastify And Contract Boundaries

- `app.inject()` proves in-process request and response behavior, not real
  socket lifecycle.
  `onListen` does not run under `inject()` or `ready()`.
- Fastify `response` schemas are not only docs; they drive serializer behavior.
  Missing or drifting response schemas can be a real design flaw, not a docs
  cleanup item.
- Stream replies are outside ordinary response validation and serialization
  assumptions.
  If a design depends on stream shape or lifecycle, ordinary JSON-route
  guarantees do not carry over automatically.
- Decorator and hook visibility depend on registration scope and order.
  A design that assumes root visibility from a nested registration context may
  be structurally wrong even before implementation.

## Prisma And PostgreSQL

- A new `UNIQUE` constraint on existing data is not just a schema decision.
  Without duplicate preflight, migration safety is still unproven.
- Client-side cancellation or request timeout does not guarantee that
  PostgreSQL stopped doing work.
  If the design depends on bounded DB work, server-side timeout posture still
  matters.
- `TRUNCATE` takes strong locks.
  Designs that rely on broad table cleanup in hot paths, migrations, or
  high-parallel test proof may hide serialization or operational pain.
- Queue wait and SQL execution are different problems.
  A design that treats Prisma pool wait as "database is slow" may choose the
  wrong correction.

## Redis Runtime

- Redis offline-queue and reconnect behavior are correctness semantics, not
  just convenience settings.
  Replay-sensitive commands need explicit treatment.
- For Lua and `SET ... NX` style guards, truthiness and reply shape matter.
  Designs that depend on string-equality checks such as `'OK'` can be subtly
  wrong.
- Redis used as cache, lock, queue, or workflow state should be reviewed as
  different ownership models, not as one generic "Redis layer".

## Reliability And Queueing

- Fastify `handlerTimeout` can send `503` and abort the request signal, but it
  does not prove that downstream work stopped.
- `pool_timeout=0` is not automatically safer.
  It can convert bounded pool pressure into hidden in-memory waiting.
- A retry or degrade design must be judged by whether it reduces work under
  failure, not by whether it adds another branch.

## Test-Proof Boundaries

- `inject()` is a strong route-proof tool, but it does not prove `listen()`,
  socket behavior, WebSocket/SSE lifecycle, or `onListen` work.
- A higher-realism proof step is justified only for the seam the lower layer
  cannot honestly prove.
  Turning every review concern into "write e2e" is not disciplined design
  review.

## Review Rule

Load this file only when one of these facts would change the verdict.
If the same conclusion stands without exact stack semantics, prefer the
lighter references.
