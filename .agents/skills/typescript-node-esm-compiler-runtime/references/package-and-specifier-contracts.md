# Package And Specifier Contracts

Use this reference when the hard part is not "which compiler flag exists?" but
"what exact import and package contract will Node honor?"

## Package Boundary Rules

- The nearest relevant `package.json` helps decide what `.js` means.
- Nested package boundaries can change module format without touching the
  source file.
- `.mjs` always means ESM and `.cjs` always means CJS.
- `"exports"` and `"imports"` are runtime contracts Node understands; they are
  not IDE hints.

Treat these as runtime truth, not compiler preferences.

## Relative Specifier Strategy

Choose the specifier style from the runtime mode, not from source-file
extension alone.

- If Node will execute emitted JS, prefer `.js` relative specifiers in source.
- If Node will execute `.ts` directly, `.ts` relative specifiers may be valid,
  but only because `.ts` itself is the runtime contract.
- Do not rely on extensionless relative imports in Node ESM.
- Do not rely on directory imports as if Node will pick `index.js`.

The question is always: what exact string will Node see at runtime?

## Alias Strategy

Use the smallest alias system that the real runtime understands.

- Prefer `package.json#imports` for Node-native internal aliases.
- Treat `tsconfig.paths` as compile-time-only unless another layer explicitly
  rewrites or resolves it at runtime.
- If a runner makes an alias work locally, that is not yet production proof.

## CommonJS Interop

When importing a CommonJS dependency from ESM:

- start by checking whether the package is actually CJS
- do not assume named imports behave like native ESM
- default import plus explicit destructuring is often the safer baseline

Interop advice should name the dependency format it depends on.

## Decision Prompts

Use these questions before recommending a package/specifier change:

1. What exact file does Node execute first?
2. Which `package.json` boundary decides the meaning of that file?
3. What exact import string will exist in the executed artifact?
4. Does Node itself understand that alias or only the compiler/runner?
5. Is the recommendation preserving one runtime contract or mixing several?
