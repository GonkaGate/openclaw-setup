# How It Works

`@gonkagate/openclaw` updates the active OpenClaw config path and also exposes a read-only `verify` command for checking that managed GonkaGate settings are still in place and active in the local runtime.

The package resolves that active config path locally with the same active-config selection order stable OpenClaw 2026.4.1 uses:

- `OPENCLAW_CONFIG_PATH`, when set
- else, inside `OPENCLAW_STATE_DIR`, prefer an existing `openclaw.json` or `clawdbot.json`, and fall back to `OPENCLAW_STATE_DIR/openclaw.json`
- else, under `OPENCLAW_HOME` or `~`, prefer the first existing config candidate in this order: `.openclaw/openclaw.json`, `.openclaw/clawdbot.json`, `.clawdbot/openclaw.json`, `.clawdbot/clawdbot.json`
- if none of those candidates exist, fall back to canonical `.openclaw/openclaw.json`

It intentionally does not parse `openclaw config file` as a source of truth for path resolution.

Install flow:

1. Verify that `openclaw` is installed and callable from `PATH`.
2. Resolve the active OpenClaw config path locally from the current environment.
3. If that config path does not exist yet, run `openclaw setup` once to initialize the base OpenClaw config and workspace.
4. Load and parse the resolved config file as JSON5.
5. On true first-run installs only, ensure `gateway.mode` is set to `"local"` when OpenClaw setup did not already choose a gateway mode.
6. Stop with a clear error if the current config is invalid, the managed config surface has an unsafe shape, or `openclaw config validate --json` rejects the current file.
7. Prompt for the GonkaGate API key in a hidden interactive prompt.
8. Fetch the live GonkaGate catalog through `GET /v1/models` with that API key and require it to contain every curated in-code model.
9. Prompt for a model from the curated in-code registry using live catalog metadata for the provider model entries.
10. Merge only the managed OpenAI provider fields, the live curated `models.providers.openai.models` catalog entries, `agents.defaults.model.primary`, and the curated `agents.defaults.models` switcher allowlist.
11. Validate the generated config through `openclaw config validate --json` against a temporary candidate file next to the live config.
12. Create a timestamped backup next to the existing config file only when overwriting an existing config.
13. Write the resulting config atomically with owner-only permissions.
14. Run a best-effort runtime probe. If the local Gateway is not running yet, install still succeeds and prints the exact next command: `openclaw gateway`.

Verify flow:

1. Verify that `openclaw` is installed and callable from `PATH`.
2. Resolve the active OpenClaw config path locally from the current environment.
3. Load and parse that config file as JSON5 without modifying it.
4. Stop with a clear error if the file is missing, malformed, the managed config surface has an unsafe shape, or `openclaw config validate --json` rejects it.
5. Confirm that `models.providers.openai.baseUrl` still points to `https://api.gonkagate.com/v1`.
6. Confirm that `models.providers.openai.api` is still `openai-completions`.
7. Confirm that `models.providers.openai.apiKey` exists and still looks like a GonkaGate `gp-...` key.
8. Confirm that `agents.defaults.model.primary` still points at one of the curated GonkaGate models.
9. Confirm that `models.providers.openai.models` includes every curated GonkaGate model id needed by OpenClaw's model catalog.
10. Confirm that `agents.defaults.models` contains every curated GonkaGate allowlist entry and alias needed by `/models`.
11. Confirm that the config file still uses owner-only permissions.
12. Confirm that the local OpenClaw Gateway RPC is reachable through `openclaw gateway status --require-rpc --json`.
13. Confirm that `openclaw health --json` reports a healthy runtime snapshot.
14. Confirm that `openclaw models status --plain` resolves the same primary model that the saved config declares.

Managed merge behavior:

- Unrelated top-level keys are preserved.
- Other `models.providers.*` entries are preserved.
- Existing `models.providers.openai` keys outside the managed surface are preserved.
- Existing `models.providers.openai.models` entries are preserved when already present and valid.
- Live curated GonkaGate entries from `GET /v1/models` are added to `models.providers.openai.models`, or updated in place when their `id` already exists.
- Existing `agents.defaults.model` keys outside `primary` are preserved.
- Existing `agents.defaults.models` entries are preserved, and curated GonkaGate entries are created or updated so `/models` can switch between supported models.
- Existing `gateway.*` keys are preserved.
- Existing `gateway.mode` is preserved when already present.
- Only true first-run installs gain a default `gateway.mode: "local"` when the base setup omitted it.

Why JSON output instead of comment-preserving JSON5:

- OpenClaw accepts JSON as valid JSON5.
- The installer prioritizes correctness, strict validation, and atomic writes over comment round-tripping.
- Invalid existing JSON5 is never overwritten silently.
