#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$ROOT_DIR/server.sh" stop >/dev/null 2>&1 || true
exec "$ROOT_DIR/server.sh" start
