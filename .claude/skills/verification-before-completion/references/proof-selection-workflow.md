# Proof Selection Workflow

Use this file when the hard part is not "what checks exist?" but "what proof
is actually required before closeout?"

The goal is not to maximize coverage. The goal is to choose the smallest proof
set that makes the readiness claim honest.

## 1. Name The Claim First

Do not start from commands.

Start from:

- what changed
- what is being claimed ready
- what would break if that claim is false

If the claim is vague, the proof set will also be vague.

## 2. Identify The Touched Seam

Use the changed behavior to decide which seam owns the risky claim:

- contract
- Fastify runtime lifecycle
- database semantics
- Redis/state semantics
- workflow-state transitions
- proof-layer or harness realism

If more than two seams seem active, first ask whether the change bundles
several claims that should be verified separately.

## 3. Inventory Current Evidence

Classify each evidence item:

- `fresh direct`
  - observed on the current change and directly exercises the risky seam
- `partial`
  - useful, but proves only part of the claim
- `stale`
  - from an earlier revision or different code path
- `indirect`
  - reassuring, but does not exercise the real claim
- `missing`
  - no evidence yet

Treat stale and indirect evidence as support, not closure.

## 4. Pick The Smallest Honest Layer

Prefer the smallest layer that still exercises the risky seam:

- local logic only
  - focused unit proof may be enough
- request validation or serialization
  - route-level `app.inject()` proof is often enough
- startup, shutdown, socket, or stream lifecycle
  - `inject()` is often not enough; use a targeted real-runtime check
- DB constraints, migration behavior, transactions, locking
  - real Postgres proof or migration preflight is usually required
- Redis TTL, scripts, guards, readiness, coordination
  - real Redis proof is usually required
- workflow legality, recovery, or re-entry
  - persisted transition or recovery proof is usually required

## 5. Drop Checks That Do Not Change The Verdict

Keep a check only if its result would change the closeout verdict.

Drop:

- checks that only repeat what another retained check already proves
- broad suites when one focused check covers the changed seam
- nice-to-have smoke checks presented as blocking proof

## 6. State The Honest Verdict

After selecting the proof set, say one of:

- `verified ready`
- `conditionally ready`
- `not yet verified`

Do not let the wording imply stronger proof than the retained checks provide.
