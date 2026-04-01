# Soundness Failure Patterns

Use this reference when the review starts from symptoms and needs compact,
high-signal anchors for the most common TS safety failures.

## `any` Laundering

Watch for:

- `JSON.parse`, third-party SDKs, or untyped helpers returning `any`
- `any` flowing into typed variables, collections, or generics
- "safe" wrappers that still return `any`

Quick question:

- where did the value stop being untrusted, and what runtime check actually
  paid for that trust?

## Assertion Chains

Watch for:

- `as Foo`
- `as unknown as Foo`
- non-null `!`
- custom assertion helpers with no visible proof

Quick question:

- is this assertion expressing already-earned knowledge, or is it creating
  trust from nowhere?

## Partial Validation Then Whole-Object Trust

Watch for:

- one field checked, then the whole object treated as trusted
- schema validation followed by extra assumed properties
- cached or DB-loaded JSON trusted after only shallow inspection

Quick question:

- what exact surface was validated, and what larger shape is now being trusted?

## Optionality And Indexed-Access Drift

Watch for:

- absence treated as the same thing as `undefined`
- unchecked map or record access
- `!` after a path TypeScript did not actually prove

Quick question:

- does the current code prove presence, or only hope for it?

## Union Or Helper Collapse

Watch for:

- helper stacks that erase discriminants
- `Omit` or `Pick` over unions with unexpected collapse
- generic wrappers that widen a precise variant into a looser common shape

Quick question:

- does the transformed type still preserve the distinction the runtime relies
  on?

## Inference-Control Collapse

Watch for:

- a registry or constant map annotated as `Record<string, ...>` and losing its
  literal keys
- a cast or annotation replacing a shape that should have used `satisfies`
- a generic helper accepting an unsafe choice because inference came from the
  wrong argument position
- structurally equal identifiers being mixed where a nominal barrier was
  actually needed

Quick question:

- did the code lose a proof-relevant distinction because inference widened the
  value or generic constraint too early?

## Public Overpromise

Watch for:

- overloads or generics that promise a narrower result than the runtime path
  can justify
- exported types that imply validation or normalization did not happen
- source code that looks safe but emits a weaker or more confusing `.d.ts`

Quick question:

- what will a consumer believe from the exported surface, and is that belief
  actually safe?

## Async Parser Illusion

Watch for:

- async transforms or async boundary logic paired with sync parse calls
- result-style parse code where the value is treated as trusted before the
  success branch is enforced

Quick question:

- did the claimed runtime proof actually run on the path that now treats the
  value as trusted?

## Structural-Compatibility Leak

Watch for:

- mixed identifiers or domain strings with no nominal barrier
- unrelated object shapes accepted because structure happens to align
- widened literals that erase the discriminant or mode

Quick question:

- is the current compatibility accidental or intentional?
