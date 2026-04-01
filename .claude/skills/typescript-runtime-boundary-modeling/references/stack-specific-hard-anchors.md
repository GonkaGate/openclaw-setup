# Stack-Specific Hard Anchors

Use this reference when the boundary decision depends on concrete TypeScript,
Node, lint, or validator semantics rather than only on generic boundary
workflow.

## TypeScript hard anchors

- `unknown` is the safe counterpart of `any` for boundary input. It forces
  narrowing before use. Prefer it at real runtime edges.
- Type assertions, including `as T` and postfix `!`, do not add runtime
  checks. They can only reflect proof that already exists somewhere else.
- Assertion functions are valid only when the function itself performs a real
  runtime proof.
- Truthiness narrowing is dangerous at boundaries because valid values like
  `0`, `""`, and `NaN` can be dropped accidentally.

## Compiler and lint hard anchors

- `strictNullChecks` matters because `null` and `undefined` otherwise stop
  being boundary-visible problems.
- `noUncheckedIndexedAccess` matters because map or env access can otherwise
  look present in types when it is not guaranteed at runtime.
- `exactOptionalPropertyTypes` matters because "key absent" and
  "key present with `undefined`" are different runtime states.
- `useUnknownInCatchVariables` matters because thrown values are not guaranteed
  to be `Error` objects.
- type-aware lint rules like `no-unsafe-member-access` and
  `no-unsafe-assignment` are valuable containment aids for `any` leaks.

## Node boundary anchors

- treat `process.env` as string input, not as already-typed config
- parse env once in a dedicated config boundary
- export only the trusted config object from that boundary
- treat `catch (err)` as untrusted input and narrow it explicitly before use

## Validator hard anchors

- the stable decision is not "choose Zod"; it is "choose a mechanism whose
  semantics make the boundary reviewable"
- unknown-key behavior must be explicit:
  `reject`, `strip`, or intentional `passthrough`
- keep validation and normalization conceptually separate even if one tool does
  both
- if a validator transform can throw or has async semantics, the answer must
  name that caveat rather than assuming the happy path

## High-value concrete caveats

- Zod strips unknown keys by default; do not assume that default is the right
  policy everywhere
- strict-object modes are useful when extra keys should fail fast rather than
  vanish
- transform hooks are boundary-sensitive because they can blur proof and
  normalization if used carelessly
- async transforms require the async parse path; otherwise the boundary
  contract is wrong

## When to mention these anchors

Mention them only when they materially change the recommendation.

Do not turn every boundary answer into a config or linter lecture.
