# Reasoning Pressure Test

Use these prompts when the first draft sounds plausible but too generic.

## Topic-Fit Proof

- Is the real question internal error architecture, or is it actually about
  `neverthrow`, runtime validation, or public API contracts?
- What adjacent skill would own the answer if this one does not?

## Boundary Proof

- Where are the relevant layer, delivery, and audience boundaries?
- Who owns create, enrich, translate, and shape on this path?

## Signal Proof

- Which failure families exist here?
- What signal form does each family get?
- Why does the obvious alternative still lose?

## Identity Proof

- What is the stable machine identifier:
  `code`, `kind`, or something else?
- Where would message matching break this design?

## Delivery Proof

- Could failure arrive later through promise rejection or `'error'` events?
- Does the answer assume `try/catch` covers a path that it does not?

## Shortcut Proof

- What is the strongest tempting shortcut here?
- Is it message matching, swallow-to-null, over-wrapping, or one-mechanism-for-
  everything?
- Why is it weaker than the proposed boundary?

## Boundary-Proof Check

- What is the tempting broad answer here?
- Which exact boundary decision is still too vague?
- What concrete trap, weak abstraction, or unstable contract is still
  tolerated?
- Is this answer better because it is more discriminating, not just more
  complete?

## Confidence Proof

- What TypeScript or Node facts were actually observed?
- What is being inferred?
- What missing fact would most likely overturn the recommendation?
