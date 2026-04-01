# Root-Cause Quality Bar

Use this file when deciding what level of conclusion is justified.

The point is not to repeat generic debugging wisdom.
The point is to keep the conclusion threshold high by forcing discrimination,
alternative-explanation pressure, and mechanism-level honesty.

## 1. Triage Plan

Stay at triage when:

- the failing surface is still broad
- the prompt gives mostly symptoms
- the current answer cannot yet say which boundary went bad first

A good triage output names:

- the current symptom
- the most likely touched seams
- the one next diagnostic step
- why that step is first

## 2. Leading Hypothesis

Use a leading hypothesis when:

- one mechanism currently fits best
- but nearby alternatives are still live
- or the trigger/precondition is not yet proven

A good leading hypothesis states:

- the suspected mechanism
- the nearest competing explanation
- the observation that would promote or demote it

## 3. Measurement Gap

Use a measurement gap when:

- the system might be wrong, but the current signals cannot separate the
  explanations
- the next useful move is a targeted probe, not a fix
- the evidence gap is the main blocker to a safe conclusion

Name:

- what is missing
- the exact next probe
- what decision that probe unlocks

## 4. Confirmed Root Cause

Call it root cause only when all are true:

- the failing surface is named precisely
- the mechanism explains the symptom and timing
- the trigger or precondition is identified
- the strongest nearby alternative was addressed explicitly
- the claim predicts what a confirming or disconfirming check should show
- the proposed fix direction is no longer doing the proof work

If you cannot say why this mechanism beats the adjacent one, it is not yet a
confirmed root cause.

## 5. Fix Direction

Suggest a fix only after the conclusion is at least a strong leading
hypothesis, and prefer it only after confirmed root cause.

The fix should be:

- minimal
- local to the failing surface
- paired with one validation step that tests the mechanism, not only the
  symptom

## 6. Drop These

Do not present these as conclusions:

- "probably infra"
- "probably Prisma"
- "maybe timeout"
- "let's retry more"
- "we need more logs" without naming the question those logs must answer
