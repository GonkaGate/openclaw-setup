# Hard Technical Anchors

Use this file when the answer depends on concrete TypeScript or Node mechanics,
not just on good refactoring workflow.

## TS Flags That Matter To Simplification

Treat these as high-value anchors when visible in the project or when proposing
an adoption path:

- `noUncheckedIndexedAccess`
  Indexed reads become honest about absence. This is often the fastest way to
  expose fake dictionary invariants and push missing-key handling into explicit
  control flow.
- `exactOptionalPropertyTypes`
  Distinguishes "key absent" from "key present with undefined". Use it to
  tighten drifting DTO or config invariants, but do not present flipping it as
  a pure refactor.
- `useUnknownInCatchVariables`
  Makes error paths honest and often reveals where error handling should be
  normalized at the boundary.
- `noImplicitReturns` and `noFallthroughCasesInSwitch`
  Useful when the real simplification win is smaller, more explicit control
  flow rather than more helper code.
- `noPropertyAccessFromIndexSignature`
  Makes dynamic keys visually explicit and helps separate real structure from
  stringly maps.

## TS Mechanics That Commonly Change The Best Move

- `satisfies` versus `as`
  Prefer `satisfies` for config-like tables when you want compatibility checks
  without throwing away literal precision.
- `interface` versus deep intersections
  Prefer named interfaces or named object shapes when intersections are harder
  to read than the domain object itself.
- named types and explicit return types
  Use them when giant inferred or computed types make reasoning IDE-dependent.
- `unknown` plus guards or assertion functions
  Prefer this over widespread `as` when boundary normalization is the real fix.

## Node Runtime Anchors

- Node type stripping is not type checking
  If the code runs via Node's TS support, remember that types are stripped,
  `tsconfig` is not enforced there, and TS syntax requiring JS emit such as
  `enum` may break expectations.
- `node:test` is a strong low-friction safety seam
  When behavior proof is thin, a small `node:test` characterization harness is
  often the fastest honest upgrade.

## Codemod Anchor

AST codemods are valid when the transformation rule is mechanically stable and
behavior-preserving.

Do not call a repo-wide codemod "safe" unless you can name:

- the exact transformation rule
- the proof surface for representative samples
- what result would show the batch is not actually mechanical

## Decision Rule

If the recommendation depends on one of the anchors above, name it explicitly.

Do not hide a flag-dependent or runtime-dependent recommendation behind general
phrases like "make the types stricter" or "clean up imports."
