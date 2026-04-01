# Evolution And Visibility Rules

Use this file when the task is about changing a public API over time rather
than only choosing its shape once.

## Public Evolution Is Part Of API Design

Treat public evolution as first-class design work:

- what stays supported
- what becomes discouraged
- what is removed or hidden
- what different consumers will still compile against during the transition

## Prefer Explicit Evolution Controls

Use explicit controls instead of informal intent:

- deprecation markers for still-supported but discouraged surface
- curated `exports` changes for module-surface control
- declaration/API report review for release-surface drift
- visibility/release tagging when the toolchain supports it

## Deprecation Discipline

- deprecate when consumers need migration time
- say what replaces the old surface
- do not treat "we stopped documenting it" as deprecation
- remember that adding a new preferred path does not by itself make the old one
  disappear safely

## Visibility Discipline

- prefer curated exports over accidental file exposure
- if using release-surface tools such as API Extractor, review release tags and
  trimmed surfaces as part of the API contract
- if relying on `stripInternal`, treat it as a risky low-level lever, not a
  full public-visibility strategy

## Usually Safer Evolution Moves

- add an optional option instead of a new parallel overload set
- add a new entrypoint without disturbing existing supported ones
- add a discriminated variant only when you are willing to own the exhaustive
  consumer impact
- deprecate before removing when usage reality is uncertain

## Strong Answer Test

A strong answer says:

1. what the current public surface is
2. what the target public surface is
3. which mechanism controls the transition
4. what consumers must change, if anything

If those are missing, the answer often treats public evolution too casually.
