# Investigation Checklist

Use this when the issue is not yet localized and the current prompt is closer
to "something is broken" than to a named mechanism.

You do not need to print every line in the final answer, but you should verify
them before choosing a debugging path.

## 1. Normalize The Symptom

- What breaks exactly?
- For whom does it break?
- When did it start?
- Is it deterministic, intermittent, load-sensitive, deploy-sensitive, or
  data-dependent?
- What is the user-visible consequence:
  wrong response, timeout, wrong state, crash, stuck stream, duplicate work,
  or only noisy telemetry?

## 2. Place The Failure In Time

- Does it happen during:
  startup, request handling, background work, streaming lifetime, or shutdown?
- What is the last known good phase?
- What is the first known bad phase?
- What changed between those two points:
  code, config, dependency behavior, data shape, traffic, or environment?

## 3. Map The Narrowest Plausible Path

- Which request, job, stream, or callback path actually owns the symptom?
- Which boundaries does that path cross:
  Fastify, Prisma/PostgreSQL, Redis, external HTTP/SDK, worker pool, stream,
  readiness, or shutdown?
- Which one of those boundaries is the first place where the system could
  plausibly start lying?

## 4. Inventory Evidence

- What do we know directly from logs, metrics, traces, errors, repro steps, or
  code inspection?
- Which observations are only inferred from symptoms?
- Which evidence is stale, partial, or contradictory?
- Which single missing observation would cut away the most uncertainty?

## 5. Start Narrow

- Inspect the seam that could first own the failure before widening to adjacent
  systems.
- Prefer one path and one repro over surveying the whole stack.
- If you widen the search, say what observation forced that widening.

## 6. Do Not Start Here

Do not begin with:

- a fix guess
- a rewrite proposal
- several experiments at once
- broad "check logs and metrics" advice with no target question
- loading every topic file before a likely surface exists
