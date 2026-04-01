# Boundary Design Workflow

Use this pass whenever the task is not trivial.

## 1. Name the boundary

- What is the source: request, config, external API, persistence, cache,
  `JSON.parse`, or `catch`?
- What raw shape enters: truly `unknown`, a weak DTO, an ORM record, a cache
  blob, or a third-party type you do not fully trust?
- Which function or module should be the first place that can earn trust?

## 2. State the trusted claim

Write one sentence:

- "After this boundary, layer X may rely on Y."

If you cannot state that sentence concretely, do not choose a tool yet.

## 3. Pick the minimal checked surface

- Validate the full surface that the next layer will rely on.
- Keep the rest raw or opaque unless the boundary deliberately exports it as
  trusted.
- Reject partial proof of a larger trusted claim.

## 4. Choose the mechanism

Use:

- manual guards for tiny, local, stable shapes
- assertion functions when failure should throw and the proof stays local
- schema-derived parsing when shape depth, reuse, or explicit policy matters
- boundary mappers when raw DTO or record shapes must not leak inward

## 5. Choose the policies

State the policy, do not imply it:

- `throw` versus result
- `reject`, `strip`, or `passthrough` for unknown keys
- sync versus async parse
- where normalization and defaults happen

## 6. Define the trusted output

Say:

- what type or shape leaves the boundary
- what layer owns that shape
- what raw types must stay outside the trusted zone

## 7. Leak-check before finalizing

Ask:

- where can `any`, `!`, or a cast bypass proof?
- are nested fields fully covered by the trusted claim?
- are empty-but-valid values being lost by truthiness checks?
- is transform logic scattered outside the boundary?
- what is observed versus assumed?
