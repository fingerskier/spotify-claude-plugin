# Spotify Plugin

Control Spotify playback on the user's devices via the Spotify Web API.

## Setup

The plugin requires:
1. A Spotify Developer App — create one at https://developer.spotify.com/dashboard
2. Set the redirect URI to `http://localhost:8901/callback` in the app settings
3. Set `SPOTIFY_CLIENT_ID` in your environment (e.g., in `.env`)
4. Run `/spotify auth` to authenticate (opens browser for OAuth)

**Note:** Playback control requires a Spotify Premium account.

## Available Commands

Use the `/spotify` slash command followed by a subcommand:

| Command | Description |
|---------|-------------|
| `/spotify auth` | Authenticate with Spotify (opens browser) |
| `/spotify status` | Show what's currently playing, device, volume, shuffle/repeat |
| `/spotify play [query\|uri]` | Resume playback, or play a specific track/album/playlist by name or Spotify URI |
| `/spotify pause` | Pause playback |
| `/spotify next` | Skip to next track |
| `/spotify previous` | Go to previous track |
| `/spotify volume [0-100]` | Get or set volume |
| `/spotify seek <seconds\|m:ss>` | Seek to a position in the current track |
| `/spotify shuffle [on\|off]` | Get or toggle shuffle mode |
| `/spotify repeat [off\|track\|context]` | Get or set repeat mode |
| `/spotify devices` | List available Spotify Connect devices |
| `/spotify transfer <device_id>` | Move playback to another device |
| `/spotify search <query>` | Search for tracks, albums, artists, playlists |
| `/spotify queue [query\|uri]` | View the queue or add a track to it |
| `/spotify playlists` | List the user's playlists |
| `/spotify me` | Show the user's Spotify profile |
| `/spotify recommend` | Get track recommendations based on what's playing |
| `/spotify like` | Save the current track to the user's library |
| `/spotify unlike` | Remove the current track from the user's library |

## Tips

- You can pass Spotify URIs directly: `/spotify play spotify:album:4aawyAB9vmqN3uQ7FjRGTy`
- Search by name works too: `/spotify play bohemian rhapsody`
- Use `/spotify queue <song name>` to add songs to the queue without interrupting playback
- Use `/spotify devices` + `/spotify transfer <id>` to move playback between devices
- `/spotify recommend` uses the currently playing track as a seed for recommendations

## Environment Variables

- `SPOTIFY_CLIENT_ID` (required) — Your Spotify app's client ID
