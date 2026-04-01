# Signal Selection And Identity

Use this file when the hard part is choosing `throw` versus explicit error
value versus nullable return, or deciding what the stable identifier should be.

## Signal Defaults

### Programmer Bug Or Invariant Violation

- default:
  exception or rejected promise
- why:
  the caller is not supposed to branch on this as ordinary control flow

### Operational Infrastructure Failure

- default:
  exception or rejected promise until a higher layer deliberately translates it
- why:
  raw infrastructure failure is usually not the business contract yet

### Expected Branching Outcome

- default:
  explicit error value
- why:
  the caller is expected to branch on it as part of normal behavior

### Pure Absence

- default:
  nullable return only when absence is the sole expected non-success branch
- why:
  if the caller needs reason, context, or differentiation, nullable is too weak

### Cancellation Or Abort

- default:
  dedicated cancellation outcome or an explicitly recognized abort error
- why:
  cancellation often needs separate treatment from failure

## Identity Defaults

- keep machine identity on `code`, `kind`, or another stable discriminant
- treat `message` as human-readable text, not a machine protocol
- do not rely on class name alone when the code needs finer programmatic
  branching

## Repo-Local Anchors

- in this repo, typed `AppError.code` is the internal machine key
- full-sentence messages are for humans
- do not use internal error codes as the user-facing sentence

## Smells

- branching on `error.message`
- raw `Error` objects and string literals mixed into one outward union
- `null` hiding several different reasons
- expected "not found" or validation outcomes represented only as exceptions

## Strong Answer Test

A strong recommendation says:

- which failure family is being modeled
- which signal form owns it
- which stable field the next layer branches on
- why the simpler or more familiar alternative would still be semantically weak
