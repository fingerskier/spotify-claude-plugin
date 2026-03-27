import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = join(__dirname, '..', '.spotify-token.json');

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
].join(' ');

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'SPOTIFY_CLIENT_ID not set. Create an app at https://developer.spotify.com/dashboard ' +
      'and set SPOTIFY_CLIENT_ID in your environment or .env file.'
    );
  }
  return { clientId };
}

function generateCodeVerifier() {
  return randomBytes(64).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export async function loadToken() {
  try {
    await access(TOKEN_PATH);
    const data = JSON.parse(await readFile(TOKEN_PATH, 'utf-8'));
    if (data.expires_at && Date.now() < data.expires_at - 60000) {
      return data;
    }
    if (data.refresh_token) {
      return await refreshToken(data.refresh_token);
    }
  } catch {
    return null;
  }
  return null;
}

async function saveToken(token) {
  const data = {
    ...token,
    expires_at: Date.now() + (token.expires_in || 3600) * 1000,
  };
  await writeFile(TOKEN_PATH, JSON.stringify(data, null, 2));
  return data;
}

async function refreshToken(refresh_token) {
  const { clientId } = getCredentials();
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  const token = await res.json();
  token.refresh_token = token.refresh_token || refresh_token;
  return await saveToken(token);
}

export async function authorize() {
  const { clientId } = getCredentials();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString('hex');
  const redirectPort = 8901;
  const redirectUri = `http://localhost:${redirectPort}/callback`;

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${redirectPort}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>State mismatch</h1>');
        server.close();
        reject(new Error('State mismatch in OAuth callback'));
        return;
      }

      try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenRes.ok) {
          throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
        }

        const token = await tokenRes.json();
        const saved = await saveToken(token);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<h1>Spotify connected!</h1>' +
          '<p>You can close this window and return to Claude.</p>' +
          '<script>window.close()</script>'
        );
        server.close();
        resolve(saved);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(redirectPort, () => {
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('code_challenge', codeChallenge);

      console.log(`\nOpen this URL to authorize Spotify:\n${authUrl.toString()}\n`);

      import('open').then((mod) => mod.default(authUrl.toString())).catch(() => {
        // open failed — user must click URL manually
      });
    });

    server.on('error', reject);

    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 120 seconds'));
    }, 120000);
  });
}

export async function getAccessToken() {
  let token = await loadToken();
  if (token) return token.access_token;
  token = await authorize();
  return token.access_token;
}
