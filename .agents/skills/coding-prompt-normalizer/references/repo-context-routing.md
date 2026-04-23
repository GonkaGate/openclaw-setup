# Repo Context Routing

Use this file to choose only the repository context that materially changes the
generated context handoff prompt.

Do not dump the whole repo summary into the output. Pull only the relevant
points.

## Always-True Defaults

- The downstream agent already works inside this repository.
- Do not explain how to inspect files, edit code, create folders, or run
  ordinary repo commands.
- `openclaw-setup` is a TypeScript Node CLI using `commander`,
  `@inquirer/prompts`, `json5`, and `write-file-atomic`.
- Canonical code areas are `src/cli.ts`, `src/constants/`, `src/install/`,
  `test/`, `docs/`, and `scripts/run-tests.mjs`.
- `AGENTS.md` is the main contract document for product invariants and behavior.
- Avoid generic tool instructions like "inspect the repo" unless the request
  explicitly needs them.

## Use Repo Constraints Selectively

Include a repository constraint only when it changes the task:

- the primary public flow is `npx @gonkagate/openclaw`
- the follow-up verification flow is `npx @gonkagate/openclaw verify`
- `models.providers.openai.baseUrl` is fixed to `https://api.gonkagate.com/v1`
- `models.providers.openai.api` is fixed to `openai-completions`
- the provider is fixed to `openai`
- API key entry stays interactive and hidden; `--api-key` is intentionally
  unsupported
- the installer writes `~/.openclaw/openclaw.json`, not shell rc files or `.env`
- if the config is missing, the installer bootstraps through `openclaw setup`
- true first-run installs may set `gateway.mode: "local"` only when absent
- invalid existing JSON5 is a hard stop
- config files and backup files must use owner-only permissions
- `verify` is read-only and must not mutate config or bootstrap first-run setup
- if install succeeds but the Gateway is not running yet, the exact next command
  is `openclaw gateway`
- if public behavior changes, `AGENTS.md`, `README.md`, `docs/`, and
  `CHANGELOG.md` may need updates to stay truthful

## Routing By Task Signal

### CLI Parsing, Help, Public UX

Use when the request mentions CLI args, help output, subcommands, install flow,
verify flow, public messaging, or package entrypoints.

Useful context:

- `src/cli.ts`
- `bin/gonkagate-openclaw.js`
- `package.json`
- `README.md`
- `AGENTS.md`

### Config Loading, Merge, Write, Backup

Use when the request mentions JSON5 parsing, merge behavior, preserving
unrelated settings, backup creation, target paths, or file permissions.

Useful context:

- `src/install/load-settings.ts`
- `src/install/merge-settings.ts`
- `src/install/write-settings.ts`
- `src/install/backup.ts`
- `src/install/settings-paths.ts`
- `src/types/settings.ts`
- tests under `test/load-settings.test.ts`, `test/merge-settings.test.ts`, and
  `test/write-backup-check-openclaw.test.ts`

Relevant reminders:

- invalid JSON5 must stop the installer
- unrelated settings must survive
- backup and config files must remain owner-only

### Validation, Verification, Runtime Checks

Use when the request mentions schema validation, read-only verify behavior,
runtime health, Gateway RPC, or model resolution.

Useful context:

- `src/install/openclaw-config-validation.ts`
- `src/install/verify-settings.ts`
- `src/install/verify-runtime.ts`
- `src/install/check-openclaw.ts`
- `docs/how-it-works.md`
- `docs/troubleshooting.md`
- tests under `test/openclaw-config-validation.test.ts`,
  `test/verify-settings.test.ts`, and `test/verify-runtime.test.ts`

Relevant reminders:

- `verify` must stay read-only
- runtime verification depends on `openclaw gateway status --require-rpc --json`,
  `openclaw health --json`, and `openclaw models status --plain`
- Gateway-not-running can still be a successful install outcome

### Prompts, Models, Secrets

Use when the request mentions the API key prompt, model selection, curated
models, secret handling, or prompt behavior.

Useful context:

- `src/install/prompts.ts`
- `src/install/validate-api-key.ts`
- `src/constants/models.ts`
- `src/constants/gateway.ts`
- `docs/security.md`
- `test/prompts-validate-api-key.test.ts`

Relevant reminders:

- API key entry must remain interactive and hidden
- model choice comes only from the curated registry
- users do not choose the base URL in the public flow

### Docs, Product Messaging, Truthfulness

Use when the task is mainly about repo documentation, user-facing flow
description, troubleshooting, or changelog accuracy.

Useful context:

- `README.md`
- `docs/how-it-works.md`
- `docs/security.md`
- `docs/troubleshooting.md`
- `CHANGELOG.md`
- `AGENTS.md`

Relevant reminders:

- `AGENTS.md` must stay aligned with the real implementation
- public-flow changes are product changes, not small refactors

### Skills, Prompts, Agent Workflow

Use when the request is about local skills, prompt rewriting, agent
instructions, or repo-local workflow assets.

Useful context:

- `.agents/skills/`
- `AGENTS.md`
- any existing local skill folder related to the request

## Output Discipline

When you include repo context in the final handoff prompt:

- prefer short bullets or short paragraphs
- name the most relevant docs or code areas first
- keep background only if it changes the downstream agent's first decisions
- avoid repeating repo facts unless they change the downstream agent's first
  decisions
