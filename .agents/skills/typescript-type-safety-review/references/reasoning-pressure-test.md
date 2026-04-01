# Reasoning Pressure Test

Use this reference when the first review draft sounds believable but still too
easy or too generic for this seam.

The goal is to defeat the strongest nearby wrong explanation before keeping a
finding.

Treat generic TypeScript advice as insufficient here. If the point only
reflects competent broad TypeScript knowledge, it is not yet good enough for
this skill.

## 1. Unsafe Vs Ugly

Ask:

- is the code actually making a false safety claim
- or is it only awkward, noisy, or hard to read

Do not promote readability complaints into safety findings.

## 2. Local Proof Vs Borrowed Trust

Ask:

- does this code path itself validate, narrow, or normalize enough
- or is the draft quietly borrowing proof from another layer that is not shown

Do not keep a hard finding until "upstream probably validated it" loses or is
explicitly downgraded to `missing proof`.

## 3. Helper Flaw Vs Model Flaw

Ask:

- is the unsafe edge caused by the utility or generic wrapper
- or is the underlying state or domain model itself under-specified

Do not jump to model redesign if the real issue is a narrower helper mistake.

## 4. Boundary Leak Vs Public Overpromise

Ask:

- is the main failure that untrusted data became trusted too early
- or that the exported type surface promises more than the implementation can
  safely guarantee

Keep the primary surface explicit. Do not blend both into one vague "not
type-safe" point.

## 5. Stable Verdict Vs Config-Shaped Verdict

Ask:

- would this point still hold under different `tsconfig` or emitted-declaration
  facts
- or does it depend on compiler settings or `.d.ts` truth you have not
  actually seen

If the latter, downgrade confidence or reclassify as `missing proof`.

## 6. Inference-Control Bug Vs Bigger Modeling Story

Ask:

- is the unsafe edge really a deep-modeling problem
- or did the code simply lose a proof-relevant distinction because literals
  widened, inference came from the wrong position, or nominal separation was
  never established

Do not jump to a bigger type-system story if a narrower inference-control
anchor such as `satisfies`, `NoInfer<T>`, literal preservation, or a branded
identifier would settle the safety claim more honestly.

## 7. Neighbor Skill Check

Ask:

- is this really a soundness review finding
- or would `typescript-idiomatic-review`,
  `typescript-language-simplifier-review`, or a TS design skill own it better

If the neighbor skill owns it better, demote or hand off.

## 8. What Would Flip The Verdict

Before finalizing, say:

- what single missing fact would remove the concern
- what single missing fact would strengthen it into a harder finding
- what smallest proof step would settle the point

If you cannot say what would flip the verdict, the point is probably still too
soft.

## 9. Expert-Delta Check

Ask:

- what exact distinction here is most likely to stay flattened or implicit
- why does that distinction change the safety verdict materially
- would the point still sound persuasive if all generic TS advice were removed

If the answer is "not much changes," the draft is still not adding enough
type-safety judgment.
