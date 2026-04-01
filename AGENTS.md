# AGENTS.md

## What This Repository Is

`openclaw-setup` is the public open-source onboarding repository for GonkaGate API users who want to run local `OpenClaw` through GonkaGate as the primary OpenAI-compatible provider without manually editing the active OpenClaw config file that OpenClaw will load or first going through the full OpenClaw onboarding wizard.

The core idea of this repo is:

- provide one short public entrypoint
- reduce onboarding to a single command
- provide one follow-up verification command
- avoid asking users to edit shell profile files
- avoid making users understand OpenClaw provider wiring by hand

Recommended public flow:

```bash
npx @gonkagate/openclaw
```

The happy-path installer interactively prompts only for:

- a `gp-...` API key
- a model picker from the curated registry

If the active OpenClaw config path does not exist yet, the installer runs `openclaw setup` automatically to initialize the base OpenClaw config and workspace, ensures a minimal local Gateway mode when OpenClaw setup did not already pick one, and then applies GonkaGate-managed settings.

After setup, users can run a read-only verification command:

```bash
npx @gonkagate/openclaw verify
```

That command checks the current active OpenClaw config path, confirms that the managed GonkaGate provider fields, curated primary model, and owner-only file permissions still match the supported setup, and then verifies that the active local OpenClaw runtime is healthy enough to load that config through read-only CLI probes.

If the installer finishes but the local OpenClaw Gateway is not running yet, that is still a successful install outcome. In that case the installer prints one exact next command:

```bash
openclaw gateway
```

Everything else is fixed by product design.

If the installer UX changes, this block in `AGENTS.md` must be updated immediately so it remains an accurate description of the current public flow.

If the library surface used for prompts, CLI parsing, or config writing changes, this document must also be updated so it stays truthful about the real implementation.

## Fixed Product Invariants

These decisions are part of the repo contract. Changing them is not a small refactor; it is a product change.

- `models.providers.openai.baseUrl` is always `https://api.gonkagate.com/v1`
- `models.providers.openai.api` is always `openai-completions`
- `models.providers.openai.models` must always end up as a valid array for current OpenClaw releases
- users do not choose the base URL and cannot override it in the public flow
- the provider is always `openai`, not `anthropic`
- model choice comes only from a code-owned curated registry
- the primary UX is `npx @gonkagate/openclaw`
- the follow-up verification UX is `npx @gonkagate/openclaw verify`
- API key entry must remain interactive and hidden
- the installer writes OpenClaw config, not shell env and not shell rc files
- the active target path is resolved locally with this precedence:
  `OPENCLAW_CONFIG_PATH`, then `OPENCLAW_STATE_DIR/openclaw.json`, then `OPENCLAW_HOME/.openclaw/openclaw.json`, then default `~/.openclaw/openclaw.json`
- the code must not use `openclaw config file` as the source of truth for target path resolution
- if the resolved config is missing, the installer bootstraps it through `openclaw setup`
- true first-run installs may add `gateway.mode: "local"` when OpenClaw setup left gateway mode unset
- unrelated settings must survive
- the installer must create a backup before overwriting an existing config
- invalid existing JSON5 must stop the installer
- config files must be written with owner-only permissions
- backup files must be written with owner-only permissions
- `agents.defaults.model.primary` must be updated to the selected curated model
- `agents.defaults.models` should only be merged when it already exists

Current honest limitation:

- the curated registry currently contains exactly one supported model:
  `qwen3-235b` -> `qwen/qwen3-235b-a22b-instruct-2507-fp8`

## What the Repo Does and Does Not Do

This repo does:

- onboarding for local `OpenClaw`
- read-only verification for the managed GonkaGate OpenClaw config
- read-only runtime verification for the active local OpenClaw Gateway and resolved primary model
- first-run OpenClaw config bootstrap through `openclaw setup` when needed
- first-run minimal local Gateway bootstrap when `gateway.mode` is absent
- persistent config writing into the active OpenClaw config path resolved from the current environment
- backup, merge, and validation logic
- JSON5 parsing and managed config updates
- troubleshooting and security docs

This repo does not do:

- `OpenClaw` installation
- Anthropic setup
- OAuth or browser auth flows
- backend changes
- shell profile mutation
- `.env` writing
- custom base URL setup
- arbitrary custom model setup
- project-local scope in v1

## Repository Structure

```text
.
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── bin/
│   └── gonkagate-openclaw.js
├── src/
│   ├── cli.ts
│   ├── constants/
│   │   ├── gateway.ts
│   │   └── models.ts
│   ├── install/
│   │   ├── backup.ts
│   │   ├── bootstrap-gateway.ts
│   │   ├── check-openclaw.ts
│   │   ├── load-settings.ts
│   │   ├── merge-settings.ts
│   │   ├── openclaw-config-validation.ts
│   │   ├── object-utils.ts
│   │   ├── prompts.ts
│   │   ├── settings-paths.ts
│   │   ├── validate-api-key.ts
│   │   ├── verify-runtime.ts
│   │   ├── verify-settings.ts
│   │   └── write-settings.ts
│   └── types/
│       └── settings.ts
├── docs/
│   ├── how-it-works.md
│   ├── security.md
│   └── troubleshooting.md
├── scripts/
│   ├── install.ps1
│   ├── install.sh
│   └── run-tests.mjs
└── test/
    ├── bootstrap-gateway.test.ts
    ├── cli-run.test.ts
    ├── load-settings.test.ts
    ├── merge-settings.test.ts
    ├── openclaw-config-validation.test.ts
    ├── prompts-validate-api-key.test.ts
    ├── test-helpers.ts
    ├── verify-runtime.test.ts
    ├── verify-settings.test.ts
    └── write-backup-check-openclaw.test.ts
```

## How the Code Is Organized

### `src/cli.ts`

This is the main installer and verification entrypoint.

CLI parsing and help output are implemented with `commander`.

It is responsible for:

- parsing CLI args through `commander`
- rendering help and version output
- verifying that `openclaw` is installed
- resolving the active target config path locally from the current environment
- bootstrapping the base OpenClaw config through `openclaw setup` when the resolved config is missing
- bootstrapping a minimal local Gateway mode on true first-run installs when gateway mode is unset
- loading the current OpenClaw config as JSON5
- validating the current OpenClaw config through `openclaw config validate --json` before prompting for secrets
- running the hidden API key prompt
- selecting the model
- merging GonkaGate settings into the existing config
- validating the generated candidate config through `openclaw config validate --json` before replacing the live file
- creating a backup before overwriting an existing config
- writing the final file and showing next steps
- dispatching the read-only `verify` subcommand
- validating that the saved config still matches the supported GonkaGate provider setup
- validating that the active local OpenClaw runtime can still load that setup through read-only CLI probes

### `src/constants/`

This is where the fixed product values live:

- `gateway.ts` stores the public base URL, API adapter, and provider id
- `models.ts` stores the curated supported model registry and default entry

This is one of the most sensitive parts of the repo. Do not add extra configurability here without an explicit product decision.

### `src/install/prompts.ts`

This file contains the interactive prompts built on top of `@inquirer/prompts`:

- hidden prompt for API key
- model picker from the curated registry

The key rule here is: do not log secrets and do not turn the main UX into CLI args for secrets.

### `src/install/check-openclaw.ts`

Verifies that the local `openclaw` CLI exists and is callable through `openclaw --version`.

It also runs `openclaw setup` for first-run installs when the resolved config path has not been created yet.

The installer should fail before asking for secrets if OpenClaw is not available.

### `src/install/bootstrap-gateway.ts`

This file contains the first-run-only minimal Gateway bootstrap logic.

It must:

- only apply to true first-run installs after `openclaw setup`
- set `gateway.mode` to `local` only when it is absent
- preserve unrelated `gateway.*` keys
- preserve an existing `gateway.mode` when OpenClaw setup already chose one
- avoid changing existing non-fresh installs

### `src/install/settings-paths.ts`

Defines the OpenClaw config file path:

- `OPENCLAW_CONFIG_PATH`
- else `OPENCLAW_STATE_DIR/openclaw.json`
- else `OPENCLAW_HOME/.openclaw/openclaw.json`
- else `~/.openclaw/openclaw.json`

It must not parse `openclaw config file` as an absolute-path source of truth.

There is no project-local scope in v1 beyond these OpenClaw-supported env overrides.

### `src/install/load-settings.ts`

Safely reads the target file as JSON5.

Rules:

- if the file does not exist, the loader returns `exists: false`
- the CLI may bootstrap the base OpenClaw config through `openclaw setup`
- if the JSON5 is broken, the installer must stop
- the installer must not silently overwrite a corrupted file
- if managed surfaces like `models.providers.openai` or `agents.defaults.models` are present with invalid shapes, the installer must stop
- if `models.providers.openai.models` is present, it must be a JSON5 array

### `src/install/merge-settings.ts`

This is the core business-logic merge layer.

It must:

- preserve unrelated top-level keys
- preserve unrelated provider entries
- overwrite only OpenClaw-managed `openai` provider fields
- preserve an existing `models.providers.openai.models` array when present
- initialize `models.providers.openai.models` to `[]` when missing so the resulting config remains valid for current OpenClaw releases
- set `agents.defaults.model.primary`
- preserve unrelated keys inside `agents.defaults.model`
- merge `agents.defaults.models` only when it already exists

### `src/install/backup.ts`

Creates a timestamped backup next to the existing config file before overwrite.

### `src/install/write-settings.ts`

Writes JSON to disk through `write-file-atomic`.

Expected behavior:

- create directories when needed
- write valid JSON
- enforce owner-only permissions
- avoid touching anything outside the target config file

### `src/install/openclaw-config-validation.ts`

This layer runs OpenClaw's own schema validator against both the current config and generated candidate configs.

It must:

- call `openclaw config validate --json` against an explicit config path
- fail clearly if the local OpenClaw build does not support that validation flow
- validate the current saved config before the installer asks for secrets
- validate the generated candidate config before the live file is replaced
- remove temporary candidate files after validation completes

### `src/install/verify-settings.ts`

This is the read-only config verification layer used by `npx @gonkagate/openclaw verify`.

It must:

- fail if the OpenClaw config is missing
- fail if `openclaw config validate --json` rejects the current config
- fail if GonkaGate-managed provider fields do not match the fixed product values
- fail if `models.providers.openai.apiKey` is missing or malformed
- fail if `agents.defaults.model.primary` does not point at a curated supported model
- fail if `agents.defaults.models` exists but the managed allowlist entry is missing or mismatched
- fail if the config file permissions are not owner-only
- never rewrite the config during verification

### `src/install/verify-runtime.ts`

This is the read-only runtime verification layer used by `npx @gonkagate/openclaw verify`.

It must:

- fail if the local OpenClaw Gateway RPC is unreachable through `openclaw gateway status --require-rpc --json`
- fail if `openclaw health --json` does not report a healthy runtime snapshot
- fail if `openclaw models status --plain` does not resolve the same primary model as the saved config
- never rewrite config or mutate local OpenClaw state during verification

### `docs/`

Public user-facing documentation:

- `how-it-works.md` explains the installer contract
- `security.md` explains secret handling
- `troubleshooting.md` covers common problems

### `scripts/`

Fallback entrypoints:

- `install.sh`
- `install.ps1`

They must not replace `npx` as the primary public UX.

### `test/`

Baseline tests cover:

- automatic base setup for first-run installs
- first-run minimal Gateway bootstrap behavior
- merge behavior
- model selection behavior
- read-only verification behavior
- invalid JSON5 handling
- backup/write flow
- API key validation
- OpenClaw presence checks

## Installer Happy Path

1. The user runs `npx @gonkagate/openclaw`
2. The installer verifies that `openclaw` is installed
3. The installer resolves the active OpenClaw config path from the current environment
4. If that config path is missing, the installer runs `openclaw setup`
5. The installer loads the resolved config file
6. If Gateway mode is still unset after that bootstrap, the installer sets `gateway.mode` to `local`
7. The installer validates the current config through `openclaw config validate --json`
8. The installer securely prompts for a `gp-...` API key
9. The installer shows the curated model picker
10. The config is merged with GonkaGate-managed OpenAI settings
11. The generated candidate config is validated through `openclaw config validate --json`
12. A backup is created only when an existing config is being overwritten
13. JSON is written back to disk
14. The installer performs a best-effort runtime probe
15. If the local Gateway is not running yet, install still succeeds and prints the exact next command `openclaw gateway`

Optional follow-up verification path:

1. The user runs `npx @gonkagate/openclaw verify`
2. The CLI verifies that `openclaw` is installed
3. The CLI resolves the active OpenClaw config path from the current environment
4. The CLI loads that config file without modifying it
5. The CLI validates the current config through `openclaw config validate --json`
6. The CLI verifies the managed GonkaGate provider fields, curated primary model, and owner-only file permissions
7. The CLI confirms that the local OpenClaw Gateway RPC is reachable and the health snapshot is healthy
8. The CLI confirms that OpenClaw resolves the expected primary model through `openclaw models status --plain`
9. The CLI reports success or exits with a clear error

## What Must Not Be Broken

- Do not add a base URL prompt
- Do not add free-form custom model input
- Do not make `--api-key` a recommended or supported path
- Do not require `openclaw onboard` in the main public flow
- Do not modify shell rc files
- Do not write `.env`
- Do not destroy unrelated OpenClaw settings
- Do not silently overwrite invalid JSON5
- Do not print API keys to stdout
- Do not make `verify` mutate config or bootstrap first-run setup implicitly
- Do not turn the public README into backend-heavy documentation
- Do not replace `@inquirer/prompts`, `commander`, `json5`, or `write-file-atomic` with hand-rolled code again unless there is a strong reason

## Development Commands

Install dependencies:

```bash
npm install
```

Run in dev mode:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Check the publishable package:

```bash
npm pack --dry-run
```

## How to Make Changes Safely

- First decide whether the change is a product contract change or only a technical improvement
- Treat changes in `src/constants/` and `src/install/merge-settings.ts` as high-sensitivity
- Keep installer UX changes in sync with `README.md` and `docs/`
- Update `CHANGELOG.md` when public behavior changes
- If you add new merge, verify, or write behavior, add a test under `test/`

## Release Automation

This repository uses `release-please` on pushes to `main`.

- Releasable changes must use a conventional commit style title such as `fix: ...` or `feat: ...`
- In this repository, the merged PR title is especially important because GitHub merge commits on `main` use that title
- A PR title like `Add X` or `Update Y` can merge successfully but still fail to produce a release PR
- If the goal is to ship a user-facing fix, make the PR title releasable before merge rather than trying to repair the release afterward
- When a releasable change has already landed without a conventional title, follow up with a small releasable PR so `release-please` can cut the next release

## Areas That Require Extra Caution

Pause and double-check if your change touches:

- secret handling
- OpenClaw config format
- backup and restore behavior
- default provider wiring
- the curated model registry
- the public install command

## Repo Philosophy

This repository should stay onboarding-first.

It is not a general-purpose OpenClaw provider configurator and not a playground for dozens of options. Its value is that users get one obvious, short, and safe path: install OpenClaw, run this package, enter a `gp-...` key, choose a curated model, and then keep using OpenClaw normally.
