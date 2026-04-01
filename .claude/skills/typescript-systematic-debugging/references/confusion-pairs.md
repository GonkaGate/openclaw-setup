# Confusion Pairs

Use this when the first explanation sounds plausible but might actually be the
wrong neighboring failure class.

Before promoting any theory, name the nearest competing explanation and what
observation would separate them.

## 1. Fastify Startup / Scope vs Request Lifecycle

- Distinguish decorator registration, plugin encapsulation, or startup ordering
  bugs from per-request hook or handler failures.
- Ask:
  - does the failure exist before any request reaches the handler?
  - or only under specific requests, hooks, or reply paths?

## 2. Prisma Pool Wait vs Slow SQL / Locking

- Do not accept "database problem" as a finished explanation.
- Ask:
  - is time lost waiting for a connection?
  - inside query execution?
  - or behind transaction/lock contention?

## 3. Redis Readiness / Reconnect vs State-Protocol Bug

- Distinguish transport or client readiness instability from wrong key, TTL,
  script, parser, or reply-shape assumptions.
- Ask:
  - is Redis unavailable or reconnecting?
  - or is the app misreading valid replies or mutating the wrong state?

## 4. Network Failure vs HTTP Error vs Parse / Mapping Failure

- Do not collapse all outbound failures into "provider issue."
- Ask:
  - did the transport fail?
  - did the provider answer with an error response?
  - or did the adapter mis-parse or mis-map a valid response?

## 5. Client Abort vs Server Stall / Backpressure

- Distinguish a client disappearing from the server falling behind.
- Ask:
  - did the client close first?
  - is the server blocked or buffering?
  - is `write() -> false` or missing `drain` handling the real mechanism?

## 6. Original Failure vs Retry / Deadline Amplification

- Do not stop at the first visible error if retries, queues, or timeouts may
  be amplifying it.
- Ask:
  - what failed first?
  - what only became visible because the system retried, queued, or degraded
    badly?

## 7. Latency Symptom vs Bottleneck Surface

- "It got slow" is not a mechanism.
- Ask:
  - event loop?
  - worker pool?
  - Prisma wait?
  - PostgreSQL execution?
  - Redis RTT?
  - serialization/logging?
  - streaming backpressure?

## 8. Missing Telemetry vs Wrong Behavior

- Distinguish "we cannot see the truth yet" from "the system is doing the
  wrong thing."
- If the current evidence only proves blindness, produce a measurement gap or
  next probe rather than a fake root cause.
