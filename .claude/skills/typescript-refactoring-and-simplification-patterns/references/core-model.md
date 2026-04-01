# Core Model

Use this file to keep the seam sharp before answering.

## What Counts As Success

The goal is not "cleaner-looking code."

The goal is lower local reasoning cost while preserving external behavior.

A refactor counts as simplification when it removes one or more of these:

- hidden modes or implicit states
- repeated reconstruction of the same invariant
- long or tangled control-flow proofs
- extra abstraction layers that still leak their internals
- type or helper machinery that is harder to understand than the problem it
  models

## Source Of Truth Order

Trust evidence in this order:

1. observed current behavior from tests, contracts, and real call sites
2. observed code path and side effects
3. stated intent from the prompt
4. inferred intent

If you are preserving only inferred intent, say so and lower confidence.

## Minimality Rules

Prefer, in order:

1. delete dead surface
2. normalize the boundary
3. split phases
4. make data states explicit
5. remove a leaky abstraction
6. add a new abstraction only if it removes repeated reasoning, not just
   repeated text

## Readability Payoff Test

Do not call a move "simpler" unless you can say:

- what the next reader no longer has to remember
- what invariant now lives in one place instead of several
- what branch, helper, or indirection disappeared
- what future change now needs fewer coordinated edits

If you cannot name the payoff, the move is probably cosmetic.

## Boundary Discipline

Inside this seam, "simplify" often means:

- parse, validate, and narrow at the edge
- keep internals on trusted narrow shapes
- stop using `as` where a guard, assertion function, or explicit normalization
  would be more honest

It does not mean:

- push complexity into type-level cleverness
- erase runtime uncertainty by pretending the types proved it

## Handoff Triggers

Hand off when the main win is really:

- architecture or ownership-boundary redesign
- new public API shape
- greenfield advanced type modeling
- broad runtime validation architecture instead of a local boundary cleanup
