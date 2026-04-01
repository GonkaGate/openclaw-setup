# Unfamiliar Codebase Checklist

Use this order when auditing boundary quality in a repo you did not author.

## First pass: find the real trust points

- Search for `parse`, `decode`, `validate`, `assert`, and boundary mappers.
- Search for `unknown`, `as any`, `as unknown as`, and postfix `!` near
  external input.
- Check whether boundary modules are obvious or whether trust is smeared across
  handlers and services.

## Second pass: inspect guardrails

- Inspect the effective `tsconfig`.
- Look for `strict`, `strictNullChecks`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, and `useUnknownInCatchVariables`.
- Check whether type-aware linting blocks `any` leaks through `no-unsafe-*`
  rules.

## Third pass: inspect layering

- Does core or domain code import request DTOs, DB records, or cache wire
  types?
- Is there one config module that parses `process.env` at startup?
- Are adapter responses mapped before they enter service logic?
- Are JSON or polymorphic fields parsed before they are treated as trusted?

## Fourth pass: inspect proof quality

- Are unknown-key policies visible?
- Are nested fields actually checked when they are later trusted?
- Are negative tests present for malformed input and partial payloads?
- Are transform and default rules centralized and deterministic?

## Confidence rule

If you cannot see the real parser, effective compiler options, or layer
imports, reduce confidence instead of speaking as if the boundary is known.
