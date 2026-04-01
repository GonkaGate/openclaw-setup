# Stack-Specific Hard Anchors

Use this file when the answer depends on concrete TypeScript or Node semantics
rather than only on abstract boundary rules.

## TypeScript Hard Anchors

- `useUnknownInCatchVariables` matters because thrown values are not
  guaranteed to be `Error` objects.
- `new Error(message, { cause })` depends on modern `ErrorOptions` typing and
  is the standard shape for cause-preserving wrapping.
- `null` or `undefined` is only an honest boundary result when absence is the
  only expected non-success branch; otherwise you need an explicit reason
  carrier.
- discriminated unions are the hard-skill default for expected branching
  outcomes because they keep the branch surface explicit and reviewable.

## Node Error Identity Anchors

- do not treat `error.message` as a machine contract; Node documents message as
  unstable across versions.
- prefer `error.code` as the stable programmatic identifier for ordinary Node
  and system failures.
- for `DOMException`, identify by `name`, not by `message`.
- `SystemError` fields such as `code`, `errno`, `syscall`, `path`, `address`,
  and `port` are the right translation anchors when turning low-level failures
  into domain or application meaning.

## Context-Preservation Anchors

- `cause` is the default context-preservation mechanism; do not invent
  ad-hoc `originalError` chains unless a concrete integration forces it.
- wrapping is justified when you add operation-specific context, not when you
  only restate "Failed to X".
- `Error.captureStackTrace` is an optional hard-skill tool when a custom error
  class needs cleaner top frames, but it is not a reason to hand-roll stack
  composition everywhere.

## Delivery-Boundary Anchors

- promise rejection is part of the error model, not a separate afterthought.
- unhandled rejections are operationally serious; verify the runtime policy
  before assuming they are harmless.
- EventEmitter or stream `'error'` without a listener is a real boundary bug,
  not just a logging omission.
- outer `try/catch` does not intercept later `'error'` events once control has
  returned.

## Runtime And Tooling Anchors

- source-map behavior matters when stack traces are part of the debugging
  value of the boundary design.
- native TypeScript execution in Node changes what `tsconfig` and source-map
  assumptions are safe; verify whether the code is transpiled or uses type
  stripping or transform modes.
- `Error.isError` is a useful hard anchor only when the visible Node version
  actually supports it; otherwise fall back to more portable normalization.

## When These Anchors Matter

Mention these only when they change the recommendation.

Do not turn every answer into a runtime trivia dump.

The value of this file is making a strong answer more exact when generic
boundary advice would otherwise glide past a concrete TS or Node constraint.
