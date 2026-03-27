#!/usr/bin/env node

import * as spotify from './spotify-api.js';
import { authorize, loadToken } from './auth.js';

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatTrack(item) {
  if (!item) return 'Nothing playing';
  const artists = item.artists?.map(a => a.name).join(', ') || 'Unknown';
  return `${item.name} — ${artists}`;
}

function formatDevice(d) {
  return `${d.is_active ? '▶' : ' '} ${d.name} (${d.type}) vol:${d.volume_percent}%${d.is_restricted ? ' [restricted]' : ''}`;
}

const commands = {
  async auth() {
    const token = await loadToken();
    if (token) {
      console.log('Already authenticated. Token expires at', new Date(token.expires_at).toISOString());
      console.log('Run `spotify auth --force` to re-authenticate.');
      return;
    }
    await authorize();
    console.log('Spotify authorized successfully!');
  },

  async 'auth --force'() {
    await authorize();
    console.log('Spotify re-authorized successfully!');
  },

  async status() {
    const state = await spotify.getPlaybackState();
    if (!state || state.ok) {
      console.log('No active playback session.');
      return;
    }
    const track = formatTrack(state.item);
    const progress = formatMs(state.progress_ms || 0);
    const duration = formatMs(state.item?.duration_ms || 0);
    const device = state.device ? `${state.device.name} (${state.device.type})` : 'unknown';
    const playing = state.is_playing ? 'Playing' : 'Paused';
    const shuffle = state.shuffle_state ? 'on' : 'off';
    const repeat = state.repeat_state || 'off';

    console.log(`${playing}: ${track}`);
    console.log(`Progress: ${progress} / ${duration}`);
    console.log(`Device: ${device} | Volume: ${state.device?.volume_percent ?? '?'}%`);
    console.log(`Shuffle: ${shuffle} | Repeat: ${repeat}`);
  },

  async play(...args) {
    if (args.length === 0) {
      await spotify.play();
      console.log('Playback resumed.');
      return;
    }
    const uri = args[0];
    if (uri.startsWith('spotify:')) {
      if (uri.startsWith('spotify:track:')) {
        await spotify.play({ uris: [uri] });
      } else {
        await spotify.play({ contextUri: uri });
      }
      console.log(`Playing: ${uri}`);
    } else {
      const q = args.join(' ');
      const results = await spotify.search(q, 'track', 1);
      const track = results.tracks?.items?.[0];
      if (!track) {
        console.log(`No results for "${q}".`);
        return;
      }
      await spotify.play({ uris: [track.uri] });
      console.log(`Playing: ${formatTrack(track)}`);
    }
  },

  async pause() {
    await spotify.pause();
    console.log('Playback paused.');
  },

  async next() {
    await spotify.next();
    console.log('Skipped to next track.');
    // brief delay so Spotify state catches up
    await new Promise(r => setTimeout(r, 500));
    try {
      const state = await spotify.getCurrentlyPlaying();
      if (state?.item) console.log(`Now playing: ${formatTrack(state.item)}`);
    } catch { /* ignore */ }
  },

  async previous() {
    await spotify.previous();
    console.log('Skipped to previous track.');
    await new Promise(r => setTimeout(r, 500));
    try {
      const state = await spotify.getCurrentlyPlaying();
      if (state?.item) console.log(`Now playing: ${formatTrack(state.item)}`);
    } catch { /* ignore */ }
  },

  async volume(level) {
    if (level === undefined) {
      const state = await spotify.getPlaybackState();
      console.log(`Volume: ${state?.device?.volume_percent ?? 'unknown'}%`);
      return;
    }
    const vol = parseInt(level, 10);
    if (isNaN(vol) || vol < 0 || vol > 100) {
      console.log('Volume must be 0-100.');
      return;
    }
    await spotify.setVolume(vol);
    console.log(`Volume set to ${vol}%.`);
  },

  async seek(position) {
    if (!position) {
      console.log('Usage: spotify seek <seconds|m:ss>');
      return;
    }
    let ms;
    if (position.includes(':')) {
      const [m, s] = position.split(':').map(Number);
      ms = (m * 60 + s) * 1000;
    } else {
      ms = parseInt(position, 10) * 1000;
    }
    await spotify.seek(ms);
    console.log(`Seeked to ${formatMs(ms)}.`);
  },

  async shuffle(state) {
    if (!state) {
      const pb = await spotify.getPlaybackState();
      console.log(`Shuffle: ${pb?.shuffle_state ? 'on' : 'off'}`);
      return;
    }
    const on = state === 'on' || state === 'true';
    await spotify.setShuffle(on);
    console.log(`Shuffle ${on ? 'enabled' : 'disabled'}.`);
  },

  async repeat(state) {
    if (!state) {
      const pb = await spotify.getPlaybackState();
      console.log(`Repeat: ${pb?.repeat_state || 'off'}`);
      return;
    }
    if (!['off', 'track', 'context'].includes(state)) {
      console.log('Repeat state must be: off, track, or context.');
      return;
    }
    await spotify.setRepeat(state);
    console.log(`Repeat set to ${state}.`);
  },

  async devices() {
    const { devices } = await spotify.getDevices();
    if (!devices?.length) {
      console.log('No devices found. Open Spotify on a device first.');
      return;
    }
    console.log('Available devices:');
    devices.forEach(d => console.log(`  ${formatDevice(d)}  id:${d.id}`));
  },

  async transfer(deviceId) {
    if (!deviceId) {
      console.log('Usage: spotify transfer <device_id>');
      console.log('Run `spotify devices` to see available devices.');
      return;
    }
    await spotify.transferPlayback(deviceId);
    console.log('Playback transferred.');
  },

  async search(...args) {
    if (args.length === 0) {
      console.log('Usage: spotify search <query> [--type track|album|artist|playlist] [--limit N]');
      return;
    }
    let type = 'track,album,artist,playlist';
    let limit = 5;
    const queryParts = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--type' && args[i + 1]) { type = args[++i]; }
      else if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[++i], 10); }
      else queryParts.push(args[i]);
    }

    const results = await spotify.search(queryParts.join(' '), type, limit);

    if (results.tracks?.items?.length) {
      console.log('\nTracks:');
      results.tracks.items.forEach((t, i) =>
        console.log(`  ${i + 1}. ${formatTrack(t)} [${t.album?.name}] uri:${t.uri}`)
      );
    }
    if (results.albums?.items?.length) {
      console.log('\nAlbums:');
      results.albums.items.forEach((a, i) =>
        console.log(`  ${i + 1}. ${a.name} — ${a.artists?.map(x => x.name).join(', ')} (${a.release_date}) uri:${a.uri}`)
      );
    }
    if (results.artists?.items?.length) {
      console.log('\nArtists:');
      results.artists.items.forEach((a, i) =>
        console.log(`  ${i + 1}. ${a.name} (${a.followers?.total?.toLocaleString()} followers) uri:${a.uri}`)
      );
    }
    if (results.playlists?.items?.length) {
      console.log('\nPlaylists:');
      results.playlists.items.forEach((p, i) =>
        console.log(`  ${i + 1}. ${p.name} by ${p.owner?.display_name} (${p.tracks?.total} tracks) uri:${p.uri}`)
      );
    }
  },

  async queue(...args) {
    if (args.length === 0) {
      const q = await spotify.getQueue();
      if (!q?.currently_playing) {
        console.log('No active queue.');
        return;
      }
      console.log(`Now playing: ${formatTrack(q.currently_playing)}`);
      if (q.queue?.length) {
        console.log('\nUp next:');
        q.queue.slice(0, 10).forEach((t, i) => console.log(`  ${i + 1}. ${formatTrack(t)}`));
        if (q.queue.length > 10) console.log(`  ... and ${q.queue.length - 10} more`);
      }
      return;
    }
    const uri = args[0];
    if (uri.startsWith('spotify:')) {
      await spotify.addToQueue(uri);
      console.log(`Added to queue: ${uri}`);
    } else {
      const q = args.join(' ');
      const results = await spotify.search(q, 'track', 1);
      const track = results.tracks?.items?.[0];
      if (!track) {
        console.log(`No results for "${q}".`);
        return;
      }
      await spotify.addToQueue(track.uri);
      console.log(`Added to queue: ${formatTrack(track)}`);
    }
  },

  async playlists() {
    const data = await spotify.getMyPlaylists(20);
    if (!data.items?.length) {
      console.log('No playlists found.');
      return;
    }
    console.log('Your playlists:');
    data.items.forEach((p, i) =>
      console.log(`  ${i + 1}. ${p.name} (${p.tracks?.total} tracks) uri:${p.uri}`)
    );
  },

  async me() {
    const user = await spotify.getMe();
    console.log(`User: ${user.display_name}`);
    console.log(`Email: ${user.email || 'N/A'}`);
    console.log(`Account: ${user.product || 'free'}`);
    console.log(`Country: ${user.country || 'N/A'}`);
    console.log(`URI: ${user.uri}`);
  },

  async recommend(...args) {
    const opts = {};
    const seedParts = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--artist' && args[i + 1]) opts.seedArtists = args[++i];
      else if (args[i] === '--genre' && args[i + 1]) opts.seedGenres = args[++i];
      else if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10);
      else seedParts.push(args[i]);
    }
    if (seedParts.length === 0 && !opts.seedArtists && !opts.seedGenres) {
      // Use currently playing track as seed
      const cur = await spotify.getCurrentlyPlaying();
      if (cur?.item?.id) {
        opts.seedTracks = cur.item.id;
        console.log(`Getting recommendations based on: ${formatTrack(cur.item)}`);
      } else {
        console.log('Usage: spotify recommend [track_id] [--artist id] [--genre name] [--limit N]');
        return;
      }
    } else if (seedParts.length) {
      opts.seedTracks = seedParts.join(',');
    }
    const recs = await spotify.getRecommendations(opts);
    if (!recs.tracks?.length) {
      console.log('No recommendations found.');
      return;
    }
    console.log('\nRecommended tracks:');
    recs.tracks.forEach((t, i) =>
      console.log(`  ${i + 1}. ${formatTrack(t)} uri:${t.uri}`)
    );
  },

  async like() {
    const cur = await spotify.getCurrentlyPlaying();
    if (!cur?.item?.id) {
      console.log('Nothing currently playing to like.');
      return;
    }
    await spotify.saveTracks([cur.item.id]);
    console.log(`Liked: ${formatTrack(cur.item)}`);
  },

  async unlike() {
    const cur = await spotify.getCurrentlyPlaying();
    if (!cur?.item?.id) {
      console.log('Nothing currently playing.');
      return;
    }
    await spotify.removeSavedTracks([cur.item.id]);
    console.log(`Removed from liked: ${formatTrack(cur.item)}`);
  },
};

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(`Spotify CLI — Control Spotify from Claude

Commands:
  auth            Authenticate with Spotify (opens browser)
  status          Show current playback status
  play [query|uri]  Resume or play a track/album/playlist
  pause           Pause playback
  next            Skip to next track
  previous        Go to previous track
  volume [0-100]  Get or set volume
  seek <pos>      Seek to position (seconds or m:ss)
  shuffle [on|off]  Get or toggle shuffle
  repeat [off|track|context]  Get or set repeat mode
  devices         List available devices
  transfer <id>   Transfer playback to a device
  search <query>  Search tracks, albums, artists, playlists
  queue [query|uri]  Show queue or add a track
  playlists       List your playlists
  me              Show your profile
  recommend       Get recommendations based on current track
  like            Like the current track
  unlike          Remove current track from liked
  help            Show this help`);
    return;
  }

  const handler = commands[cmd];
  if (!handler) {
    console.log(`Unknown command: ${cmd}. Run 'spotify help' for usage.`);
    process.exit(1);
  }

  try {
    await handler(...args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
