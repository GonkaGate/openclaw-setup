---
name: openclaw-upstream-compatibility-audit
description: "Read-only compatibility audit between `openclaw-setup` and the latest stable `OpenClaw` release. Use whenever the task is to decide whether this repository still matches upstream `OpenClaw` config, setup, validation, or runtime-probe contracts, even if the user only asks 'is this still compatible?' or 'did upstream break us?'."
---

# OpenClaw Upstream Compatibility Audit

## Purpose

Use this skill to answer one practical question:
is `openclaw-setup` still compatible with the current stable upstream
`OpenClaw` contract or not?

This is a read-only compatibility gate. The job is to compare official
upstream behavior against the assumptions encoded in this repository and return
a clear verdict, not to design or apply a migration.

## Scope

Cover both:

- install-time behavior for `npx @gonkagate/openclaw`
- read-only verification behavior for `npx @gonkagate/openclaw verify`

Check for contract drift in:

- config file location and env-variable precedence
- config format and parser expectations such as `JSON5`
- managed field names, nesting, or allowed shapes under
  `models.providers.openai.*` and `agents.defaults.*`
- first-run behavior of `openclaw setup`
- semantics or output contract of `openclaw config validate --json`
- semantics or output contract of
  `openclaw gateway status --require-rpc --json`
- semantics or output contract of `openclaw health --json`
- semantics or output contract of `openclaw models status --plain`
- newly required settings or structural changes that would make install or
  verify unsupported even if commands still exist

## Boundaries

Do not:

- modify repository code
- broaden product scope beyond the current onboarding contract
- propose `.env` writing, shell rc mutation, custom base URL prompts, or
  free-form model input
- use prereleases by default
- rely on blog posts, issue comments, forum answers, or other secondary
  summaries when primary sources are available
- turn the audit into an auto-remediation or full migration plan

## Primary-Source Discipline

Use primary sources only:

- npm registry metadata for the published `openclaw` package
- official OpenClaw release notes or changelog
- official OpenClaw docs and CLI help text
- official upstream source and tests at the matching stable release tag
- shipped package metadata or tarball contents for the same stable version

Default target:

- the latest stable upstream `OpenClaw` release
- not prereleases unless the user explicitly asks for them

Prefer this discovery order:

1. `npm view openclaw version dist-tags repository.url homepage --json`
2. official release notes or changelog for that exact stable version
3. official docs or help text for config and command behavior
4. tagged upstream source or tests when docs are incomplete

Useful starting points:

- `npm view openclaw@"<version>" dist.tarball gitHead --json`
- `npx -y openclaw@<version> --help`
- `npx -y openclaw@<version> config validate --help`
- `npx -y openclaw@<version> gateway status --help`
- `npx -y openclaw@<version> health --help`
- `npx -y openclaw@<version> models status --help`

If you need to search the web to find official pages, restrict search to the
official repository host and official OpenClaw docs domains discovered from
package metadata. If docs and the shipped stable artifact disagree, trust the
shipped stable artifact and call out documentation drift explicitly.

## Safe Read-Only Execution

Keep the audit read-only.

- Prefer release notes, docs, CLI help, source, and tests over running commands
  that initialize state.
- Never run upstream commands against the user's real `~/.openclaw` or active
  config path.
- If you must observe behavior such as `openclaw setup`, isolate it in a
  disposable temp directory and point `OPENCLAW_HOME`,
  `OPENCLAW_STATE_DIR`, or `OPENCLAW_CONFIG_PATH` at temp paths.
- Treat isolated temp-state inspection as a last resort after docs, help, and
  tagged source.

## Repository Surfaces To Compare

Start from `AGENTS.md`, especially:

- the fixed product invariants
- the installer happy path
- the read-only verification flow
- the listed non-goals and "must not be broken" rules

Inspect these repo surfaces directly:

- `src/install/settings-paths.ts`
- `src/install/load-settings.ts`
- `src/install/managed-settings-access.ts`
- `src/install/merge-settings.ts`
- `src/install/openclaw-config-validation.ts`
- `src/install/openclaw-client.ts`
- `src/install/check-openclaw.ts`
- `src/install/verify-settings.ts`
- `src/install/verify-runtime.ts`

Inspect these adjacent supporting surfaces when needed:

- `src/install/install-use-case.ts`
- `src/install/verify-use-case.ts`
- `src/install/bootstrap-gateway.ts`
- `src/install/write-settings.ts`
- `src/constants/gateway.ts`
- `src/constants/models.ts`
- `src/types/settings.ts`

Use nearby tests to confirm the repository's intended contract:

- `test/settings-paths.test.ts`
- `test/load-settings.test.ts`
- `test/openclaw-config-validation.test.ts`
- `test/verify-settings.test.ts`
- `test/verify-runtime.test.ts`
- `test/install-use-case.test.ts`
- `test/verify-use-case.test.ts`

## Upstream Evidence To Gather

For the target stable release, gather evidence for:

- where OpenClaw loads config from and which env vars control that path
- what file syntax and parser rules the active config accepts
- the expected shape of `models.providers.openai.*`
- the expected shape of `agents.defaults.*`
- what `openclaw setup` creates on a first run and whether it still bootstraps
  the same baseline config
- whether `openclaw config validate --json` still exists, which config path it
  validates, and the JSON fields it returns
- whether `openclaw gateway status --require-rpc --json` still exists and what
  JSON contract it returns
- whether `openclaw health --json` still exists and what JSON contract it
  returns
- whether `openclaw models status --plain` still exists and what plain-text
  contract it returns
- any new mandatory settings, schema migrations, or structural requirements
  that this repo does not currently satisfy

When searching upstream source or package contents, start with these literals:

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_HOME`
- `config validate`
- `gateway status`
- `--require-rpc`
- `health`
- `models status`
- `--plain`
- `setup`
- `providers.openai`
- `agents.defaults`

## Workflow

1. Identify the audit target.
   - Determine the latest stable `openclaw` release from official package
     metadata.
   - Confirm the tagged release notes, docs, and source all refer to the same
     version.
   - Ignore prereleases unless the user explicitly asked for them.
2. Capture the upstream contract before judging compatibility.
   - Read official release notes or changelog entries for the target version.
   - Read official docs or help text for config resolution, setup, validation,
     gateway status, health, and model status.
   - Read tagged source or tests when official docs are vague, incomplete, or
     missing concrete output shapes.
3. Map the repository's assumptions.
   - Read `AGENTS.md` first.
   - Then inspect the code and tests listed above.
   - Keep install-time assumptions separate from verify-time assumptions.
4. Compare the critical seams one by one.
   - `Config path precedence`
     Compare upstream env vars and lookup order against
     `src/install/settings-paths.ts`.
   - `Config syntax and parser`
     Compare upstream accepted file format and parser expectations against
     `src/install/load-settings.ts`, `src/install/write-settings.ts`, and
     candidate-validation flow.
   - `Managed config structure`
     Compare upstream schema and nesting against
     `src/install/managed-settings-access.ts`,
     `src/install/merge-settings.ts`, `src/install/verify-settings.ts`, and
     `src/types/settings.ts`.
   - `First-run bootstrap`
     Compare `openclaw setup` expectations against
     `src/install/check-openclaw.ts`, `src/install/install-use-case.ts`, and
     `src/install/bootstrap-gateway.ts`.
   - `Validation command contract`
     Compare `openclaw config validate --json` semantics and output against
     `src/install/openclaw-client.ts` and
     `src/install/openclaw-config-validation.ts`.
   - `Runtime probe contracts`
     Compare `openclaw gateway status --require-rpc --json`,
     `openclaw health --json`, and `openclaw models status --plain` against
     `src/install/openclaw-client.ts` and `src/install/verify-runtime.ts`.
   - `New mandatory requirements`
     Look for any new required keys, structure, or runtime preconditions that
     would make install or verify unsupported even if the old commands still
     exist.
5. Classify the evidence.
   - Label each material point as:
     `confirmed upstream change`, `confirmed still compatible`, or
     `inferred risk`.
   - Keep observed upstream facts separate from your interpretation of impact.
6. Decide the verdict.
   - `compatible`
     No confirmed upstream stable change breaks this repo's contract. Any
     remaining uncertainty is minor and non-material.
   - `compatible with caveats`
     No confirmed break yet, but there is a meaningful ambiguity, deprecation,
     docs/source mismatch, or nearby contract drift that weakens confidence or
     needs follow-up.
   - `incompatible`
     A confirmed upstream stable contract change conflicts with the repo's
     required assumptions or parsers.
7. Name the minimum follow-up.
   - Point to the exact repo surfaces that would need attention.
   - Keep this as `recommended fix areas`, not a redesign.

## Reasoning Discipline

- Separate confirmed upstream changes from inferred risk.
- Treat changes under `models.providers.openai.*` and `agents.defaults.*` as
  high-sensitivity by default.
- Treat changed or removed CLI flags, exit-code semantics, or output fields as
  breaking unless the repo code clearly tolerates them.
- Judge command compatibility against the repository's actual parsers and
  assumptions, not against whether a human could still understand the output.
- Evaluate install and verify separately before producing the overall verdict.
- If install still works but `verify` is broken, that is not fully compatible.
- If upstream docs are vague but tagged source or shipped package contents are
  clear, cite the shipped behavior and explain that the docs were insufficient.
- Do not infer support for out-of-scope product changes that this repository
  explicitly rejects.

## Output

Load `references/report-template.md` before writing the final answer.

The report should:

- cite the exact stable version audited
- link the primary sources used
- separate confirmed upstream changes from inferred risk
- state whether install, verify, or both are affected
- point to the exact repository surfaces that would break
- include a short `recommended fix areas` section only when the verdict is
  `compatible with caveats` or `incompatible`

Keep the output short, decisive, and evidence-backed.
