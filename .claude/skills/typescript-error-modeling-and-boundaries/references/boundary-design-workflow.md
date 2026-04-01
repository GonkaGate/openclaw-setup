# Boundary Design Workflow

Use this file when you need a repeatable pass for designing or auditing
internal error architecture.

## 1. Name The Boundaries First

Before choosing a mechanism, name:

- the layers:
  infrastructure, domain or application, transport
- the delivery styles:
  sync `throw`, promise rejection, callback, EventEmitter, stream
- the audiences:
  internal diagnosis, internal caller, external caller

If the boundary map is still vague, the mechanics are premature.

## 2. Split Failure Families

Classify the touched failures as:

- programmer bug or invariant violation
- operational infrastructure failure
- expected branching outcome
- cancellation or abort when relevant

Do not let one family borrow the mechanism of another by inertia.

## 3. Choose The Signal Form

For each family choose one primary signal:

- exception or rejected promise
- explicit error value
- nullable absence result

Then explain why the tempting alternative loses here.

## 4. Choose Stable Identity

Pick the machine identity that crosses the boundary:

- `code`
- `kind`
- another discriminant

Do not make `message` the machine contract.

## 5. Assign Ownership

For each important boundary say who owns:

- create
- enrich
- translate
- shape

If you cannot name all four, the answer is probably still too vague.

## 6. Check Delivery Boundaries

Ask explicitly:

- what happens on promise rejection
- whether any failure can escape through EventEmitter or stream `'error'`
- whether caught `unknown` values are normalized
- whether `cause` preserves useful context

## 7. Mark Assumptions

Say what was observed versus inferred:

- TypeScript and Node versions
- actual framework boundary
- current error classes or union shapes
- whether caller-facing shaping is visible in code

Lower confidence when those facts are missing.
