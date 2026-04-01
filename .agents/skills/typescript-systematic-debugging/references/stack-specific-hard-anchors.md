# Stack-Specific Hard Anchors

Use this when the debugging method is clear but the diagnosis could still drift
because the stack has concrete semantics that are easy to remember
incorrectly.

This file is intentionally compact. It should sharpen diagnosis, not duplicate
the full deep-research base.

## Fastify Runtime

- Mixing `async` hooks with `done()` is a real bug class, not style trivia.
  It can cause double progression or response races.
- `reply.send()` inside `onError` is invalid; `onError` runs before the custom
  error handler and is for logging or cleanup, not re-sending a response.
- `handlerTimeout` returning 503 does not stop work by itself.
  It aborts `request.signal`, but cancellation is cooperative.
  If downstream I/O ignores the signal, the work can keep running in the
  background.

## Prisma / PostgreSQL

- `P2024` points to pool wait saturation, not automatically to slow SQL.
  Do not jump from `P2024` to index or query-plan advice.
- Raising `pool_timeout` is not a free fix.
  It often converts explicit errors into worse tail latency by letting the
  in-process queue wait longer.
- `P2034` under Serializable or deadlock pressure means retry the whole
  transaction, not one statement in isolation.

## Redis Runtime

- TTL is not a precise timer.
  Expiration is active plus passive, so "TTL reached zero" and "state really
  disappeared" are not the same moment.
- For one-shot guards, `SET key value NX EX ttl` is a different class of
  correctness from `SETNX` followed by `EXPIRE`.
- Script cache is volatile.
  `EVALSHA` plus fallback on `NOSCRIPT` is the real operational model.
- For `SET ... NX` style guards, treat success as truthiness.
  Do not compare replies to string `'OK'`.

## External Integrations

- `fetch` or undici not throwing on 4xx/5xx is a hard boundary fact.
  Distinguish transport failure from HTTP error response before blaming the
  provider or adapter.
- Retry decisions belong after idempotency and `Retry-After` reasoning.
  "The request failed" is not enough to justify retries.

## Streaming / Workers

- `write() -> false` means wait for `drain`.
  Ignoring that is not a performance smell only; it is a correctness and
  memory-risk signal.
- `reply.send()` plus manual `reply.raw` writes is double response ownership,
  not a harmless implementation detail.
- Client abort and server stall are different mechanisms.
  `request.signal` or connection-close evidence matters more than symptom
  wording.

## Reliability / Observability / Performance

- Readiness and liveness are different truths.
  A dependency outage or overload can make readiness fail without meaning the
  process is dead.
- `fastify.close()` pushes new requests toward 503; shutdown-related failures
  should be separated from ordinary runtime faults.
- `UV_THREADPOOL_SIZE` is a startup-time knob and only matters if the actual
  bottleneck is threadpool-backed work rather than event-loop CPU or DB wait.
