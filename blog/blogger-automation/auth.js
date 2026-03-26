/**
 * auth.js
 * Google OAuth2 helper for Blogger API authentication
 * Handles first-time browser login and token caching
 */

const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const open    = require('open');
const { google } = require('googleapis');

const SCOPES       = ['https://www.googleapis.com/auth/blogger'];
const TOKEN_PATH   = path.resolve(__dirname, 'token.json');
const CREDS_PATH   = path.resolve(__dirname, 'credentials.json');
const REDIRECT_PORT = 3000;
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// ─── Load credentials ─────────────────────────────────────────────────────────

function loadCredentials() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(
      `credentials.json not found at ${CREDS_PATH}\n` +
      `  → Download it from Google Cloud Console:\n` +
      `    https://console.cloud.google.com/apis/credentials`
    );
  }
  const raw = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
  const creds = raw.installed || raw.web;
  if (!creds) throw new Error('Invalid credentials.json format — expected "installed" or "web" key');
  return creds;
}

// ─── Token management ────────────────────────────────────────────────────────

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log(`   💾 Token saved to ${TOKEN_PATH}`);
}

// ─── OAuth2 flow ─────────────────────────────────────────────────────────────

/**
 * Open the browser for the user to grant access, wait for the callback,
 * exchange the auth code for tokens, and return the OAuth2 client.
 */
function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope      : SCOPES,
      prompt     : 'consent', // force refresh_token on every first auth
    });

    // Spin up a temporary local server to catch the OAuth redirect
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/oauth2callback')) return;

      const urlParams = new URL(req.url, `http://localhost:${REDIRECT_PORT}`).searchParams;
      const code = urlParams.get('code');
      const err  = urlParams.get('error');

      if (err) {
        res.end('<h1>❌ Access denied</h1><p>You can close this tab.</p>');
        server.close();
        return reject(new Error(`OAuth error: ${err}`));
      }

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        saveToken(tokens);

        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:3rem">
            <h1 style="color:#16a34a">✅ Authentication Successful!</h1>
            <p>You can close this tab and return to your terminal.</p>
          </body></html>
        `);
        server.close();
        resolve(oAuth2Client);
      } catch (e) {
        res.end('<h1>❌ Token exchange failed</h1><p>Check your terminal.</p>');
        server.close();
        reject(e);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`\n🌐 Opening browser for Google sign-in...`);
      console.log(`   If it doesn't open automatically, visit:\n   ${authUrl}\n`);
      open(authUrl);
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `Port ${REDIRECT_PORT} is in use. Close whatever is using it and re-run.`
        ));
      } else {
        reject(err);
      }
    });
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns an authenticated OAuth2 client.
 * - First run : opens a browser, prompts for Google login, saves token.json
 * - Later runs: loads the saved token (refreshes automatically if expired)
 */
async function authenticate() {
  const creds       = loadCredentials();
  const oAuth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    REDIRECT_URI
  );

  const savedToken = loadToken();
  if (savedToken) {
    oAuth2Client.setCredentials(savedToken);

    // Auto-refresh if token is expired
    oAuth2Client.on('tokens', newTokens => {
      const merged = { ...savedToken, ...newTokens };
      saveToken(merged);
    });

    return oAuth2Client;
  }

  // First time — need browser login
  return getNewToken(oAuth2Client);
}

module.exports = { authenticate };
