# Unfamiliar Surface Checklist

Use this when the touched code is not obviously owned by one file or one seam.

## 1. Find The Real Source Of Truth

Prefer evidence in this order:

1. approved spec or implementation plan
2. visible route/schema/exported contract
3. focused existing tests for the same behavior
4. current runtime owner in code
5. prompt-only assumptions

If these disagree, do not pick one silently. Name the conflict and either
choose the smallest reversible edit or escalate the design gap.

## 2. Walk The Smallest Ownership Surface

Inspect only the nearest owners first:

- touched file
- direct callers or handlers
- shared schema/type/constants owner
- nearby tests for the same path
- adjacent persistence/cache helper only if the change reaches that seam

Do not scan broad unrelated modules "for context" unless the ownership surface
is still unclear after this pass.

## 3. Ask The Preserve-First Questions

- where is the public or persisted contract actually defined?
- where is the error shape mapped?
- where is boundary parsing or normalization already happening?
- where is transaction or cache ownership already established?
- which helper or constant already owns the literal I am about to duplicate?

## 4. Stop Conditions

Escalate instead of implementing through the ambiguity when:

- two files appear to own the same contract
- the current code contradicts the spec or tests
- the fix requires introducing a new owner, layer, or public surface
- the real issue is architecture or planning, not code shape
