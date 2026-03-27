# spotify-claude-plugin

Claude Code plugin to control Spotify playback on your devices via the Spotify Web API.

## Features

- **Playback control** — play, pause, skip, previous, seek, volume, shuffle, repeat
- **Search** — find tracks, albums, artists, and playlists
- **Queue management** — view the queue and add tracks
- **Device control** — list devices and transfer playback between them
- **Library** — like/unlike the currently playing track
- **Recommendations** — get suggested tracks based on what's playing
- **Playlists** — browse your playlists

## Installation

```bash
claude plugin install spotify@fingerskier-plugins
```

Or install directly from the repository:

```bash
claude plugin install https://github.com/fingerskier/spotify-claude-plugin.git
```

Then run the setup:

```bash
./setup.sh
```

## Prerequisites

1. **Spotify Premium** — playback control requires a Premium account
2. **Spotify Developer App** — create one at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
3. **Redirect URI** — add `http://localhost:8901/callback` as a Redirect URI in your app settings
4. **Client ID** — set `SPOTIFY_CLIENT_ID` in your environment

```bash
export SPOTIFY_CLIENT_ID="your_client_id_here"
```

## Usage

After installing the plugin, use the `/spotify` slash command in Claude Code:

```
/spotify auth              # Connect your Spotify account (opens browser)
/spotify status            # What's playing?
/spotify play              # Resume playback
/spotify play bohemian rhapsody   # Search and play a track
/spotify play spotify:album:...   # Play by Spotify URI
/spotify pause             # Pause
/spotify next              # Next track
/spotify previous          # Previous track
/spotify volume 75         # Set volume to 75%
/spotify seek 1:30         # Seek to 1:30
/spotify shuffle on        # Enable shuffle
/spotify repeat track      # Repeat current track
/spotify devices           # List devices
/spotify transfer <id>     # Move playback to another device
/spotify search <query>    # Search Spotify
/spotify queue <track>     # Add a track to the queue
/spotify playlists         # Your playlists
/spotify me                # Your profile
/spotify recommend         # Get recommendations
/spotify like              # Save current track
/spotify unlike            # Remove current track from saved
```

## Authentication

The plugin uses the **OAuth 2.0 PKCE flow** — no client secret needed. When you run `/spotify auth`, it:

1. Starts a local server on port 8901
2. Opens the Spotify authorization page in your browser
3. Exchanges the auth code for tokens
4. Saves tokens locally (auto-refreshes when expired)

Tokens are stored in `.spotify-token.json` (gitignored).

## License

MIT
