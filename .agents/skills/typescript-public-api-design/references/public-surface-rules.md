# Public Surface Rules

Use this file when the question is mainly about entrypoints, exports, emitted
types, or public-surface sprawl.

## Public Surface = Paths + Symbols + Declarations

Treat the public API as the combination of:

- supported import paths
- exported values and types
- the declaration surface consumers compile against

If one of those changes, the public API changed.

## Entry Point Discipline

- Prefer one canonical root entrypoint or a small deliberate set of subpaths.
- Treat `package.json` `exports` as the contract for supported import paths.
- Do not treat repo file layout as public API.
- Deep imports are internal unless intentionally exported.

## Package Metadata Discipline

- `types` or `typings` is part of the public contract, not packaging garnish.
- `typesVersions` changes what different TypeScript consumers see and should be
  reviewed like an API decision, not a hidden compatibility trick.
- If `exports` and type entrypoints tell different stories, the public surface
  is already drifting.

## Export Curation

- Export names, not project structure.
- Do not barrel-export internals "for convenience" unless they are truly part
  of the supported surface.
- Each extra export increases long-term review and compatibility burden.

## Declaration Discipline

- Review emitted `.d.ts`, not only source code.
- If an exported function's inferred return type is large, unstable, or leaks
  internals, give it an explicit public return type.
- Treat `isolatedDeclarations` as a useful discipline even if the project does
  not enable it yet.
- If the project has an API report or declaration rollup, use it as a better
  public-surface review artifact than raw source browsing alone.

## Compiler And Publication Safety Levers

- `strict: true` matters for public libraries because weak declarations often
  break in stricter consumer projects.
- `verbatimModuleSyntax: true` is public-surface relevant when import/export
  behavior must survive different consumer toolchains.
- Module-mode and publish-time choices belong here when they change supported
  imports or emitted declaration interpretation.

## Strong Answer Test

A strong answer names:

1. which import paths are supported
2. which exports should exist
3. what declaration shape the consumer will actually see
4. which metadata or compiler setting the recommendation depends on

If one of those is missing, the answer is usually still too shallow.
