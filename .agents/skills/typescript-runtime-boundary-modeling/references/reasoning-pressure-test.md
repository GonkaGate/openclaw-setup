# Reasoning Pressure Test

Use these prompts to tighten a draft answer that feels plausible but generic.

## Boundary proof

- What exact statement becomes true after the boundary?
- Which exact fields are trusted, and which stay raw or opaque?
- Where in code does that trust transition happen?

## Policy proof

- What is the unknown-key policy, and why is it right here?
- Is failure better expressed as throw or as explicit result?
- Where does normalization happen, and why there instead of later?

## Leak proof

- Could `any`, `!`, truthiness checks, or a cast bypass the proof?
- Are nested values trusted without being covered by the parser?
- Does the answer accidentally trust a wider shape than it validated?

## Alternative proof

- What is the strongest tempting shortcut here?
- Why is it worse than the proposed boundary shape?
- What evidence would make you switch from manual guards to schema-derived
  parsing, or the reverse?

## Draft-strength proof

- What would a competent but broad boundary answer likely recommend here?
- Which part of that answer is still too vague, too wide, or too trusting?
- What exact omission does the specialist answer surface that the broad answer
  would likely leave implicit?
- What explicit rejected alternative makes this answer falsifiable rather than
  merely plausible?

## Confidence proof

- What did you actually observe in code or config?
- What are you inferring?
- What missing fact would most likely overturn the recommendation?
