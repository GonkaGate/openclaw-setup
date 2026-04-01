# Review Workflow

Use this reference when the codebase is unfamiliar, the diff is broad, or the
first pass feels scattered.

## Evidence Order

Review in this order:

1. the code or diff itself
2. the effective `tsconfig` or explicit strictness assumptions
3. the real parse, guard, or normalization boundary if trust conversion is
   part of the claim
4. the exported declarations or public signature surface if consumers are part
   of the claim
5. tests only as supporting evidence, not as a substitute for type truth

Prefer direct evidence in this order:

1. concrete code paths and types
2. visible compiler settings and lint guardrails
3. visible parser or boundary code
4. emitted or declared public type surface
5. narrative claims in chat

If the repo is unfamiliar or the surface is wide, use
`inspection-checklist.md` before drafting findings.

## Safety-Claim Pass

Start every review by naming the dominant safety claim:

- trust boundary claim
- impossible-state claim
- helper-preserves-shape claim
- narrowing or optionality claim
- public-type honesty claim

Do not start with "the types feel risky." Start with the exact promise the code
appears to make.

## Failure-Path Pass

Once the claim is named, trace the shortest way it can fail:

1. `any` or assertion laundering
2. partial validation then whole-object trust
3. union or generic collapse
4. helper composition that erases a discriminant or exact shape
5. optionality or indexed-access assumption that is not actually proven
6. exported type or overload promise that the runtime path does not uphold

If the failure path is still unclear, load `soundness-failure-patterns.md`
before drafting findings.

## Proof-Source Pass

Before finalizing a finding, verify which proof sources are actually visible:

1. effective compiler settings or at least explicit assumptions
2. the real parser, guard, assertion helper, or normalization path
3. the helper alias or mapped/conditional type that is doing the work
4. the exported declaration or visible public type surface when consumers are
   part of the claim

If the verdict turns on one of those and it is not visible, downgrade to
`missing proof` or `residual risk`.

## Neighbor-Skill Pass

After the failure-path pass, check whether the point really belongs here.

Use `scope-and-handoffs.md`.

The quickest checks:

- if the code is still safe and the complaint is mainly readability, that is
  not this skill
- if the question is how to redesign the model safely, that is not a review
  finding yet
- if the issue is mainly HTTP schema or framework runtime behavior, hand off

## Output Discipline

Prefer this internal order:

1. findings
2. missing-proof obligations
3. residual risks

If nothing survives the bar for a finding, say so plainly and keep only the
remaining proof gaps or residual risks.

## Stop Rule

Do not turn every suspicious type shape into a finding.

A point becomes material only when at least one is true:

- the current type story claims safety it does not prove
- a runtime boundary leaks more trust than the downstream layer can justify
- a helper or public type surface hides a real behavioral mismatch
- the available evidence is too weak to trust a critical safety claim

If the draft still sounds like broad TS advice after this pass, load
`reasoning-pressure-test.md` before keeping the point.
