#!/usr/bin/env bash
# Install kyarcade AppImage and set it to autostart on login.
#
# Usage (run from the directory containing this script and the AppImage):
#
#     ./install.sh
#
set -euo pipefail
cd "$(dirname "$0")"

APPIMAGE=$(ls kyarcade-*.AppImage 2>/dev/null | head -1)
if [ -z "$APPIMAGE" ]; then
  echo "Error: no kyarcade-*.AppImage found in $(pwd)"
  echo "Build one first with: npm run electron:build"
  exit 1
fi

INSTALL_DIR="$HOME/.local/bin"
DEST="$INSTALL_DIR/kyarcade.AppImage"
AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP="$AUTOSTART_DIR/kyarcade.desktop"

mkdir -p "$INSTALL_DIR" "$AUTOSTART_DIR"

cp "$APPIMAGE" "$DEST"
chmod +x "$DEST"
echo "Installed: $DEST"

cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=kyarcade
Exec=$DEST
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
echo "Autostart: $DESKTOP"

echo ""
echo "Done. kyarcade will launch automatically on next login."
echo "To start it now: $DEST"
