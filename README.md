# @gonkagate/openclaw

Set up OpenClaw to use GonkaGate as its primary OpenAI-compatible provider in one `npx` command, and verify both the resulting config and local runtime later with the same CLI.

This CLI is for developers who already have local `OpenClaw` and want a working OpenClaw config at the active path OpenClaw will load, without hand-editing JSON5, exporting secrets into shell profiles, guessing which `models.providers.openai` fields must change together, or first running the full OpenClaw onboarding wizard.

Under the hood it configures OpenClaw's built-in `openai` provider to talk to GonkaGate at `https://api.gonkagate.com/v1` with `api: "openai-completions"`.

It does not install `OpenClaw` itself. It configures an existing local OpenClaw install and can bootstrap the base OpenClaw config automatically when needed.

This package resolves the target config path locally with the same active-config selection order stable OpenClaw 2026.4.1 uses:

- `OPENCLAW_CONFIG_PATH`, when set
- else, inside `OPENCLAW_STATE_DIR`, prefer an existing `openclaw.json` or `clawdbot.json`, and fall back to `OPENCLAW_STATE_DIR/openclaw.json`
- else, under `OPENCLAW_HOME` or `~`, prefer the first existing config candidate in this order: `.openclaw/openclaw.json`, `.openclaw/clawdbot.json`, `.clawdbot/openclaw.json`, `.clawdbot/clawdbot.json`
- if none of those candidates exist, fall back to canonical `.openclaw/openclaw.json`

It does not parse `openclaw config file` to determine the target path.

## Quick Start

```bash
npx @gonkagate/openclaw
```

You will be asked for:

- your GonkaGate API key (`gp-...`) in a hidden interactive prompt
- a model from the curated GonkaGate registry

If the active OpenClaw config path does not exist yet, the installer will run `openclaw setup` automatically, ensure a minimal local Gateway mode, and then apply the GonkaGate-specific provider settings.

You need:

- local `OpenClaw`
- Node.js 22.14+ to run this package
- current OpenClaw install docs recommend Node 24, with Node 22.14+ supported for compatibility
- a GonkaGate API key

## Verify With This CLI

After setup, you can run a read-only verification pass at any time:

```bash
npx @gonkagate/openclaw verify
```

This command checks:

- that `openclaw` is installed and callable from `PATH`
- that the active OpenClaw config exists and parses cleanly as JSON5
- that `openclaw config validate --json` accepts the current config
- that `models.providers.openai.baseUrl` is `https://api.gonkagate.com/v1`
- that `models.providers.openai.api` is `openai-completions`
- that `models.providers.openai.apiKey` exists and still looks like a `gp-...` key
- that `agents.defaults.model.primary` points at a curated GonkaGate model
- that `agents.defaults.models` stays in sync when that allowlist exists
- that the config file still uses owner-only permissions
- that the local OpenClaw Gateway RPC is reachable through `openclaw gateway status --require-rpc --json`
- that `openclaw health --json` reports a healthy runtime
- that `openclaw models status --plain` resolves the same primary model that this package wrote

`verify` is still read-only, but it now expects the local OpenClaw Gateway to be running so it can prove the saved config is actually active.

## Supported Models

Current curated registry in this package:

- `qwen3-235b` -> `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `kimi-k2.6` -> `moonshotai/Kimi-K2.6` (default)

## What It Does

The tool writes directly to the active OpenClaw config path resolved from:

- `OPENCLAW_CONFIG_PATH`, when set
- else, inside `OPENCLAW_STATE_DIR`, the first existing of `openclaw.json` and `clawdbot.json`, falling back to `OPENCLAW_STATE_DIR/openclaw.json`
- else, under `OPENCLAW_HOME` or `~`, the first existing of `.openclaw/openclaw.json`, `.openclaw/clawdbot.json`, `.clawdbot/openclaw.json`, `.clawdbot/clawdbot.json`
- if no config candidate exists, canonical `.openclaw/openclaw.json`

It also:

- honors `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`, and `OPENCLAW_HOME` with the same active-config selection order stable OpenClaw uses
- checks that the `openclaw` CLI is installed before asking for secrets
- runs `openclaw setup` automatically when the base OpenClaw config does not exist yet
- bootstraps `gateway.mode: "local"` on true first-run installs when OpenClaw has not already set a gateway mode
- refuses to overwrite an invalid JSON5 config
- refuses to overwrite a config that fails current OpenClaw schema validation
- creates a backup before overwriting an existing config
- preserves unrelated top-level config keys
- preserves other provider entries under `models.providers`
- overwrites only the managed `models.providers.openai` fields
- preserves an existing `models.providers.openai.models` array and initializes it to `[]` when missing so the resulting config remains valid for current OpenClaw releases
- sets `agents.defaults.model.primary` to the chosen curated model
- merges `agents.defaults.models` only when that allowlist already exists
- validates the generated config with `openclaw config validate --json` before replacing the live file
- writes the config atomically with owner-only permissions
- writes backup files with owner-only permissions
- exposes `npx @gonkagate/openclaw verify` as a read-only validation command for the resulting config and active local runtime
- treats a not-yet-running local Gateway as a successful install outcome and prints one exact next step: `openclaw gateway`

## Managed OpenClaw Fields

This installer manages only these OpenClaw surfaces:

- `models.providers.openai.baseUrl`
- `models.providers.openai.apiKey`
- `models.providers.openai.api`
- `models.providers.openai.models` as a valid array, while preserving any existing entries
- `agents.defaults.model.primary`
- `agents.defaults.models["openai/<model-id>"].alias` only when `agents.defaults.models` already exists

Everything else is left intact.

## Fixed GonkaGate Setup

These parts are intentionally fixed in the public onboarding flow:

- Provider id: `openai`
- Base URL: `https://api.gonkagate.com/v1`
- API adapter: `openai-completions`
- API key entry: interactive only

This tool does not ask for a custom base URL and does not accept arbitrary model IDs.

## Verify

After setup:

1. Run `npx @gonkagate/openclaw verify`
2. If the installer tells you the local Gateway is not running yet, run `openclaw gateway`
3. Run `openclaw status --deep` if you want the broader local diagnosis
4. In OpenClaw chat, run `/status`
5. If the change does not appear, run `openclaw gateway restart`

If you install the package globally instead of using `npx`, the same check is available as:

```bash
gonkagate-openclaw verify
```

## What This Tool Does Not Do

- It does not install `OpenClaw`
- It does not configure Anthropic
- It does not edit `.zshrc`, `.bashrc`, PowerShell profiles, or other shell startup files
- It does not write `.env` files or depend on shell exports
- It does not support arbitrary custom base URL overrides
- It does not add any path configuration beyond the OpenClaw env vars that OpenClaw already supports
- It does not support project-local scope in v1

## Sources

Implementation choices in this repository were aligned to these primary sources:

- [OpenClaw Configuration](https://docs.openclaw.ai/gateway/configuration)
- [OpenClaw Configuration Reference](https://docs.openclaw.ai/gateway/configuration-reference)
- [GonkaGate OpenClaw Integration Guide](https://gonkagate.com/en/docs/guides/openclaw-integration)
- [GonkaGate Model Selection Guide](https://gonkagate.com/en/docs/guides/overview/models)

## Development

```bash
npm install
npm run dev
```

Useful commands:

- `npm run build`
- `npm test`
- `npm run ci`
