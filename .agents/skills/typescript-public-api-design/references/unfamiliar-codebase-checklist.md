# Unfamiliar Codebase Checklist

Use this file when the package or module is unfamiliar, the user asks for an
audit, or the real public surface is still partly inferred.

## 1. Find The Public Entry Truth

- inspect `package.json` for `exports`, `main`, `module`, `types`, and
  `typesVersions`
- list the actually supported import paths
- do not assume folder structure equals public contract

## 2. Find The Export Truth

- identify which values and types are exported from each supported entrypoint
- note whether exports are curated or just barrel-sprawl
- flag any public symbol that looks like an internal helper leaking outward

## 3. Read The Declaration Truth

- inspect emitted `.d.ts`, declaration rollups, or API reports if available
- look for unstable inferred return types, huge anonymous shapes, and leaked
  internal types
- treat declaration readability as part of API quality

## 4. Check Publication-Sensitive Compiler Facts

- verify whether `strict: true` is in effect for the published types
- check `verbatimModuleSyntax` when module/import behavior matters
- check whether `isolatedDeclarations` is enabled or whether exported symbols
  at least follow that discipline
- note any `typesVersions` split or module-mode split that changes what
  consumers see

## 5. Inspect The Highest-Cost Public Shapes

- overload-heavy exported functions
- generic APIs that may not justify their type parameters
- option bags with unclear growth or unclear modes
- public unions or result types that may need discriminants

## 6. Check Compatibility Hazards

- undocumented deep imports that consumers may already rely on
- conditional exports that could change import style across environments
- public types that may drift when TypeScript inference changes
- additive union changes that could break exhaustive consumers

## 7. Classify What You Found

Sort findings into:

- module surface problem
- signature-shape problem
- public type ergonomics problem
- compatibility/evolution problem
- adjacent-topic handoff

This keeps the answer from collapsing into vague library-cleanup commentary.

## 8. Calibrate Confidence

- `high`: package metadata, exports, and declaration surface are visible
- `medium`: source is visible but published declaration or metadata truth is
  inferred
- `low`: only prompt text or partial snippets are available

If confidence is not high, say which missing public artifact would most change
the conclusion.
