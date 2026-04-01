#!/usr/bin/env sh
set -eu

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Install Node.js 18+ and retry." >&2
  exit 1
fi

npx @gonkagate/openclaw "$@"
