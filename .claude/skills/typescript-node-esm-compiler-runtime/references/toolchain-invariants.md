# Toolchain Invariants

Use this reference to keep the seam anchored on the few rules that stay true
even when the surrounding tooling changes.

## Three Truth Sources

Every answer in this topic should identify all three:

1. `Runtime truth`
   Node's actual resolver and loader behavior for the executed entrypoint.
2. `Compiler truth`
   What TypeScript resolves, preserves, rewrites, or emits.
3. `Artifact truth`
   The files and import strings that actually exist on disk.

If two of the three are aligned but one is not, the system is still broken.

## Stable Platform Invariants

- Relative ESM specifiers in Node need real file extensions.
- Node ESM does not do directory-import magic for `./dir`.
- `package.json` `"type"` decides whether `.js` is treated as ESM or CJS
  within that package boundary.
- `.mjs` is always ESM and `.cjs` is always CJS.
- Node executes files on disk, not the source graph you intended.
- Node does not read `tsconfig.json` when resolving runtime imports.
- Node-native package contracts live in `package.json` `"exports"` and
  `"imports"`.
- `tsconfig.paths` is not a native Node runtime contract.
- Nested `package.json` boundaries can silently change what `.js` means.

Treat these as platform behavior, not preferences.

## TypeScript-Specific Truths

- Node-oriented resolution modes can accept `./x.js` in source and resolve that
  to `x.ts` during compile time.
- That does not change the emitted import string. The emitted string still has
  to be valid for the runtime.
- `verbatimModuleSyntax` matters when import preservation and type-only import
  honesty are part of correctness.
- `import type` and `export type` are not decoration when native `.ts`
  execution or preserved module syntax is part of the contract.
- `allowImportingTsExtensions` only makes sense when the runtime truly executes
  `.ts` paths or there is no runnable JS emit.

## Package-Boundary Truths

- `package.json` `"type"` is part of runtime truth, not an optional style flag.
- `package.json` `"imports"` is a Node-native internal alias contract;
  `tsconfig.paths` is not.
- Importing CommonJS from ESM is not symmetric with ESM-to-ESM imports, so
  default import plus explicit destructuring is often the safer starting
  posture.

## Runtime-Mode Split

Keep these modes separate:

- `compiled-js`
  `tsc` or another compiler emits runnable JS and Node executes that JS.
- `native-ts`
  Node executes `.ts` with type stripping. This ignores most `tsconfig`
  behavior and is not "full TypeScript support."
- `runner-mediated`
  A tool such as `tsx` or `ts-node` changes what can run locally. This mode is
  only safe when its contract is intentionally part of the runtime story.

Do not borrow advice from one mode and silently apply it to another.

## Source Of Truth Ladder

When the repo is available, prefer this order:

1. actual `node` or runner commands
2. nearest `package.json`
3. effective `tsconfig`
4. source import strings
5. emitted JS import strings
6. error text or stack trace

The answer gets weaker each time one of those layers is missing.
