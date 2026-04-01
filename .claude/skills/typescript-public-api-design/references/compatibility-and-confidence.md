# Compatibility And Confidence

Use this file when the question is whether a public API change is safe or when
the visible evidence is incomplete.

## Compatibility Labels

Use:

- `non-breaking`
- `conditionally breaking`
- `breaking`

Always classify from the consumer side.

## Usually Breaking

- removing or renaming a public import path
- adding `exports` in a way that blocks previously used deep imports
- removing an export
- tightening a parameter type or making an option required
- removing a return field or narrowing a public union
- reordering overloads so a call site resolves differently

## Often Non-Breaking

- adding an optional option
- widening accepted input while preserving current behavior
- adding a new subpath or export without disturbing existing ones
- adding an optional result field when consumers are not required to handle it

## Condition Depends On Reality

Be careful when:

- current consumers rely on undocumented deep imports
- emitted `.d.ts` changed because inference shifted
- exhaustive switches over public unions may fail after adding variants
- module/version tooling (`typesVersions`, TS version, module mode) shapes what
  consumers actually see

## Confidence Calibration

Use high confidence only when you have most of:

- `package.json` `exports`
- `types` or `typesVersions`
- visible exported source
- emitted `.d.ts` or an equivalent public declaration artifact
- a clear TypeScript version or consumer environment

Lower confidence when one of those is inferred.

## Strong Answer Test

A strong answer says:

1. what changed
2. why the label fits
3. what missing fact could change the label

If it only says "should be safe" or "probably breaking," it is not ready.
