# Troubleshooting

## `OpenClaw CLI was not found in PATH`

Install OpenClaw first, then rerun the installer. This package configures OpenClaw but does not install it.

You can also confirm the environment later with:

```bash
npx @gonkagate/openclaw verify
```

## `Unable to initialize the local OpenClaw config automatically`

The installer uses `openclaw setup` to bootstrap whichever OpenClaw config path is currently active for your environment.

If that step fails:

```bash
openclaw setup
```

Then rerun:

```bash
npx @gonkagate/openclaw
```

If `openclaw setup` is not available in your OpenClaw build, update OpenClaw first.

## Which config file does this package manage?

The installer and `verify` command use the same OpenClaw-compatible precedence order:

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR/openclaw.json`
- `OPENCLAW_HOME/.openclaw/openclaw.json`
- default `~/.openclaw/openclaw.json`

If install and verify appear to point at different files, check whether you changed any of these env vars between runs:

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_HOME`
- `OPENCLAW_STATE_DIR`

You can inspect the current values in your shell before rerunning either command:

```bash
printf 'OPENCLAW_CONFIG_PATH=%s\nOPENCLAW_STATE_DIR=%s\nOPENCLAW_HOME=%s\n' \
  "$OPENCLAW_CONFIG_PATH" "$OPENCLAW_STATE_DIR" "$OPENCLAW_HOME"
```

Then rerun:

```bash
npx @gonkagate/openclaw
npx @gonkagate/openclaw verify
```

## The installer finished and told me to run `openclaw gateway`

That means the config write and validation succeeded, but the local OpenClaw Gateway was not running yet.

Run exactly:

```bash
openclaw gateway
```

After the Gateway is up, you can confirm the full setup with:

```bash
npx @gonkagate/openclaw verify
```

## `Failed to parse JSON5`

The active OpenClaw config file is malformed. Fix or restore that file before rerunning the installer.

The same parse check also blocks:

```bash
npx @gonkagate/openclaw verify
```

## `OpenClaw rejected the config ...`

The config parsed as JSON5, but it failed current OpenClaw schema validation through `openclaw config validate --json`.

Check the schema issues directly:

```bash
openclaw config validate --json
```

If the failure comes from an older custom provider block or a partially edited config, fix that first, then rerun:

```bash
npx @gonkagate/openclaw
```

If your OpenClaw build does not support `openclaw config validate --json`, update OpenClaw first.

## `OpenClaw config was not found`

The read-only verify command does not bootstrap first-run OpenClaw state.

If you have never run the installer before, or if your current OpenClaw path overrides point at a different config file than the one you installed earlier, initialize the managed config with:

```bash
npx @gonkagate/openclaw
```

Then re-run:

```bash
npx @gonkagate/openclaw verify
```

## `Unable to confirm that the local OpenClaw Gateway RPC is healthy`

`verify` now checks the active local runtime as well as the saved config.

If the Gateway is not running yet, start OpenClaw normally and rerun:

```bash
npx @gonkagate/openclaw verify
```

If you want a direct runtime diagnosis first:

```bash
openclaw gateway status --require-rpc
openclaw health --json
```

If the Gateway still does not come up, check the local status summary:

```bash
openclaw status --deep
```

## `Expected "models.providers.openai.baseUrl"...` or other GonkaGate field mismatch errors

The config exists, but the managed GonkaGate fields no longer match the supported setup.

Reapply the managed settings with:

```bash
npx @gonkagate/openclaw
```

## The model or provider change does not appear in OpenClaw

OpenClaw should hot-reload config updates automatically. If it does not, run:

```bash
openclaw gateway restart
```

Then verify:

```bash
npx @gonkagate/openclaw verify
openclaw status --deep
```

And in chat:

```text
/status
```

## Authentication or routing still fails

Check the credential and endpoint directly against GonkaGate:

```bash
curl https://api.gonkagate.com/v1/chat/completions \
  -H "Authorization: Bearer gp-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    "messages": [{"role": "user", "content": "hello"}]
  }'
```

If this direct request fails, fix the API key or account issue first before debugging OpenClaw config behavior.

## `Expected ... to use owner-only permissions`

The config file permissions became broader than the expected owner-only mode.

Re-running the installer will rewrite the file with owner-only permissions:

```bash
npx @gonkagate/openclaw
```

Then verify again:

```bash
npx @gonkagate/openclaw verify
```
