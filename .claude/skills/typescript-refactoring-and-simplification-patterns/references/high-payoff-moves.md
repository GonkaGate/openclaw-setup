# High-Payoff Moves

Use this file when you already know the code is in seam and need the smallest
high-value move.

## Remove Hidden Modes

Use when:

- a boolean parameter or local flag selects behavior
- the caller cannot tell what `true` or `false` means

Prefer:

- separate functions for separate operations
- or an explicit discriminated union when the mode is real data

Watch for:

- preserved validation or side-effect order across the old modes

## Split Phase

Use when one function mixes:

- parse or normalize
- business logic
- formatting
- external calls

Prefer:

- `parse -> execute -> format`
- with an explicit intermediate type or value

Watch for:

- error timing changes after moving validation earlier

## Normalize At The Boundary

Use when:

- `any`, `unknown`, `JSON.parse`, env access, raw query params, or driver data
  leak into internals
- guards and `as` are scattered through business logic

Prefer:

- one parsing or narrowing seam
- then trusted internal shapes afterward

Watch for:

- claiming runtime safety from types alone

## Shrink Type Or Helper Indirection

Use when:

- intersections, helper types, or computed types are harder to read than the
  business shape
- the code requires IDE hover archaeology to understand

Prefer:

- named interfaces
- explicit return types when they stabilize the contract
- `satisfies` over `as` for config-like tables

Watch for:

- replacing one clever trick with another

## Remove Wrong Or Leaky Abstractions

Use when:

- callers still need to know the abstraction's internal rules
- the helper keeps growing flags, exceptions, or special cases

Prefer:

- local duplication over the wrong abstraction when needed
- deleting the middle layer if it only forwards calls

Watch for:

- accidentally changing ownership boundaries or broader architecture

## Delete Dead Surface

Use when:

- branches, helpers, or exported shapes are no longer reached

Prefer:

- deleting unused paths before designing new abstractions

Watch for:

- relying on guesswork about reachability instead of evidence

## Mechanical Codemod

Use when:

- the refactor is repetitive and syntax-shaped
- each occurrence follows the same behavior-preserving rule

Prefer:

- an AST-based or similarly reviewable transform
- one transform per behavior rule
- a small sample verification before a repo-wide run

Watch for:

- bundling semantic rewrites into a "mechanical" batch
- running a large transform without a clear proof surface
