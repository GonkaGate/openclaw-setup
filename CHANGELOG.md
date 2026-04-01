# Changelog

## [Unreleased]

- Fresh OpenClaw installs no longer require `openclaw onboard` before using this package.
- The installer now bootstraps missing OpenClaw config and workspace state through `openclaw setup` before applying GonkaGate-managed provider settings.
- True first-run installs now also bootstrap a minimal local Gateway mode by setting `gateway.mode` to `"local"` only when OpenClaw setup did not already choose a gateway mode.
- Backups remain mandatory for existing configs, but are skipped for first-run installs where no prior config exists.
- Added `npx @gonkagate/openclaw verify` as a read-only command for checking that the OpenClaw config still matches the supported GonkaGate provider wiring.
- `verify` now also checks that the local OpenClaw Gateway RPC is reachable, that `openclaw health --json` reports a healthy runtime, and that `openclaw models status --plain` resolves the expected primary model.
- Installer runtime probes now distinguish a not-yet-running local Gateway from real runtime mismatches; when the Gateway is simply not running yet, install succeeds and prints `openclaw gateway` as the exact next step.
- Runtime verification now treats malformed or shape-drifted OpenClaw probe output as a strict compatibility failure instead of downgrading it to a benign Gateway-not-running result.
- The installer now validates both the current config and the generated candidate config through `openclaw config validate --json` before writing.
- The managed OpenAI provider config now preserves an existing `models.providers.openai.models` array and initializes it to `[]` when missing so configs stay valid on current OpenClaw releases.
- The CLI now honors `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`, and `OPENCLAW_HOME` using the same path precedence as OpenClaw, so install and verify target the active config file instead of failing fast.

## [0.1.0] - 2026-04-01

- Initial public release of the OpenClaw onboarding CLI for GonkaGate.
- Added interactive API key entry, curated model picker, JSON5 config validation, backup creation, and atomic writes.
- Added tests, CI, npm publish workflow, and release-please configuration.
