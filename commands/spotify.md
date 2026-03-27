---
description: Control Spotify playback — play, pause, skip, search, queue, volume, and more.
allowed-tools: Bash
user-invocable: true
---

Run the Spotify CLI command using the arguments provided by the user.

The Spotify CLI is located at `$PLUGIN_DIR/lib/cli.js` where `$PLUGIN_DIR` is the directory containing this plugin.

To execute a command, run:
```bash
node "$PLUGIN_DIR/lib/cli.js" <subcommand> [args...]
```

Replace `$PLUGIN_DIR` with the actual plugin directory path which is: `{{pluginDir}}`

## Subcommands

- `auth` — Authenticate with Spotify (opens browser for OAuth)
- `status` — Show current playback (track, progress, device, volume, shuffle, repeat)
- `play [query|spotify_uri]` — Resume playback or play something specific
- `pause` — Pause playback
- `next` — Skip to next track
- `previous` — Go to previous track
- `volume [0-100]` — Get or set volume
- `seek <seconds|m:ss>` — Seek to position
- `shuffle [on|off]` — Get or toggle shuffle
- `repeat [off|track|context]` — Get or set repeat
- `devices` — List available Spotify Connect devices
- `transfer <device_id>` — Transfer playback to device
- `search <query> [--type track|album|artist|playlist] [--limit N]` — Search Spotify
- `queue [query|spotify_uri]` — View queue or add a track
- `playlists` — List user's playlists
- `me` — Show user profile
- `recommend [--artist id] [--genre name] [--limit N]` — Get recommendations
- `like` — Save current track to library
- `unlike` — Remove current track from library

## User's request

$ARGUMENTS
