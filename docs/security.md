# Security Notes

This installer writes a live API credential into the active OpenClaw config path, so secret handling is intentionally conservative.

Current protections:

- API keys are accepted only through a hidden interactive prompt.
- `--api-key` CLI arguments are rejected to avoid leaking secrets into shell history and process listings.
- The entered API key is sent only to GonkaGate `GET /v1/models` for live catalog validation before it is written into the OpenClaw config.
- Generated configs are schema-validated through a temporary candidate file before the live config is replaced.
- Existing configs are backed up before overwrite.
- Config writes are atomic.
- Config files are written with owner-only permissions (`0600`).
- Backup files are also normalized to owner-only permissions (`0600`).
- Invalid existing JSON5 is treated as a hard stop, not something to overwrite.

Operational recommendations:

- Treat the active OpenClaw config file and any adjacent `openclaw.json.backup-*` files as secret-bearing files.
- Treat the install directory as sensitive while the installer is running; the validation candidate file is written with `0600` permissions and deleted immediately after validation.
- Do not commit or sync those files into repositories, screenshots, or public bug reports.
- Rotate the GonkaGate API key if you ever suspect the config file was exposed.
