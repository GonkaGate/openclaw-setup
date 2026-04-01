# Minimal Config Surfaces

Use this reference when the question is "what is the smallest correct setup?"
not "what are all the knobs?"

## Mode 1: `tsc -> dist -> node`

Default production shape for backend services.

Prefer:

- Node-oriented module settings such as `nodenext` or an intentionally frozen
  Node mode
- explicit `rootDir` and `outDir`
- `verbatimModuleSyntax`
- `noEmitOnError`
- source maps only when the runtime will actually consume them
- `.js` relative specifiers in source when Node will execute emitted JS

Why:

- the emitted JS keeps the runtime contract visible
- relative imports can already match real files in `dist/`
- failures show up in the same artifact form that production uses
- the config surface stays small enough that the runtime contract remains
  inspectable

## Mode 2: Node Native `.ts` Execution

Use only when the runtime intentionally executes `.ts`.

Remember:

- Node still needs explicit extensions
- Node does not honor `tsconfig.paths`
- type stripping is not type checking
- `import type` discipline matters more here, not less
- syntax that needs JS transformation is not automatically safe here
- `.ts` relative specifiers are only correct when `.ts` itself is the runtime
  contract

This mode is narrower than many teams assume.

## Mode 3: Runner-Mediated Dev/Test

Examples: `tsx`, `ts-node`, loader-based flows.

Treat as safe only when:

- the runner is intentionally part of the supported runtime contract, or
- it is clearly a dev/test convenience and parity checks exist against the real
  production mode

If the real contract is `node dist/...`, runner success is not proof.

## Choice Points That Need Explicit Justification

### `.js` vs `.ts` relative specifiers

- choose `.js` when emitted JS is the runtime contract
- choose `.ts` only when `.ts` itself is the runtime contract

### `nodenext` vs frozen Node modes

- choose `nodenext` when tracking current Node behavior is acceptable
- choose a frozen Node mode only when stability against compiler drift matters
  more than following the newest Node semantics

### `tsconfig.paths` vs `package.json#imports`

- choose `package.json#imports` when Node must understand the alias itself
- treat `tsconfig.paths` as a compile-time convenience unless another runtime
  translation layer is explicitly part of the system

### `rewriteRelativeImportExtensions`

- use it only when the chosen runtime mode and source-specifier strategy
  actually need rewrite help
- do not add it as ritual config

### Source maps

- keep them when the debugging contract needs remapped stacks
- do not treat them as mandatory compiler cargo when the runtime never consumes
  them

## Smell Test

If a proposed setup needs many flags, loaders, and alias tricks just to make
imports work, first ask whether the runtime contract itself is overcomplicated.
