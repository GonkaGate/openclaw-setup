# Unfamiliar Codebase Checklist

Use this checklist when the repository is unfamiliar and you need the fastest
path to the real compiler/runtime contract.

## 1. Find The Real Start Commands

Inspect:

- production start command
- local dev command
- test command
- CI command

Goal:

- identify whether the runtime contract is emitted JS, native `.ts`, or a
  runner/loader flow

## 2. Find The Format Boundary

Inspect:

- nearest `package.json`
- nested `package.json` files on the path to the entrypoint
- `"type"`
- `"exports"` and `"imports"`
- entrypoint file extensions

Goal:

- identify what makes `.js` mean ESM or CJS in the executed package scope

## 3. Find The Effective Compiler Contract

Inspect:

- effective `tsconfig`
- `module`
- `moduleResolution`
- `verbatimModuleSyntax`
- `rootDir` and `outDir`
- emit-related settings
- whether config layering hides the real values

Goal:

- identify what TypeScript thinks it is compiling for

## 4. Inspect Source Specifiers

Scan for:

- extensionless relative imports
- directory imports
- `.js` relative imports
- `.ts` relative imports
- `#` imports and `tsconfig.paths` aliases
- missing `import type` in files that look type-heavy
- aliases that look like compile-time conveniences

Goal:

- infer the intended runtime mode and spot obvious mismatch smells

## 5. Inspect One Or Two Real Artifacts

If the project emits JS, inspect emitted files in `dist/`.

Goal:

- verify whether emitted import strings already match what Node will resolve

## 6. Compare Runner Behavior To Production

Inspect whether dev/test tools are allowing behavior that the production start
command would reject.

Goal:

- prevent false confidence from runner-only success
- catch package/alias/specifier behavior that only the runner is masking

## 7. End With The Smallest Proving Check

Examples:

- run the real production start command against a built artifact
- inspect one failing emitted import string
- compare `tsc --showConfig` with the assumed config

Do not finish with a broad recommendation if one small direct check can
separate the likely causes.
