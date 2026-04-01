# Delivery Boundaries And Context

Use this file when the answer depends on caught values, `cause`, promise
rejection, emitter or stream errors, or runtime-version caveats.

## Context Preservation Defaults

- normalize caught `unknown` values before depending on `message`, `stack`, or
  `code`
- use `cause` when adding new operational context
- wrap only when the wrapper contributes useful new information
- do not throw literals or arbitrary values if you want predictable error
  behavior and stack context

## Delivery-Boundary Defaults

### Promise Rejection

- treat rejected promises as part of the error model, not as a separate topic
- account for floating promises and unhandled rejection behavior when the
  operation still depends on the failure path

### EventEmitter Or Stream `'error'`

- if the path uses emitters or streams, define the `'error'` strategy
  explicitly
- do not assume outer `try/catch` will intercept later event delivery

## Version-Sensitive Notes

- the shared research is anchored on Node.js 24 LTS+
- this repo's default context is Node.js 20+ LTS
- core guidance around `cause`, message instability, and delivery boundaries is
  durable across that gap
- version-sensitive details such as `Error.isError`, native TypeScript
  execution behavior, or exact CLI defaults must be verified before they are
  treated as facts

## Smells

- `catch { return null; }` without a deliberate contract
- repeated wrapper layers that say "Failed to X" but add no new fields
- promise-returning work launched without any failure ownership
- streams or emitters with no clear `'error'` handling strategy

## Strong Answer Test

A strong answer says:

- how raw caught values become safe to inspect
- where `cause` is preserved
- which delivery mechanisms matter on this path
- which runtime facts are observed versus assumed
