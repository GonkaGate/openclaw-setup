# Reasoning Pressure Test

Use this file when the first answer sounds plausible but may still be too
generic.

Use it especially when the answer sounds competent but may not yet be clearly
better than a generic first-pass refactor recommendation.

## Minimum Proof For A Good Answer

Before finalizing, answer these explicitly:

1. What behavior is being preserved?
2. What evidence makes that behavior real?
3. What is the dominant complexity source?
4. What is the smallest move that removes it?
5. Why not the most tempting nearby alternative?
6. What concrete readability payoff appears afterward?
7. What result would show the move was unsafe or not actually simpler?
8. Is the current proof strong enough for the proposed diff size?

If these are missing, the answer is probably directionally correct but not yet
expert enough.

## Baseline Delta Test

Ask these before finalizing:

1. What would a generic first-pass answer probably recommend here?
2. Which part of that first-pass answer would still be too broad, too implicit,
   or under-justified?
3. What does this skill add that makes the final answer materially narrower or
   safer?
4. If the skill were removed, which part of the answer would become weaker?

If those questions have no sharp answer, the skill is probably not adding
enough expert value.

## Why-Not Challenge

Compare the chosen move against at least one tempting wrong alternative:

- why not a bigger rewrite?
- why not one more helper?
- why not deeper type machinery?
- why not just use `as`?
- why not flip compiler options first?
- why not batch this into one codemod immediately?

A good answer explains what hidden complexity would remain if you did only the
alternative.

## Minimality Challenge

Ask:

- what is the smallest reversible slice?
- what could be deleted instead of abstracted?
- what knowledge stops being spread out after this change?
- is the move removing reasoning cost or only relocating it?

## Output Upgrade

If the draft feels broadly right but underspecified, add:

- `Preserved Behavior`
- `Behavior Evidence`
- `Dominant Complexity`
- `Recommended Minimal Move`
- `Why Not The Tempting Alternative`
- `Readability Payoff`
- `Safety / Proof`
