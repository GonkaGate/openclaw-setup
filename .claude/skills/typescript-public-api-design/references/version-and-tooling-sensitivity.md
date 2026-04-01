# Version And Tooling Sensitivity

Use this file when TypeScript version, module mode, publication settings, or
consumer environment may change what the public API actually means.

## Treat These As Public-Surface Inputs

- `typesVersions`
- `verbatimModuleSyntax`
- module mode such as `node20`, `nodenext`, or `bundler`
- conditional exports
- emitted declaration behavior
- `lib.d.ts` changes across TS versions

If one of these changes what consumers import or what types they see, it is
part of the public API discussion.

## High-Value Checks

### `typesVersions`

- use it only when different TS consumers truly need different declaration
  surfaces
- remember it affects what external consumers resolve, not how your `.d.ts`
  files import each other internally

### Module And Import Semantics

- `verbatimModuleSyntax` matters when public import/export behavior must remain
  honest across toolchains
- `node20` can be a more stable public module target than a floating
  `nodenext` story when predictability matters
- conditional exports are part of the contract, not packaging trivia

### Declaration Stability

- inferred exported types can shift across TS versions
- `lib.d.ts` changes can affect public binary/data APIs involving `Buffer`,
  `Uint8Array`, or `ArrayBuffer`
- when version sensitivity is real, say so explicitly and lower confidence

### Dual-Format Hazards

- if supporting both ESM and CJS entrypoints, remember that module-shape
  differences and dual-package hazards can leak into the public contract
- do not talk about dual-format exports as a free compatibility win

## Strong Answer Test

A strong answer says:

1. which tooling/version fact matters
2. whether the recommendation is durable or environment-shaped
3. what consumers would actually observe if that fact changed

If it only gives one universal rule, it is probably flattening an important
dependency.
