import { getAccessToken } from './auth.js';

const BASE = 'https://api.spotify.com/v1';

async function api(method, path, body = undefined, query = {}) {
  const token = await getAccessToken();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);

  if (res.status === 204 || res.status === 202) return { ok: true, status: res.status };
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Spotify API ${method} ${path} failed (${res.status}): ${err}`);
  }
  return res.json();
}

// ── Player ──────────────────────────────────────────────

export async function getPlaybackState() {
  return api('GET', '/me/player');
}

export async function getDevices() {
  return api('GET', '/me/player/devices');
}

export async function getCurrentlyPlaying() {
  return api('GET', '/me/player/currently-playing');
}

export async function getQueue() {
  return api('GET', '/me/player/queue');
}

export async function play({ deviceId, contextUri, uris, offset, positionMs } = {}) {
  const body = {};
  if (contextUri) body.context_uri = contextUri;
  if (uris) body.uris = Array.isArray(uris) ? uris : [uris];
  if (offset !== undefined) body.offset = typeof offset === 'number' ? { position: offset } : { uri: offset };
  if (positionMs !== undefined) body.position_ms = positionMs;
  return api('PUT', '/me/player/play', Object.keys(body).length ? body : undefined, { device_id: deviceId });
}

export async function pause(deviceId) {
  return api('PUT', '/me/player/pause', undefined, { device_id: deviceId });
}

export async function next(deviceId) {
  return api('POST', '/me/player/next', undefined, { device_id: deviceId });
}

export async function previous(deviceId) {
  return api('POST', '/me/player/previous', undefined, { device_id: deviceId });
}

export async function seek(positionMs, deviceId) {
  return api('PUT', '/me/player/seek', undefined, { position_ms: positionMs, device_id: deviceId });
}

export async function setVolume(volumePercent, deviceId) {
  return api('PUT', '/me/player/volume', undefined, { volume_percent: volumePercent, device_id: deviceId });
}

export async function setShuffle(state, deviceId) {
  return api('PUT', '/me/player/shuffle', undefined, { state, device_id: deviceId });
}

export async function setRepeat(state, deviceId) {
  return api('PUT', '/me/player/repeat', undefined, { state, device_id: deviceId });
}

export async function transferPlayback(deviceId, play = true) {
  return api('PUT', '/me/player', { device_ids: [deviceId], play });
}

export async function addToQueue(uri, deviceId) {
  return api('POST', '/me/player/queue', undefined, { uri, device_id: deviceId });
}

// ── Search ──────────────────────────────────────────────

export async function search(query, types = 'track', limit = 10) {
  return api('GET', '/search', undefined, { q: query, type: types, limit });
}

// ── Playlists ───────────────────────────────────────────

export async function getMyPlaylists(limit = 20, offset = 0) {
  return api('GET', '/me/playlists', undefined, { limit, offset });
}

export async function getPlaylist(playlistId) {
  return api('GET', `/playlists/${playlistId}`);
}

export async function getPlaylistTracks(playlistId, limit = 50, offset = 0) {
  return api('GET', `/playlists/${playlistId}/tracks`, undefined, { limit, offset });
}

// ── Library ─────────────────────────────────────────────

export async function getSavedTracks(limit = 20, offset = 0) {
  return api('GET', '/me/tracks', undefined, { limit, offset });
}

export async function saveTracks(ids) {
  return api('PUT', '/me/tracks', { ids: Array.isArray(ids) ? ids : [ids] });
}

export async function removeSavedTracks(ids) {
  return api('DELETE', '/me/tracks', { ids: Array.isArray(ids) ? ids : [ids] });
}

// ── User ────────────────────────────────────────────────

export async function getMe() {
  return api('GET', '/me');
}

// ── Albums / Artists ────────────────────────────────────

export async function getAlbum(albumId) {
  return api('GET', `/albums/${albumId}`);
}

export async function getArtist(artistId) {
  return api('GET', `/artists/${artistId}`);
}

export async function getArtistTopTracks(artistId, market = 'US') {
  return api('GET', `/artists/${artistId}/top-tracks`, undefined, { market });
}

export async function getRecommendations({ seedTracks, seedArtists, seedGenres, limit = 20 } = {}) {
  const query = { limit };
  if (seedTracks) query.seed_tracks = Array.isArray(seedTracks) ? seedTracks.join(',') : seedTracks;
  if (seedArtists) query.seed_artists = Array.isArray(seedArtists) ? seedArtists.join(',') : seedArtists;
  if (seedGenres) query.seed_genres = Array.isArray(seedGenres) ? seedGenres.join(',') : seedGenres;
  return api('GET', '/recommendations', undefined, query);
}
