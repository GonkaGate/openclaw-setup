# Signature Choice Guide

Use this file when the public design question is "what shape should this
exported function or type surface have?"

## Decision Rules

### Use A Union When

- the argument can be one of a few shapes
- the return type does not meaningfully change across those shapes

This usually beats multiple overloads for the same runtime behavior.

### Use Overloads When

- distinct call forms intentionally produce different result types
- the overloads tell a real consumer story

Rules:

- put more specific overloads before more general ones
- do not create overloads that differ only in tail args when optional
  parameters would do
- do not create callback-arity overloads just because consumers may ignore
  later parameters

### Use A Generic When

- it relates types across the signature
- it improves consumer inference

Red flags:

- the type parameter appears only once
- the generic makes call sites noisier without improving inferred results

### Use An Explicit Public Return Type When

- inference would leak internal helper structure into `.d.ts`
- small internal refactors could silently change the emitted public type
- the stable contract is simpler than the inferred implementation type

### Use An Options Object When

- optional settings are numerous
- configuration will likely grow
- named fields improve readability more than positional arguments

If the options object carries multiple modes, prefer an explicit discriminant
over loosely optional fields.

### Use A Discriminated Union When

- public results or modes need safe narrowing
- consumers should branch by one explicit field instead of probing shape
- adding variants later should be a deliberate compatibility decision

### Callback Rules

- if the callback return value is ignored, type it as `void`
- do not mark callback parameters optional just to say "consumers do not have
  to use them"

## Minimal Public Complexity Rule

When two shapes are equally correct at runtime, choose the one with:

- fewer overloads
- fewer type parameters
- clearer narrowing
- more readable hover text
- less risk of declaration drift across refactors

Public flexibility is not free. Make it earn its place.
