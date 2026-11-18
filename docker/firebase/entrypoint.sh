#!/bin/sh
# Starts the Firebase Auth Emulator. Accounts are saved to /data on shutdown and
# re-imported on the next start, so users survive `docker compose down` / `up`.
set -e

PROJECT_ID="${FIREBASE_PROJECT_ID:-demo-shared-todo}"
# Export into a subfolder: the emulator replaces the export dir, and a volume mount point cannot be removed.
DATA_DIR=/data/export
mkdir -p /data

IMPORT_FLAG=""
if [ -f "$DATA_DIR/firebase-export-metadata.json" ]; then
  IMPORT_FLAG="--import=$DATA_DIR"
fi

exec firebase emulators:start \
  --only auth \
  --project "$PROJECT_ID" \
  $IMPORT_FLAG \
  --export-on-exit="$DATA_DIR"
