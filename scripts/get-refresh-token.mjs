/**
 * get-refresh-token.mjs
 * Run this ONCE to get your Blogger OAuth2 Refresh Token.
 *
 * Usage:
 *   1. Fill in CLIENT_ID and CLIENT_SECRET below (from Google Cloud Console)
 *   2. Run:  node scripts/get-refresh-token.mjs
 *   3. Open the URL it prints in your browser
 *   4. Authorize access → copy the code from the redirect URL
 *   5. Paste the code when prompted → you'll get your REFRESH_TOKEN
 *   6. Add REFRESH_TOKEN to .env.local
 */

import readline from "readline";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env.local
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const CLIENT_ID     = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Add BLOGGER_CLIENT_ID and BLOGGER_CLIENT_SECRET to .env.local first");
  process.exit(1);
}

const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const SCOPE        = "https://www.googleapis.com/auth/blogger";

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPE)}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log("\n📋  Step 1: Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n📋  Step 2: Sign in with your Google account and click Allow");
console.log("📋  Step 3: Copy the authorization code shown on screen\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code:          code.trim(),
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });
    const data = await res.json();
    if (data.refresh_token) {
      console.log("\n✅  Success! Add this to your .env.local:\n");
      console.log(`BLOGGER_REFRESH_TOKEN=${data.refresh_token}\n`);
    } else {
      console.error("❌  No refresh token received:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌  Error:", err.message);
  }
});
