# Mode-Specific Hard Anchors

Use this reference when the answer needs concrete platform anchors from the
deep research, not just a diagnostic workflow.

## Anchor 1: Canonical Compiled-JS Service

Best default when production runs Node directly.

Shape:

- source in `src/`
- emitted JS in `dist/`
- Node executes `dist/<entry>.js`
- `package.json` uses `"type": "module"`
- source imports use `.js` relative specifiers
- `tsconfig` stays in a Node-oriented module mode

Why this anchor matters:

- runtime truth and artifact truth stay visible
- import strings can be validated directly in emitted JS
- dev/test drift is easier to detect because production does not depend on a
  hidden runner contract

## Anchor 2: Native `.ts` Execution Is A Different Contract

Treat Node type stripping as a distinct runtime mode, not as "compiled JS but
without build."

Hard caveats:

- Node still requires explicit extensions
- Node does not read `tsconfig.json`
- `import type` discipline becomes runtime-relevant
- syntax that needs transformation is not automatically safe
- `.ts` relative specifiers make sense only because `.ts` itself is the
  runtime contract

This is a narrower mode than many teams assume.

## Anchor 3: Mixed-Format Packages Need Deliberate Extensions

Use `.mts` and `.cts` only when one package truly must carry mixed ESM/CJS
artifacts.

Hard consequences:

- `.mts` emits `.mjs`
- `.cts` emits `.cjs`
- mixed-format trees increase interop and publication risk

Do not reach for mixed extensions as casual migration decoration.

## Anchor 4: Source Maps Are A Paired Contract

Readable stacks require both sides of the contract:

- compiler side: emit source maps, and optionally inline sources when that
  trade-off is intentional
- runtime side: start Node with source-map support when the debugging contract
  depends on it

This is not free:

- remapping has runtime cost when stacks are accessed heavily
- inlined sources can widen source exposure

## Anchor 5: Runner Success Is Not Production Proof

Tools like `tsx`, `ts-node`, or loader-based flows can be useful, but they are
not proof unless they are intentionally part of the supported runtime
contract.

Hard check:

- if production is `node dist/...`, validate that exact contract
- if local success depends on alias magic, extensionless imports, or loader
  tricks, treat that as drift until proven otherwise

## Anchor 6: Loader Tricks Are Not A Stable Baseline

Experimental loader patterns or specifier-resolution tricks may unblock a
local problem, but they weaken the platform contract.

Use them only when the task explicitly owns that trade-off and the answer says
why a platform-native contract is not sufficient.
