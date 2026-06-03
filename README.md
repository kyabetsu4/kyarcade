# kyarcade

A full-screen, gamepad-driven profile switcher for arcade cabinets. Each player gets their own profile with a custom avatar and isolated EmulationStation (ES-DE) configuration. Select your profile and ES-DE launches automatically.

![kyarcade profile select screen](docs/screenshot.webp)

---

## The problem

Imagine an arcade cabinet shared by multiple people.

One player wants custom controller mappings.
Another has their own collections and favorites.
A third wants different emulator settings.

ES-DE normally stores all of this in a single configuration directory.

Kyarcade gives each player their own isolated ES-DE profile and lets them select it with a gamepad before launching EmulationStation.

---

## How it works

```
Player selects profile
        ↓
Kyarcade updates ~/ES-DE symlink
        ↓
Symlink points to selected profile's ES-DE folder
        ↓
ES-DE launches
        ↓
All settings, collections, mappings and save-state metadata come from that profile
```

---

## What it does

- Shows a carousel of player profiles on boot
- Each profile has its own ES-DE config (settings, controller maps, collections, save states)
- Selecting a profile swaps in that player's ES-DE config and automatically launches ES-DE
- Fully controllable with a gamepad — no keyboard or mouse required

---

## Requirements

### On your arcade machine

- Linux (tested on Bazzite)
- Node.js + npm
- `ES-DE.AppImage` at `$HOME/Applications/ES-DE.AppImage`
- ROMs at `$HOME/Emulation/roms`
- `HOME` environment variable set to your arcade user's home directory

### Directory structure the app expects

```
$HOME/
  Applications/
    ES-DE.AppImage         # The emulator — must be executable
  Emulation/
    roms/                  # Your ROM library
  es-profiles/             # Created by the app when you add profiles
    {profile-id}/
      profile.json         # Name, avatar, metadata
      avatar.png           # Optional custom avatar image
      ES-DE/               # This player's permanent ES-DE config directory
  ES-DE -> es-profiles/{active-id}/ES-DE   # Symlink — swapped on each profile launch
```

> On launch, `~/ES-DE` is replaced with a symlink pointing at the selected profile's `ES-DE/` folder. Profile data is never copied or deleted — only the symlink target changes. On first use, populate each profile's `ES-DE/` by running ES-DE once per profile, or copy an existing config in manually.

---

## Setup

Everything runs **directly on the arcade machine** — no separate build PC and no SSH required.

### 1. Clone

On the arcade machine (e.g. your Bazzite cabinet):

```bash
git clone https://github.com/kyabetsu4/kyarcade.git
cd kyarcade
```

### 2. Build and launch

```bash
./run.sh
```

`run.sh` installs dependencies (first run only), builds the app, and launches it
full-screen. That's the whole deploy: clone, run, done.

> Prefer to drive it yourself? `npm install` once, then `npm start` builds and
> launches; `npm run build` builds without launching.

### 3. Launch on boot (optional)

To have the cabinet start kyarcade automatically, point your desktop/session
autostart (or a systemd user service) at `run.sh`. To update later, `git pull`
and run it again.

---

## Building a portable AppImage

Prefer a single downloadable file over cloning the repo? Build a self-contained
AppImage that bundles Electron and the app — no Node.js or `npm install` needed on
the target machine.

On a Linux machine (e.g. your Bazzite cabinet):

```bash
npm install          # once
npm run electron:build
```

The AppImage is written to `release/kyarcade-<version>.AppImage`. Copy it to any
Linux machine, mark it executable, and run it:

```bash
chmod +x kyarcade-*.AppImage
./kyarcade-*.AppImage
```

> AppImages must be built on Linux — electron-builder packages a Linux runtime.
> The arcade machine still needs `ES-DE.AppImage`, your ROMs, and the directory
> layout described under [Requirements](#requirements); only the kyarcade app
> itself becomes a standalone binary.

---

## Running locally (development)

```bash
npm run dev   # Start Vite dev server at http://localhost:5173
```

> In dev mode the app won't talk to ES-DE or the file system — IPC calls are no-ops without Electron.

---

## Scripts

| Command | What it does |
|---|---|
| `./run.sh` | Install (first run), build, and launch on this machine |
| `npm start` | Build and launch Electron |
| `npm run electron:build` | Build a portable AppImage into `release/` |
| `npm run dev` | Vite dev server |
| `npm run build` | Production web build to `dist/` (GitHub Pages demo) |
| `npm run build:electron` | Production build for the desktop app (relative asset paths) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Controller layout

| Button | Action |
|---|---|
| A | Confirm / Select |
| B | Back / Cancel |
| X | Open Settings |
| Y | Manage Profile |
| D-pad / Left stick | Navigate |

All menus (profile selection, avatar picker, rename, settings) are fully navigable with a standard gamepad.

Button glyphs automatically match the connected controller — Xbox labels (A/B/X/Y) are shown for Xbox controllers, and PlayStation symbols (✕/○/□/△) are shown for DualShock/DualSense controllers.

---

## Boot screen

When the app starts it shows a loading screen while profiles are fetched. The message displayed on that screen is customizable from the Settings overlay — you can set it to anything (e.g. your cabinet's name, a welcome message, or leave it at the default).

The Settings overlay also includes a toggle to hide all kyarcade branding from the boot screen entirely, so the screen shows only your custom message.

---

## Themes

Six built-in themes selectable from the Settings overlay:

- Default (light)
- Dark
- Arcade
- Synthwave
- Sunset
- Ocean

---

## Avatars

16 built-in avatars sourced from [OpenMoji](https://github.com/hfg-gmuend/openmoji) (open-source emoji) and bundled with the app, so they render offline with no network. You can also upload a custom image (JPG, PNG, or WebP) per profile.

---

## Tech stack

- [React 19](https://react.dev/) + TypeScript
- [Vite 7](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router)
- [Electron 42](https://www.electronjs.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [OpenMoji](https://openmoji.org/) for default avatars

---

## License

MIT
