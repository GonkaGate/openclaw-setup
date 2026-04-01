# TS Hard-Skill Control Points

Use this file when the implementation decision depends on a concrete TypeScript
modeling move, not just on general workflow discipline.

Keep it narrow. Apply one control point only when it materially improves the
touched seam.

## 1. Registry And Literal Precision

- use `satisfies` when a registry must match a target shape without widening
  away literal keys or values
- prefer this over broad annotations or `as SomeType` when later indexed access
  or exhaustiveness depends on preserved literals
- if the goal is just checked construction, prefer the smallest honest object
  shape instead of a helper stack

## 2. Discriminant And Typestate Shape

- prefer one required literal discriminant such as `kind`, `state`, or `status`
- keep branch-only fields inside their branch instead of centralizing them as a
  loose optional bag
- if several optional checks are required to branch safely, the model likely
  wants a union instead of a bag of maybe-fields
- prefer a shallow state/event registry over deeper generic machinery when
  transition safety matters but readability must survive

## 3. Boundary Parse Shape

- accept `unknown` at real runtime edges unless a weaker raw type is
  intentionally still untrusted
- choose one parser contract deliberately:
  - return trusted value directly when throw-on-failure is the boundary contract
  - return `Result` when the caller genuinely composes on parse failure
  - use `asserts` only when the function itself performs real runtime proof
- keep validated, normalized, and trusted internal shapes conceptually
  separate even when one function performs more than one step

## 4. Result-Flow Shape

- prefer the smallest honest public form:
  - plain value or `Promise<T>` for locally infallible steps
  - `Result<T, E>` for synchronous composed failure
  - `ResultAsync<T, E>` when the function can stay non-`async` and pipeline
    style is genuinely clearer
  - `Promise<Result<T, E>>` when `async` / `await` and local branching read
    better
- do not recommend `ResultAsync` for an `async function` signature
- use `fromAsyncThrowable` or `ResultAsync.fromThrowable` when sync throw before
  promise creation is part of the risk
- use `map` only for no-fail transforms and `andThen` for fallible next steps

## 5. `ts-pattern` Fit And Finalizer Choice

- reject `ts-pattern` when the branch is sequential, algorithmic, or still
  boundary-validation work
- use `.exhaustive()` for a closed trusted input
- use `.otherwise(...)` only for a deliberately partial contract
- treat `.run()` as an unsafe escape hatch
- broad early object patterns can swallow later specific branches; first-match
  semantics are part of correctness, not style

## 6. Helper Selection Discipline

- choose the first option that fully captures the invariant:
  1. plain named type
  2. one built-in utility
  3. small utility composition
  4. focused `type-fest` helper
- `DistributedOmit` is for preserving discriminated-union behavior after
  omission
- `Simplify` should fix a real boundary-facing readability or assignability
  symptom, not act as decoration
- if the helper stack is longer than the invariant explanation, prefer a named
  resulting type

## 7. Semantic Traps Worth Naming Explicitly

- `prop?: T` and `prop: T | undefined` are different models
- `"key" in value` proves presence, not a non-`undefined` value
- `??` and `||` are not interchangeable at value boundaries
- `as` and postfix `!` do not create proof
- utility types do not enforce runtime exactness

## Strong Answer Test

If you use this file, the final answer should be able to name:

- the exact control point chosen
- the tempting nearby alternative
- why the chosen move is safer or clearer on this seam
