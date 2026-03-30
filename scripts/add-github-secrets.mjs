import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const nacl  = require(path.join(__dirname, '../node_modules/tweetnacl/nacl-fast.js'));
const blake = require(path.join(__dirname, '../node_modules/blakejs/index.js'));

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('='); if (i === -1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'mranuraaggupta1425-del';
const REPO  = 'AnuraagBlog';

if (!TOKEN) { console.error('❌  Set GITHUB_TOKEN in .env.local'); process.exit(1); }

function sealedBox(recipientPublicKey, message) {
  const ephemeralKeyPair = nacl.box.keyPair();
  const nonce = blake.blake2b(
    new Uint8Array([...ephemeralKeyPair.publicKey, ...recipientPublicKey]),
    null, 24
  );
  const encrypted = nacl.box(message, nonce, recipientPublicKey, ephemeralKeyPair.secretKey);
  const result = new Uint8Array(ephemeralKeyPair.publicKey.length + encrypted.length);
  result.set(ephemeralKeyPair.publicKey);
  result.set(encrypted, ephemeralKeyPair.publicKey.length);
  return result;
}

async function getPublicKey() {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/public-key`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  return res.json();
}

async function setSecret(name, value, keyId, keyBase64) {
  const pubKey   = Buffer.from(keyBase64, 'base64');
  const msg      = Buffer.from(value, 'utf-8');
  const sealed   = sealedBox(new Uint8Array(pubKey), new Uint8Array(msg));
  const encrypted = Buffer.from(sealed).toString('base64');

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ encrypted_value: encrypted, key_id: keyId })
  });
  return res.status;
}

const { key_id, key } = await getPublicKey();
console.log('🔑  Public key fetched\n');

const secrets = {
  ANTHROPIC_API_KEY:     process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY:        process.env.GEMINI_API_KEY,
  BLOGGER_BLOG_ID:       process.env.BLOGGER_BLOG_ID,
  BLOGGER_CLIENT_ID:     process.env.BLOGGER_CLIENT_ID,
  BLOGGER_CLIENT_SECRET: process.env.BLOGGER_CLIENT_SECRET,
  BLOGGER_REFRESH_TOKEN: process.env.BLOGGER_REFRESH_TOKEN,
};

for (const [name, value] of Object.entries(secrets)) {
  const status = await setSecret(name, value, key_id, key);
  console.log(`${status === 204 || status === 201 ? '✅' : '❌'}  ${name} → HTTP ${status}`);
}

console.log('\n🎉  Done!');
