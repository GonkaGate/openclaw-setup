# Parser Shape Rules

Choose code shapes that make trust visible in review.

## Preferred signatures

Use one of these when they fit:

```ts
function parseInput(input: unknown): TrustedInput
```

```ts
function parseInput(input: unknown): Result<TrustedInput, ParseIssues>
```

```ts
function assertInput(input: unknown): asserts input is TrustedInput
```

## Rules

- Accept `unknown` at the real runtime edge unless a weaker raw type is
  intentional and still not trusted.
- Return the trusted output directly only when throwing on failure is the
  desired boundary contract.
- Return a structured result when the caller needs explicit error handling.
- Use assertion functions only when the function itself performs real runtime
  checks.
- Keep validation and normalization in the same boundary layer unless there is
  a clear, reviewable reason to split them.
- Keep the trusted output smaller than the raw input when that reduces the
  trusted surface honestly.

## Manual guard versus schema-derived parser

Prefer manual guards when:

- the shape is tiny
- the proof is easy to read in one screen
- reuse pressure is low
- unknown-key policy is trivial

Prefer schema-derived parsing when:

- the shape is nested or reused
- unknown-key policy must be explicit
- transform or default policy matters
- you need a clear derived trusted type tied to the runtime proof

## Layering rule

Do not let core or domain modules depend directly on:

- request DTOs
- provider payload types
- DB record types
- cache wire shapes

Put the mapper or parser at the boundary and export the trusted internal
shape.
