#!/usr/bin/env bash
set -e

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Setting up Spotify Claude Plugin..."

# Install dependencies
cd "$PLUGIN_DIR"
npm install --production 2>&1

echo ""
echo "Spotify plugin installed!"
echo ""
echo "To get started:"
echo "  1. Create a Spotify app at https://developer.spotify.com/dashboard"
echo "  2. Add http://localhost:8901/callback as a Redirect URI"
echo "  3. Set SPOTIFY_CLIENT_ID in your environment"
echo "  4. Run /spotify auth to connect your account"
