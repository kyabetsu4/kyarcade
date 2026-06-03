#!/usr/bin/env bash
# Build and launch kyarcade directly on this machine (e.g. your Bazzite arcade cabinet).
#
# No Windows PC and no SSH required — clone the repo onto the arcade machine and run:
#
#     ./run.sh
#
# It installs dependencies (first run only), builds the app, and launches it in
# full-screen kiosk mode.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Building..."
npm run build:electron

echo "Launching kyarcade..."
exec npx electron .
