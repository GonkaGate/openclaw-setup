# Inspection Checklist

Use this reference when the repository is unfamiliar, the diff is broad, or
the review touches several safety surfaces at once.

## 1. Effective Compiler Baseline

- check whether the effective `tsconfig` or strictness assumptions are visible
- check whether the verdict depends on:
  - `strict`
  - `exactOptionalPropertyTypes`
  - `noUncheckedIndexedAccess`
  - `useUnknownInCatchVariables`
- check whether type-aware lint guardrails are visible when the review depends
  on `any` leakage control

If those facts are missing, lower confidence before writing findings.

## 2. Boundary Trust Sweep

- locate ingress points:
  request input, `process.env`, `JSON.parse`, external SDK results, DB JSON,
  cache payloads, caught errors
- locate the parser, guard, assertion helper, or normalizer that is supposed
  to pay for trust
- check whether the validated surface matches the trusted claim
- check whether unknown-key behavior is visible or only assumed

## 3. Internal Model Sweep

- check whether discriminants stay preserved through helpers and wrappers
- check whether an option bag is pretending to be a real state model
- check whether structurally compatible identifiers or domain strings are being
  mixed accidentally
- check whether a generic or mapped/conditional helper widens a precise
  invariant into a looser shared shape

## 4. Inference-Control Sweep

- check whether a registry or constant table was widened by annotation when the
  code really needed literal preservation
- check whether `satisfies` would preserve a safety-relevant discriminant or
  key union better than the current annotation or cast
- check whether a generic API is inferring from the wrong argument position
- check whether missing `NoInfer<T>` or a literal-preserving generic boundary
  is allowing an unsafe "match" that looks type-safe
- check whether a nominal barrier is actually needed because structurally equal
  IDs or tokens are being mixed

## 5. Escape-Hatch Sweep

- check for `any`
- check for `as Foo`
- check for `as unknown as Foo`
- check for non-null `!`
- check for assertion helpers that look authoritative but do not prove enough
- check for suppression comments or wrappers that simply hide the unsafe edge

Ask:

- is the escape hatch merely expressing already-earned knowledge, or is it
  creating trust from nowhere?

## 6. Helper-Composition Sweep

- check whether `Pick` or `Omit` is being applied to unions safely
- check whether a union-safe helper such as `DistributedOmit` was needed but
  the code used a plain helper that collapses variants
- check whether utility stacks preserve the distinction the runtime relies on
- check whether a helper is hiding the final shape instead of clarifying it
- check whether the review complaint is actually "too complex" rather than
  "actually unsound"

## 7. Public-Surface Sweep

- check exported overloads, unions, generics, and options objects
- check whether the exported type surface promises validation or normalization
  that did not happen
- check whether visible source types and emitted declarations appear aligned
- check whether inference-heavy exports should be judged from emitted `.d.ts`
  rather than only from local source readability

## Stop Rule

Do not turn the whole checklist into findings.

Keep only the checks that prove:

- a broken safety claim
- a real trust leak
- a public overpromise
- or a missing-proof gap that materially blocks confidence
