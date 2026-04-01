# Stack-Specific Hard Anchors

Use this reference when the verdict depends on exact TS or runtime-boundary
facts rather than generic "type safety" advice.

## Core Truths

- TypeScript types erase at runtime. `as`, `!`, and utility types do not add
  runtime validation.
- `unknown` forces proof before use; `any` bypasses it.
- A value is not trusted just because it has been assigned a named type.

## Strictness Anchors

- `strict` alone is not the whole safety posture.
  Optionality, indexed-access, and `catch` guarantees still depend on specific
  flags.
- `exactOptionalPropertyTypes`
  absence and `prop: undefined` are not the same claim
- `noUncheckedIndexedAccess`
  indexed access may still be missing even when the container type is known
- `useUnknownInCatchVariables`
  caught errors are not safely assumed to be `Error`

If the verdict depends on these settings and the effective config is not
visible, reduce confidence.

## Language-Core Anchors

- `satisfies` checks compatibility without replacing the expression's inferred
  type
- `as const` preserves literals and readonly at compile time only
- discriminated unions need a stable literal discriminant to narrow safely
- non-null `!` is a promise from the author, not proof from the compiler

## Inference And Modeling Anchors

- plain type annotations can erase literals and collapse a safe registry or
  discriminated model into a weaker shape; `satisfies` is often the narrower
  correctness tool when the goal is "check this shape without losing literals"
- `NoInfer<T>` exists to stop inference from the wrong position.
  If a generic API accepts a too-broad "matching" value because inference
  flowed backward from the wrong argument, that is a real soundness clue, not
  only an API taste issue
- `const` type parameters and literal-preserving patterns are often the honest
  way to keep a variant or key union precise; replacing them with wider
  `string` or `Record<string, ...>` shapes can silently break narrowing
- `unique symbol` is the preferred nominal barrier when mixed identifiers are
  a real correctness risk; plain aliases over `string` or `number` do not stop
  accidental interchange

## Utility-Type Anchors

- utility helpers do not strip keys or validate runtime shape
- `Omit` on unions may destroy the variant separation the runtime depends on
- a helper stack can make a type look exact while still hiding a broader
  assignability reality
- distributive conditional types apply over naked type parameters.
  Union-safe helpers such as `DistributedOmit` exist because plain helper use
  over unions can collapse the exact distinction the runtime relies on

## Boundary Anchors

- `process.env` values arrive as strings and require runtime parsing
- DB JSON, cache payloads, external API responses, and `JSON.parse` outputs are
  runtime-boundary inputs even if local code immediately annotates them
- partial validation does not justify whole-object trust
- unknown-key behavior is a runtime parser policy.
  Do not infer `strip`, `reject`, or passthrough behavior from TypeScript types
  alone.
- result-style parse APIs do not make a value trusted by themselves.
  The value becomes trusted only inside the success branch that actually checks
  the parser result
- async validator transforms require async parse APIs.
  A synchronous parse call against an async transform path is not a harmless
  detail; it changes whether the claimed boundary proof even ran

## Public-Surface Anchors

- exported signatures and emitted declarations are compatibility promises
- "the implementation happens to check it later" does not make an earlier
  exported type claim honest
- source types are not automatically consumer truth if the emitted declaration
  surface or re-export path changes what consumers actually see
- inference-heavy exports can drift in emitted `.d.ts` even when the source
  looks locally safe; explicit export typing or declaration-oriented checks may
  matter when the safety claim is public
