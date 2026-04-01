# Unfamiliar Codebase Checklist

Use this file when you need to find the highest-payoff simplification
opportunity in a repo you do not yet know.

## 1. Check The Hidden Baseline

- inspect `tsconfig` or effective compiler settings
- note whether strictness options already expose absence, optional-property,
  and import-shape complexity
- do not assume defaults you have not seen

## 2. Find Trust Boundaries

Look for where data enters:

- HTTP handlers
- env parsing
- queue or job payloads
- raw JSON
- DB or driver output
- file input

Ask:

- is there one parse, validate, and narrow seam?
- or are `any` and `as` scattered across the logic?

## 3. Scan For High-Signal Smells

Search for:

- boolean parameters or local control flags
- large handlers that parse, decide, call out, and format in one function
- `JSON.parse`, `as`, `any`, or broad `Record<string, ...>` use
- deep intersections, helper-type stacks, or repeated hover-only types
- proxy classes or helpers that only forward
- dead branches or obviously stale code paths

## 4. Pick One Seam

Choose the first move where all are true:

- the behavior can be protected
- the complexity source is obvious
- the move is small and reversible
- the readability payoff is easy to explain

## 5. Locate The Proof Surface

Before changing code, ask:

- are there characterization or contract tests nearby?
- do callers make the current behavior observable?
- are side effects and errors visible enough to protect?

If not, assume the safe slice is smaller than it first appears.

## 6. Add The Smallest Safety Net

If behavior is uncertain:

- add characterization tests near the seam
- or define another concrete proof source before refactoring

## 7. Prefer The First Honest Win

Do not start with:

- a broad rewrite
- a new abstraction layer
- a batch of unrelated cleanups

Start with the move that makes the next change cheaper soonest.
