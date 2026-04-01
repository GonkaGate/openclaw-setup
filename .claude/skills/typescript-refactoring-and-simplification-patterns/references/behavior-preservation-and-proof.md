# Behavior Preservation And Proof

Use this file when the main risk is not choosing a move but proving the move is
still a refactor rather than a behavior change in disguise.

## What "Preserved Behavior" Includes

Treat all of these as part of behavior when they matter to callers or
operations:

- returned values and response shape
- thrown or returned error shape
- side-effect order
- important async sequencing and await boundaries
- write count or external call count
- retry, timeout, or fallback behavior if the current code already exposes it

Do not reduce "behavior" to only the happy-path return value.

## Evidence Ladder

Trust preservation proof in this order:

1. characterization or contract tests
2. stable current callers plus visible code path
3. a clearly documented external contract
4. inferred developer intent

If you are operating at level 3 or 4, say so and lower confidence.

## When To Add A Safety Net First

Add the smallest proof seam before refactoring when:

- async sequencing looks fragile
- errors are part of the contract
- the code mixes logic with IO or writes
- there are no tests and multiple plausible current behaviors
- the move is mechanically large enough that review alone is weak proof

Good safety nets:

- characterization tests around the seam
- a narrow golden path plus one failure-path check
- temporary logging or diffable outputs when tests are not yet practical

## Split Refactor From Behavior Change

Do not mix these into one recommendation:

- "preserve current behavior"
- "while also fixing the bug"
- "while also making the API nicer"

If the desired outcome includes a real behavior change, separate it into:

1. make the change safe and explicit
2. then change behavior on purpose

## Async And Side-Effect Traps

Watch for these during extraction or phase splitting:

- validation moving earlier or later
- error type or message changing
- writes happening in a different order
- duplicate external calls after extraction
- a helper accidentally swallowing or rethrowing errors differently

If one of these changes, name it as a behavior change instead of calling it a
pure refactor.

## Stop Signals

Pause or narrow the move when:

- you cannot state what behavior is being preserved
- the only proof is "it looks equivalent"
- the move changes too many unrelated seams at once
- the recommended diff is larger than the available proof surface
