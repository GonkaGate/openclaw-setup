# Failure Modes

Use this file when the draft answer feels right in theme but may still be
unsafe, too broad, or too clever.

## Behavior Drift In Disguise

Red flag:

- a "pure refactor" changes side-effect order, thrown errors, or async
  sequencing

Response:

- name the changed behavior explicitly or keep the move smaller

## Cleverness Migration

Red flag:

- runtime complexity was reduced by adding deeper conditional, mapped, or
  helper-type machinery

Response:

- prefer simpler data shapes, local branching, or named interfaces over new
  type puzzles

## Assertion As Duct Tape

Red flag:

- `as` is doing the work that parsing, validation, or narrowing should do

Response:

- move proof to the boundary or use a guard or assertion function with runtime
  meaning

## Wrong Abstraction Persistence

Red flag:

- a helper reduces duplication but keeps accumulating flags or exceptions

Response:

- consider backing out the abstraction before polishing it further

## Fake Mechanical Safety

Red flag:

- a bulk codemod or search-replace is treated as safe only because it is large
  and repetitive

Response:

- require one explicit behavior rule, sample verification, and a proof surface
  before trusting the batch

## Compiler Flag Flip As Cleanup

Red flag:

- the proposal frames enabling a stricter TS flag as a pure refactor with no
  adoption plan

Response:

- treat the flag as an investigation map or a separate migration, not as proof
  that behavior is already preserved

## Cleanup For Cleanup's Sake

Red flag:

- the proposal cannot name preserved behavior, dominant complexity, and
  readability payoff

Response:

- do not recommend the change yet

## Seam Creep

Red flag:

- the proposed win depends on architecture rewrite, module ownership change,
  or framework migration

Response:

- hand off instead of stretching this skill past its contract
