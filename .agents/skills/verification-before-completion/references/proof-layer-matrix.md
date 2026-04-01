# Proof Layer Matrix

Use this reference when the hard part is not "what seam changed?" but "what
exact check type is the smallest honest proof for that seam?"

The goal is not to prefer heavier testing. The goal is to match the proof
layer to the changed claim.

## Static / Structural

- `Best for`
  - purely structural refactors, renames, wiring moves, or type-surface
    changes with no changed runtime behavior
- `What this really proves`
  - the code still compiles and the static contract still fits together
- `What this does not prove`
  - changed runtime, lifecycle, DB, Redis, or workflow semantics
- `Common false claim`
  - "typecheck passed, so the behavior is ready"
- `Smallest honest escalation`
  - move to the narrowest runtime or route proof for the changed behavior

## Focused Unit / Service

- `Best for`
  - local branching, mapping, domain validation, and isolated service behavior
- `What this really proves`
  - deterministic local logic with controlled collaborators
- `What this does not prove`
  - Fastify lifecycle, HTTP contract, real DB constraints, Redis semantics,
    socket lifecycle, or persistence-backed recovery
- `Common false claim`
  - "the path is safe" when the risky behavior depends on infra or framework
    semantics
- `Smallest honest escalation`
  - escalate only the seam that depends on real framework or infra behavior

## Route / `app.inject()`

- `Best for`
  - request validation, serialization, headers, status codes, and in-process
    Fastify wiring
- `What this really proves`
  - HTTP behavior inside the process through Fastify's request pipeline
- `What this does not prove`
  - `listen()` behavior, `onListen`, real sockets, shutdown, or long-lived
    stream lifecycle
- `Common false claim`
  - "`inject()` proves the real server lifecycle"
- `Smallest honest escalation`
  - add one targeted runtime check only for the lifecycle seam `inject()`
    misses

## Contract Diff / Compatibility Proof

- `Best for`
  - compatibility-sensitive request/response shape or publication claims
- `What this really proves`
  - the exposed contract changed or did not change as intended
- `What this does not prove`
  - business correctness, runtime lifecycle, or data semantics
- `Common false claim`
  - "the integration is safe" when only the schema surface was compared
- `Smallest honest escalation`
  - combine with route or integration proof only if the changed risk crosses
    into runtime or state

## Integration With Real Postgres / Redis

- `Best for`
  - constraints, transactions, locks, migrations, TTL, Lua, guards, cache or
    coordination semantics
- `What this really proves`
  - the changed behavior under real stateful runtime semantics
- `What this does not prove`
  - socket lifecycle, provider compatibility, or every end-to-end path
- `Common false claim`
  - "the route is covered" when only state semantics were exercised
- `Smallest honest escalation`
  - add route or contract proof only if the changed claim also covers the HTTP
    boundary

## Migration Preflight

- `Best for`
  - uniqueness, backfill, schema-tightening, or rollout-sensitive migration
    claims
- `What this really proves`
  - the migration assumptions still hold on current data shape
- `What this does not prove`
  - application behavior after deploy unless paired with a runtime check
- `Common false claim`
  - "tests passed, so the migration is safe"
- `Smallest honest escalation`
  - pair with one targeted post-migration runtime or query proof if behavior
    also changed

## Targeted Runtime / `listen()` / Shutdown / Stream

- `Best for`
  - startup, shutdown, socket, SSE/stream, abort, reply ownership, or
    `onListen` claims
- `What this really proves`
  - the real runtime behavior lower layers cannot exercise honestly
- `What this does not prove`
  - unrelated data or contract claims just because the server started
- `Common false claim`
  - "only full e2e is trustworthy"
- `Smallest honest escalation`
  - keep the runtime proof narrow and seam-specific

## Workflow Recovery / Re-entry

- `Best for`
  - persisted transitions, timers, cancellation, replay, and recovery claims
- `What this really proves`
  - the workflow truth remains coherent across interruption and resume
- `What this does not prove`
  - unrelated HTTP or infra behavior
- `Common false claim`
  - "the happy path passed, so recovery is fine"
- `Smallest honest escalation`
  - add only the specific failure or replay scenario that closes the open
    transition claim

## Layer Selection Rule

Before choosing a broader layer, answer all three:

1. What exact claim is still unproven?
2. Why can the smaller layer not prove it honestly?
3. What is the narrowest higher-realism layer that can?

If those answers are weak, the escalation is probably proof theater.
