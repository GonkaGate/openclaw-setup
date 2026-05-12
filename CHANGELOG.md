# Changelog

## [0.2.0](https://github.com/GonkaGate/openclaw-setup/compare/v0.1.0...v0.2.0) (2026-05-03)


### Features

* add Kimi K2.6 model ([7123724](https://github.com/GonkaGate/openclaw-setup/commit/7123724b5befae6f679f4e683e686a967e33b20f))
* add Kimi K2.6 model ([af84721](https://github.com/GonkaGate/openclaw-setup/commit/af847212669438754f3bf3141182d33e398ff4fd))
* support GonkaGate model catalog for OpenClaw switcher ([7b24bf6](https://github.com/GonkaGate/openclaw-setup/commit/7b24bf603a41999ad9cf7629e4d92affc5a83d3e))
* support GonkaGate model catalog for OpenClaw switcher ([3e5bf68](https://github.com/GonkaGate/openclaw-setup/commit/3e5bf684e1c0f27f73ade39addc8481f5db8c788))

## [Unreleased]

- Added `moonshotai/kimi-k2.6` to the curated GonkaGate model registry under the `kimi-k2.6` model key and made it the default model.
- The installer now fetches GonkaGate `GET /v1/models` after API key entry, requires every curated model to be live, and uses the live metadata for OpenClaw provider model catalog entries.
- The installer now creates or updates `agents.defaults.models` with the curated GonkaGate allowlist so OpenClaw `/models` can switch between supported models.
- Raised the minimum supported Node.js runtime for this package to Node 22.14+ so it matches current OpenClaw install support expectations.
- CI and publish workflows now both run on Node 22.14.0, and runtime documentation no longer advertises Node 18 support.
- Upgraded `@inquirer/prompts`, `commander`, and `write-file-atomic` to current releases that are now appropriate for a Node 22.14+ baseline.
- Fresh OpenClaw installs no longer require `openclaw onboard` before using this package.
- The installer now bootstraps missing OpenClaw config and workspace state through `openclaw setup` before applying GonkaGate-managed provider settings.
- True first-run installs now also bootstrap a minimal local Gateway mode by setting `gateway.mode` to `"local"` only when OpenClaw setup did not already choose a gateway mode.
- Backups remain mandatory for existing configs, but are skipped for first-run installs where no prior config exists.
- Added `npx @gonkagate/openclaw verify` as a read-only command for checking that the OpenClaw config still matches the supported GonkaGate provider wiring.
- `verify` now also checks that the local OpenClaw Gateway RPC is reachable, that `openclaw health --json` reports a healthy runtime, and that `openclaw models status --plain` resolves the expected primary model.
- Runtime verification now tolerates the extra non-model log lines that stable OpenClaw 2026.4.1 may emit before `openclaw models status --plain`, while still failing on ambiguous multi-model output.
- Installer runtime probes now distinguish a not-yet-running local Gateway from real runtime mismatches; when the Gateway is simply not running yet, install succeeds and prints `openclaw gateway` as the exact next step.
- Runtime verification now treats malformed or shape-drifted OpenClaw probe output as a strict compatibility failure instead of downgrading it to a benign Gateway-not-running result.
- The installer now validates both the current config and the generated candidate config through `openclaw config validate --json` before writing.
- The managed OpenAI provider config now preserves unrelated existing `models.providers.openai.models` entries while adding or updating curated GonkaGate catalog entries required by OpenClaw's model picker.
- The CLI now resolves the active config path compatibly with stable OpenClaw 2026.4.1 by preferring existing legacy config candidates locally before falling back to canonical `openclaw.json`, so install and verify stay aligned on legacy hosts.

## [0.1.0] - 2026-04-01

- Initial public release of the OpenClaw onboarding CLI for GonkaGate.
- Added interactive API key entry, curated model picker, JSON5 config validation, backup creation, and atomic writes.
- Added tests, CI, npm publish workflow, and release-please configuration.
