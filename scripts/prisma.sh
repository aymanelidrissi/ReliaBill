#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Root .env not found at $ROOT_DIR/.env" >&2
  exit 1
fi

set -a
source "$ROOT_DIR/.env"
set +a

cd "$API_DIR"

cmd="${1:-}"
case "$cmd" in
  generate)
    pnpm prisma generate
    ;;
  migrate)
    name="${2:-manual_migration}"
    pnpm prisma migrate dev -n "$name"
    ;;
  studio)
    pnpm prisma studio
    ;;
  *)
    echo "Usage:"
    echo "  scripts/prisma.sh generate"
    echo "  scripts/prisma.sh migrate \"migration_name\""
    echo "  scripts/prisma.sh studio"
    exit 2
    ;;
esac
