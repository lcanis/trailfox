#!/usr/bin/env bash
set -euo pipefail

# deploy_client.sh: atomically deploy a built `dist/` web export to the server
# Usage: ./deploy_client.sh /path/to/dist main|poc

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /path/to/dist (main|poc)" >&2
  exit 2
fi

DIST_DIR="$1"
SITE="$2"

if [ ! -d "$DIST_DIR" ]; then
  echo "Dist directory not found: $DIST_DIR" >&2
  exit 3
fi

if [ "$SITE" != "main" ] && [ "$SITE" != "poc" ]; then
  echo "Site must be 'main' or 'poc'" >&2
  exit 4
fi

TARGET_PARENT="/var/www/trailfox.app/$SITE"
TARGET_DIR="$TARGET_PARENT/html"
TMP_DIR="${TARGET_PARENT}/html.new.$$"
BACKUP_DIR="${TARGET_PARENT}/html.bak.$$"

mkdir -p "$TMP_DIR"

# Copy files into temporary dir
rsync -a --delete "$DIST_DIR/" "$TMP_DIR/"

# Perform atomic swap on the same filesystem
if [ -d "$TARGET_DIR" ]; then
  mv "$TARGET_DIR" "$BACKUP_DIR"
fi
mv "$TMP_DIR" "$TARGET_DIR"

# Optional: remove backup if all good
rm -rf "$BACKUP_DIR"

echo "Deployed $DIST_DIR -> $TARGET_DIR"

exit 0
