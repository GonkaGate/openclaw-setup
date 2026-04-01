# Layer Translation And Shaping

Use this file when the hard part is deciding where an error should be created,
enriched, translated, or shaped.

## The Four Ownership Moments

### Create

- create the raw error where the primary failure is actually understood
- infrastructure adapters usually own raw system, SDK, or network failures

### Enrich

- add context where new operation-specific information becomes known
- use `cause` when that new context is worth preserving
- do not enrich with repeated "Failed to X" wrappers that add nothing new

### Translate

- translate when responsibility changes between layers
- common examples:
  infrastructure failure -> domain or application outcome
  low-level code -> stable internal `code` or `kind`

### Shape

- shape when a caller-facing contract begins
- this is where low-level detail is hidden and stable outward meaning is fixed

## Healthy Layer Defaults

### Infrastructure

- accept raw system or provider failures
- prefer stable recognition on fields such as `code` rather than message text

### Domain Or Application

- keep expected branching outcomes explicit
- let bugs and impossible states stay exceptional
- do not mix expected domain outcomes and raw infrastructure exceptions for the
  same caller contract

### Transport Or Outer Boundary

- map expected internal outcomes to stable caller-facing shapes
- sanitize unexpected internal failures before they become public

## Repo-Local Boundary Defaults

- services and utils may keep expected failures explicit, often as
  `Result`-style values
- route or handler boundaries may convert those expected failures into
  `AppError`
- the final `/v1*` or `/api*` envelope belongs to transport and error-handler
  surfaces, so this skill should name that handoff without turning into a
  contract-design skill

## Smells

- raw provider or system errors leaking unchanged into outward caller shapes
- translation happening repeatedly at many layers instead of at ownership
  changes
- domain code sometimes returning explicit outcomes and sometimes throwing raw
  infrastructure errors for the same reason
- public shaping logic depending on unstable message text

## Strong Answer Test

A strong boundary recommendation says:

- where the raw failure originates
- where new context is worth adding
- where the identity becomes stable for the next layer
- where the outward shape begins
