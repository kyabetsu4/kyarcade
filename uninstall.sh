#!/usr/bin/env bash
# Uninstall kyarcade — removes the AppImage, autostart entry, and optionally profile data.
#
# Usage:
#     ./uninstall.sh           # keeps profile data
#     ./uninstall.sh --purge   # also deletes ~/es-profiles/
#
set -euo pipefail

PURGE=false
for arg in "$@"; do
  [[ "$arg" == "--purge" ]] && PURGE=true
done

echo "Stopping kyarcade if running..."
pkill -f kyarcade || true

echo "Removing AppImage..."
rm -f "$HOME/.local/bin/kyarcade.AppImage"

echo "Removing autostart entry..."
rm -f "$HOME/.config/autostart/kyarcade.desktop"

if $PURGE; then
  echo "Purging profile data (~/.es-profiles)..."
  rm -rf "$HOME/es-profiles"
else
  echo "Profile data kept at ~/es-profiles/ — run with --purge to remove it too."
fi

echo ""
echo "Done. kyarcade has been uninstalled."
