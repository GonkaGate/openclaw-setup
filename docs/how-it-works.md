# How It Works

`@gonkagate/openclaw` updates the active OpenClaw config path and also exposes a read-only `verify` command for checking that managed GonkaGate settings are still in place and active in the local runtime.

The package resolves that active config path locally with the same precedence OpenClaw uses:

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR/openclaw.json`
- `OPENCLAW_HOME/.openclaw/openclaw.json`
- default `~/.openclaw/openclaw.json`

It intentionally does not parse `openclaw config file` as a source of truth for path resolution.

Install flow:

1. Verify that `openclaw` is installed and callable from `PATH`.
2. Resolve the active OpenClaw config path locally from the current environment.
3. If that config path does not exist yet, run `openclaw setup` once to initialize the base OpenClaw config and workspace.
4. Load and parse the resolved config file as JSON5.
5. On true first-run installs only, ensure `gateway.mode` is set to `"local"` when OpenClaw setup did not already choose a gateway mode.
6. Stop with a clear error if the current config is invalid, the managed config surface has an unsafe shape, or `openclaw config validate --json` rejects the current file.
7. Prompt for the GonkaGate API key in a hidden interactive prompt.
8. Prompt for a model from the curated in-code registry.
9. Merge only the managed OpenAI provider fields plus `agents.defaults.model.primary`, while ensuring `models.providers.openai.models` remains a valid array.
10. Validate the generated config through `openclaw config validate --json` against a temporary candidate file next to the live config.
11. Create a timestamped backup next to the existing config file only when overwriting an existing config.
12. Write the resulting config atomically with owner-only permissions.
13. Run a best-effort runtime probe. If the local Gateway is not running yet, install still succeeds and prints the exact next command: `openclaw gateway`.

Verify flow:

1. Verify that `openclaw` is installed and callable from `PATH`.
2. Resolve the active OpenClaw config path locally from the current environment.
3. Load and parse that config file as JSON5 without modifying it.
4. Stop with a clear error if the file is missing, malformed, the managed config surface has an unsafe shape, or `openclaw config validate --json` rejects it.
5. Confirm that `models.providers.openai.baseUrl` still points to `https://api.gonkagate.com/v1`.
6. Confirm that `models.providers.openai.api` is still `openai-completions`.
7. Confirm that `models.providers.openai.apiKey` exists and still looks like a GonkaGate `gp-...` key.
8. Confirm that `agents.defaults.model.primary` still points at one of the curated GonkaGate models.
9. If `agents.defaults.models` exists, confirm that the managed allowlist entry still matches the selected curated model alias.
10. Confirm that the config file still uses owner-only permissions.
11. Confirm that the local OpenClaw Gateway RPC is reachable through `openclaw gateway status --require-rpc --json`.
12. Confirm that `openclaw health --json` reports a healthy runtime snapshot.
13. Confirm that `openclaw models status --plain` resolves the same primary model that the saved config declares.

Managed merge behavior:

- Unrelated top-level keys are preserved.
- Other `models.providers.*` entries are preserved.
- Existing `models.providers.openai` keys outside the managed surface are preserved.
- Existing `models.providers.openai.models` entries are preserved when already present and valid.
- If `models.providers.openai.models` is missing, it is initialized to `[]` so the config stays valid for current OpenClaw releases.
- Existing `agents.defaults.model` keys outside `primary` are preserved.
- Existing `agents.defaults.models` entries are preserved and only extended when the allowlist already exists.
- Existing `gateway.*` keys are preserved.
- Existing `gateway.mode` is preserved when already present.
- Only true first-run installs gain a default `gateway.mode: "local"` when the base setup omitted it.

Why JSON output instead of comment-preserving JSON5:

- OpenClaw accepts JSON as valid JSON5.
- The installer prioritizes correctness, strict validation, and atomic writes over comment round-tripping.
- Invalid existing JSON5 is never overwritten silently.
