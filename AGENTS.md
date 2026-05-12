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

After the API key is entered, the installer fetches `GET /v1/models` from GonkaGate, requires the live catalog to contain every code-owned curated model, and uses that live metadata to populate the OpenClaw provider model catalog.

If the active OpenClaw config path does not exist yet, the installer runs `openclaw setup` automatically to initialize the base OpenClaw config and workspace, ensures a minimal local Gateway mode when OpenClaw setup did not already pick one, and then applies GonkaGate-managed settings.

After setup, users can run a read-only verification command:

```bash
npx @gonkagate/openclaw verify
```

That command checks the current active OpenClaw config path, confirms that the managed GonkaGate provider fields, curated provider model catalog, curated `/models` allowlist, curated primary model, and owner-only file permissions still match the supported setup, and then verifies that the active local OpenClaw runtime is healthy enough to load that config through read-only CLI probes.

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
- `models.providers.openai.models` must always end up as a valid array containing the curated GonkaGate model catalog entries returned by `GET /v1/models`, while preserving unrelated existing entries
- users do not choose the base URL and cannot override it in the public flow
- the provider is always `openai`, not `anthropic`
- model choice comes only from a code-owned curated registry
- the primary UX is `npx @gonkagate/openclaw`
- the follow-up verification UX is `npx @gonkagate/openclaw verify`
- API key entry must remain interactive and hidden
- the installer writes OpenClaw config, not shell env and not shell rc files
- the active target path is resolved locally with this stable-upstream-compatible order:
  `OPENCLAW_CONFIG_PATH`; else, inside `OPENCLAW_STATE_DIR` when set, prefer existing `openclaw.json` then `clawdbot.json` and fall back to `openclaw.json`; else under the resolved home (`OPENCLAW_HOME` or `~`) prefer the first existing of `.openclaw/openclaw.json`, `.openclaw/clawdbot.json`, `.clawdbot/openclaw.json`, `.clawdbot/clawdbot.json`, and fall back to `.openclaw/openclaw.json`
- the code must not use `openclaw config file` as the source of truth for target path resolution
- if the resolved config is missing, the installer bootstraps it through `openclaw setup`
- true first-run installs may add `gateway.mode: "local"` when OpenClaw setup left gateway mode unset
- unrelated settings must survive
- the installer must create a backup before overwriting an existing config
- invalid existing JSON5 must stop the installer
- config files must be written with owner-only permissions
- backup files must be written with owner-only permissions
- `agents.defaults.model.primary` must be updated to the selected curated model
- `agents.defaults.models` must be created or updated with the curated GonkaGate allowlist so OpenClaw `/models` can switch between supported models
- the installer must never expose arbitrary live `GET /v1/models` entries as selectable models unless they are also in the code-owned curated registry

Current honest limitation:

- the curated registry currently contains these supported models:
  - `qwen3-235b` -> `qwen/qwen3-235b-a22b-instruct-2507-fp8`
  - `kimi-k2.6` -> `moonshotai/kimi-k2.6` (default)

## What the Repo Does and Does Not Do

This repo does:

- onboarding for local `OpenClaw`
- read-only verification for the managed GonkaGate OpenClaw config
- read-only runtime verification for the active local OpenClaw Gateway and resolved primary model
- live GonkaGate model catalog validation through `GET /v1/models` before prompting for a model
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
│   │   ├── cli-display.ts
│   │   ├── file-permissions.ts
│   │   ├── gonkagate-models.ts
│   │   ├── install-use-case.ts
│   │   ├── load-settings.ts
│   │   ├── managed-settings-access.ts
│   │   ├── merge-settings.ts
│   │   ├── openclaw-client.ts
│   │   ├── openclaw-command.ts
│   │   ├── openclaw-config-validation.ts
│   │   ├── openclaw-facade.ts
│   │   ├── object-utils.ts
│   │   ├── prompts.ts
│   │   ├── settings-paths.ts
│   │   ├── validate-api-key.ts
│   │   ├── verify-runtime.ts
│   │   ├── verify-settings.ts
│   │   ├── verify-use-case.ts
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
    ├── gonkagate-models.test.ts
    ├── install-use-case.test.ts
    ├── load-settings.test.ts
    ├── merge-settings.test.ts
    ├── openclaw-config-validation.test.ts
    ├── prompts-validate-api-key.test.ts
    ├── settings-paths.test.ts
    ├── test-helpers.ts
    ├── verify-runtime.test.ts
    ├── verify-settings.test.ts
    ├── verify-use-case.test.ts
    └── write-backup-check-openclaw.test.ts
```

## How the Code Is Organized

### `src/cli.ts`

This is the main installer and verification entrypoint.

CLI parsing and help output are implemented with `commander`.

It is responsible for:

- parsing CLI args through `commander`
- rendering help and version output
- resolving the active target config path locally from the current environment
- dispatching to the install and verify use-case modules
- printing transport-ready display output returned by the use-case layer

`src/cli.ts` is intentionally a thin transport layer. Business-step orchestration should stay out of this file unless it is purely about CLI parsing or console output.

### `src/install/install-use-case.ts`

This file owns the install orchestration.

It is responsible for:

- verifying that `openclaw` is installed before any other install step
- loading the active config or bootstrapping it through `openclaw setup` on first run
- applying first-run-only local Gateway bootstrap logic
- validating the current config before prompting for secrets
- running the hidden API key prompt
- fetching and validating the live GonkaGate model catalog before model selection
- selecting the model
- merging GonkaGate settings into the existing config
- validating the generated candidate config before replacing the live file
- creating a backup before overwriting an existing config
- writing the final file
- performing the install-time runtime probe and returning the resulting outcome
- producing the transport-ready install display model consumed by `src/cli.ts`

### `src/install/verify-use-case.ts`

This file owns the read-only verification orchestration.

It is responsible for:

- verifying that `openclaw` is installed
- loading the current config without mutating it
- validating the current config through `openclaw config validate --json`
- delegating config verification to `verify-settings.ts`
- delegating runtime verification to `verify-runtime.ts`
- returning the structured verification outcome plus the transport-ready display model back to the CLI transport layer

### `src/install/cli-display.ts`

This file owns the stable display model passed from the use-case layer to the CLI transport.

It is responsible for:

- defining the sectioned CLI display shape
- mapping install outcomes into user-facing success sections
- mapping verify outcomes into user-facing success sections
- keeping workflow-detail branching out of `src/cli.ts`

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

### `src/install/gonkagate-models.ts`

This file owns the GonkaGate `GET /v1/models` trust boundary.

It must:

- call `https://api.gonkagate.com/v1/models` with the entered `gp-...` key
- reject authentication failures before config writes
- validate and normalize the external JSON response before the install use-case consumes it
- keep selectable models restricted to the code-owned curated registry
- require the live catalog to contain every curated supported model
- map live metadata into OpenClaw provider model catalog entries without trusting unrelated response fields

### `src/install/check-openclaw.ts`

Verifies that the local `openclaw` CLI exists and is callable through `openclaw --version`.

It also runs `openclaw setup` for first-run installs when the resolved config path has not been created yet.

It is a compatibility wrapper over the typed OpenClaw client boundary.

### `src/install/file-permissions.ts`

This file owns the owner-only permission policy and formatting helpers shared by write, backup, and verify flows.

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
- else, inside `OPENCLAW_STATE_DIR` when set, prefer existing `openclaw.json` then `clawdbot.json` and fall back to `openclaw.json`
- else, under the resolved home (`OPENCLAW_HOME` or `~`), prefer the first existing of `.openclaw/openclaw.json`, `.openclaw/clawdbot.json`, `.clawdbot/openclaw.json`, `.clawdbot/clawdbot.json`
- else fall back to `.openclaw/openclaw.json` under that same resolved home

It must not parse `openclaw config file` as an absolute-path source of truth.

There is no project-local scope in v1 beyond these OpenClaw-supported env overrides.

### `src/install/load-settings.ts`

Safely reads the target file as JSON5.

Rules:

- if the file does not exist, the loader returns `kind: "missing"`
- the CLI may bootstrap the base OpenClaw config through `openclaw setup`
- if the JSON5 is broken, the installer must stop
- the installer must not silently overwrite a corrupted file
- if managed surfaces like `models.providers.openai` or `agents.defaults.models` are present with invalid shapes, the installer must stop
- if `models.providers.openai.models` is present, it must be a JSON5 array

### `src/install/managed-settings-access.ts`

This file is the single typed boundary for the managed OpenClaw config surface.

It must:

- define the owned managed path names
- expose a read-only view over the managed config surface
- validate managed-object and array shapes consistently for load, merge, and verify flows
- provide normalized copies for write-oriented merge logic so managed-surface policy is not spread across multiple modules

### `src/install/merge-settings.ts`

This is the core business-logic merge layer.

It must:

- preserve unrelated top-level keys
- preserve unrelated provider entries
- overwrite only OpenClaw-managed `openai` provider fields
- preserve unrelated existing `models.providers.openai.models` entries when present
- add or update curated GonkaGate provider model catalog entries under `models.providers.openai.models`
- set `agents.defaults.model.primary`
- preserve unrelated keys inside `agents.defaults.model`
- create or update `agents.defaults.models` with every curated GonkaGate allowlist entry needed by OpenClaw `/models`

It must consume the shared managed-settings boundary instead of re-deriving managed object shapes locally.

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

It should rely on the shared OpenClaw client boundary for `openclaw config validate --json` command semantics.

### `src/install/openclaw-facade.ts`

This file is the shared composition boundary for install and verify use-cases.

It is responsible for:

- constructing one shared `OpenClaw` capability bag from the typed OpenClaw client
- exposing config validation, candidate validation, and runtime verification through one injected seam
- keeping `src/install/install-use-case.ts` and `src/install/verify-use-case.ts` from reassembling OpenClaw dependencies independently

### `src/install/openclaw-client.ts`

This file is the typed OpenClaw CLI adapter.

It must:

- own command spawning options for version checks, setup, validation, and runtime probes
- export the canonical command descriptions and probe expectations consumed by higher-level runtime validation
- own `OPENCLAW_CONFIG_PATH` env wiring for explicit config validation
- parse structured CLI output for validation, gateway status, health, and model status
- keep OpenClaw command semantics centralized so feature modules do not duplicate command names, flags, and output parsing

### `src/install/openclaw-command.ts`

This file is the low-level process-spawn helper used by the OpenClaw client.

It should stay small and generic: spawn processes, normalize raw command results, and format combined stdout/stderr output.

### `src/install/verify-settings.ts`

This is the read-only config verification layer used by `npx @gonkagate/openclaw verify`.

It must:

- fail if the OpenClaw config is missing
- fail if `openclaw config validate --json` rejects the current config
- fail if GonkaGate-managed provider fields do not match the fixed product values
- fail if `models.providers.openai.apiKey` is missing or malformed
- fail if `agents.defaults.model.primary` does not point at a curated supported model
- fail if `models.providers.openai.models` omits a curated GonkaGate model catalog entry
- fail if `agents.defaults.models` is missing or any managed curated allowlist entry is missing or mismatched
- fail if the config file permissions are not owner-only
- never rewrite the config during verification

### `src/install/verify-runtime.ts`

This is the read-only runtime verification layer used by `npx @gonkagate/openclaw verify`.

It must:

- fail if the local OpenClaw Gateway RPC is unreachable through `openclaw gateway status --require-rpc --json`
- fail if `openclaw health --json` does not report a healthy runtime snapshot
- fail if `openclaw models status --plain` does not resolve the same primary model as the saved config
- never rewrite config or mutate local OpenClaw state during verification

It should consume the shared OpenClaw client probe layer rather than shelling out directly on its own.

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

- thin CLI delegation and console output
- automatic base setup for first-run installs
- install orchestration ownership
- first-run minimal Gateway bootstrap behavior
- merge behavior
- model selection behavior
- live GonkaGate model catalog parsing and filtering behavior
- read-only verification behavior
- verify orchestration ownership
- invalid JSON5 handling
- backup/write flow
- API key validation
- OpenClaw presence checks
- OpenClaw config path selection behavior

## Installer Happy Path

1. The user runs `npx @gonkagate/openclaw`
2. The installer verifies that `openclaw` is installed
3. The installer resolves the active OpenClaw config path from the current environment
4. If that config path is missing, the installer runs `openclaw setup`
5. The installer loads the resolved config file
6. If Gateway mode is still unset after that bootstrap, the installer sets `gateway.mode` to `local`
7. The installer validates the current config through `openclaw config validate --json`
8. The installer securely prompts for a `gp-...` API key
9. The installer fetches `GET /v1/models` and confirms every curated supported model is live
10. The installer shows the curated model picker
11. The config is merged with GonkaGate-managed OpenAI settings, provider model catalog entries, and `/models` allowlist entries
12. The generated candidate config is validated through `openclaw config validate --json`
13. A backup is created only when an existing config is being overwritten
14. JSON is written back to disk
15. The installer performs a best-effort runtime probe
16. If the local Gateway is not running yet, install still succeeds and prints the exact next command `openclaw gateway`

Optional follow-up verification path:

1. The user runs `npx @gonkagate/openclaw verify`
2. The CLI verifies that `openclaw` is installed
3. The CLI resolves the active OpenClaw config path from the current environment
4. The CLI loads that config file without modifying it
5. The CLI validates the current config through `openclaw config validate --json`
6. The CLI verifies the managed GonkaGate provider fields, curated provider model catalog entries, curated `/models` allowlist, curated primary model, and owner-only file permissions
7. The CLI confirms that the local OpenClaw Gateway RPC is reachable and the health snapshot is healthy
8. The CLI confirms that OpenClaw resolves the expected primary model through `openclaw models status --plain`
9. The CLI reports success or exits with a clear error

## What Must Not Be Broken

- Do not add a base URL prompt
- Do not add free-form custom model input
- Do not make `--api-key` a recommended or supported path
- Do not expose arbitrary `GET /v1/models` results as selectable models outside the curated registry
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

@RTK.md

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
