# Policy Decision Guide

Use this when the boundary is clear but the right mechanism or policy is not.

## 1. Guard versus schema-derived parser

Choose manual guards when all are true:

- the shape is tiny
- the proof fits in one local function
- nested arrays or objects are minimal
- unknown-key policy is obvious
- reuse pressure is low

Choose schema-derived parsing when one or more are true:

- the shape is nested or reused
- the trusted output needs to be derived from the runtime proof
- unknown-key policy must be visible and stable
- transform or default semantics matter
- several callers need the same boundary contract

## 2. Throw versus result

Prefer throw when:

- the boundary is terminal for that request path
- a central error handler already owns failure rendering
- the caller has no meaningful recovery path

Prefer structured result when:

- the caller must branch on parse success
- several parse failures should be accumulated or reported explicitly
- the boundary is part of a broader validation flow rather than immediate
  rejection

## 3. Reject versus strip versus passthrough

Prefer `reject` when:

- extra keys are likely to indicate caller error
- accidental field drift is dangerous
- the boundary defines a narrow contract

Prefer `strip` when:

- the boundary wants a stable minimal internal shape
- extra input is not useful internally
- leniency is acceptable but silent trust is not

Use `passthrough` only when:

- keeping unknown fields is intentional
- the preserved fields remain explicitly untrusted or opaque
- downstream code will not treat the whole object as trusted internal state

## 4. Validate versus normalize

Structural validation proves shape.
Normalization creates the canonical local form.

Keep them conceptually separate even when one tool performs both.

Good default:

- validate the fields you need
- normalize once in the boundary layer
- export only the normalized trusted shape

## 5. Full trusted shape versus partial trusted claim

Trust the whole object only when the whole object has been checked under the
chosen policy.

Prefer a partial trusted claim when:

- only part of the payload is needed internally
- the rest can stay opaque
- shrinking the trusted surface makes review easier

## 6. Assertion function versus parser return

Use `asserts` when:

- failure should throw
- the proof is local and direct
- the value should remain the same identity after the check

Prefer a parser return when:

- the boundary should emit a new normalized object
- the trusted output is smaller or differently shaped than the raw input
- the caller needs explicit parse issues or a distinct value
