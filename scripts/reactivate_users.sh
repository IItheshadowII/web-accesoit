#!/usr/bin/env bash
set -euo pipefail

# Script to inspect and optionally reactivate users in the SQLite DB.
# Usage:
#   ./scripts/reactivate_users.sh           # shows users
#   ./scripts/reactivate_users.sh --admins  # re-enable admin users (disabled -> 0)
#   ./scripts/reactivate_users.sh --all     # re-enable ALL users (use with caution)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$ROOT_DIR/server/dev.db"

if [ ! -f "$DB_PATH" ]; then
  echo "DB not found at $DB_PATH"
  echo "Check server/.env DATABASE_URL or adjust DB_PATH in script."
  exit 1
fi

echo "Backing up DB..."
cp "$DB_PATH" "${DB_PATH}.bak.$(date +%s)"
echo "Backup created: ${DB_PATH}.bak.*"

SQLITE_CMD="sqlite3"
if ! command -v $SQLITE_CMD >/dev/null 2>&1; then
  # Fallback to docker image if sqlite3 not installed
  if command -v docker >/dev/null 2>&1; then
    echo "sqlite3 not found locally — will use docker sqlite image to run queries"
    DOCKER_SQLITE="docker run --rm -v \"$ROOT_DIR/server:/data\" nouchka/sqlite3 sqlite3 /data/dev.db"
  else
    echo "Neither sqlite3 nor docker available. Install sqlite3 or docker to run this script."
    exit 1
  fi
fi

run_query(){
  local q="$1"
  if [ -n "${DOCKER_SQLITE:-}" ]; then
    echo "---> $q"
    echo "$q" | eval $DOCKER_SQLITE
  else
    echo "---> $q"
    echo "$q" | sqlite3 "$DB_PATH"
  fi
}

echo "Current users (id | email | role | disabled):"
run_query "SELECT id || ' | ' || email || ' | ' || role || ' | ' || coalesce(disabled,0) FROM User ORDER BY id;"

if [ "${1:-}" = "--admins" ]; then
  echo "Re-enabling admin users (disabled -> 0)"
  run_query "UPDATE User SET disabled = 0 WHERE role = 'admin' AND coalesce(disabled,0) != 0;"
  echo "Done. Current admin users:"
  run_query "SELECT id || ' | ' || email || ' | ' || role || ' | ' || coalesce(disabled,0) FROM User WHERE role='admin' ORDER BY id;"
  exit 0
fi

if [ "${1:-}" = "--all" ]; then
  echo "Re-enabling ALL users (disabled -> 0). This is irreversible on this DB state unless you restore the backup file above." 
  read -p "Are you sure? Type YES to continue: " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted by user"
    exit 1
  fi
  run_query "UPDATE User SET disabled = 0 WHERE coalesce(disabled,0) != 0;"
  echo "Done. Current users:"
  run_query "SELECT id || ' | ' || email || ' | ' || role || ' | ' || coalesce(disabled,0) FROM User ORDER BY id;"
  exit 0
fi

echo "No changes made. Re-run with --admins or --all to reactivate users."
