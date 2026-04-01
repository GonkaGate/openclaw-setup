# Runtime Failure Modes

Use this reference to turn symptoms into likely mismatch seams and first
checks.

## `ERR_MODULE_NOT_FOUND`

Usually means one of:

- extensionless relative import in Node ESM
- emitted import string points to the wrong file or extension
- alias works in TypeScript or a runner but not in Node

First checks:

- inspect the exact import string in the executed or emitted file
- inspect whether the target file exists with that exact extension
- inspect whether Node is expected to resolve an alias it does not know

## `ERR_UNSUPPORTED_DIR_IMPORT`

Usually means a directory import like `./dir` or `./dir/` is being treated as
if Node ESM would resolve `index.js`.

First checks:

- inspect the specifier
- replace it with the explicit file path the runtime should load

## `Cannot use import statement outside a module`

Usually means the runtime classified the file as CJS when the source or emit
assumed ESM.

First checks:

- inspect the nearest `package.json` `"type"`
- inspect whether a nested package boundary changes what `.js` means
- inspect the file extension being executed
- inspect whether the executed artifact is really the built output you think it
  is

## `Unknown file extension '.ts'` or similar runtime refusal

Usually means Node is executing `.ts` without the runtime mode actually
supporting it.

First checks:

- inspect whether the command is plain `node` against a `.ts` entrypoint
- inspect whether the intended mode is native `.ts`, runner-mediated, or
  compiled JS
- inspect whether the project accidentally mixed `.ts` entrypoints into a
  compiled-JS contract

## Compiles Fine, Fails Only In `node dist/...`

Usually means dev/test tooling is more permissive than production.

First checks:

- compare local/test command with the production start command
- inspect whether the runner allowed aliases, extensionless imports, or `.ts`
  execution that production does not

## Emitted JS Still Imports `.ts`

Usually means the specifier strategy does not match the emit/runtime mode.

First checks:

- inspect whether the project is supposed to emit runnable JS
- inspect whether `.ts` imports were allowed for a no-emit or native-TS mode
  but copied into an emit pipeline

## Types Work, Runtime Import Fails

Usually means TypeScript's type world and Node's value world were treated as if
they were the same.

First checks:

- inspect whether `import type` is missing
- inspect whether the runtime is trying to load a symbol that existed only for
  type checking
- inspect whether preserved module syntax or native `.ts` execution makes that
  mismatch visible

## Named Import From CommonJS Behaves Strangely

Usually means the import style assumes ESM semantics for a CJS package.

First checks:

- inspect the dependency format
- inspect whether default import plus destructuring is the safer interop shape

## Source Maps Do Not Point Back To Source

Usually means the emitted mapping or Node runtime flags do not match the
intended debugging contract.

First checks:

- inspect whether source maps are emitted
- inspect whether the runtime starts with source-map support when expected

## Unsupported Syntax At Runtime

Usually means TypeScript accepted or preserved syntax that the chosen Node
runtime or execution mode does not actually support.

First checks:

- inspect whether the syntax depends on bundler transform or newer runtime
  support
- inspect whether the answer is assuming a different execution mode than the
  real one
