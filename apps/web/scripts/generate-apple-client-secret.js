#!/usr/bin/env node
// Generates the "client secret" JWT Apple's Sign in with Apple OAuth
// requires (and Supabase's Apple provider expects in its "Secret Key"
// field — that field's "Secret key should be a JWT" error means someone
// pasted the raw .p8 file content there instead of a JWT signed WITH it).
//
// Runs entirely locally — your .p8 private key never leaves this machine,
// this script only prints the resulting signed JWT to your terminal.
// No npm install needed, uses only Node's built-in crypto module.
//
// Usage:
//   node generate-apple-client-secret.js \
//     --team-id TEAMID1234 \
//     --key-id KEYID56789 \
//     --client-id com.signalgenie.signal.web \
//     --key-file /path/to/AuthKey_KEYID56789.p8
//
// Where to find these in Apple Developer Console (developer.apple.com):
//   --team-id    Account → Membership details → Team ID
//   --key-id     Certificates, Identifiers & Profiles → Keys → your
//                "Sign in with Apple" key → shown on the key's detail page
//   --client-id  Certificates, Identifiers & Profiles → Identifiers →
//                your Services ID (NOT the App ID / bundle ID)
//   --key-file   The AuthKey_XXXXXXXXXX.p8 file downloaded when you
//                created the key (only downloadable once — if lost, you
//                must revoke and create a new key)
//
// The output JWT expires in ~6 months (Apple's maximum allowed) — paste
// it into Supabase → Authentication → Providers → Apple → Secret Key.
// Re-run this same command to generate a fresh one when it expires;
// nothing here needs to change until then.

const crypto = require('crypto');
const fs = require('fs');

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function main() {
  const { 'team-id': teamId, 'key-id': keyId, 'client-id': clientId, 'key-file': keyFile } = parseArgs();

  if (!teamId || !keyId || !clientId || !keyFile) {
    console.error('Missing required args. Usage:');
    console.error('  node generate-apple-client-secret.js --team-id TEAMID --key-id KEYID --client-id SERVICES_ID --key-file /path/to/AuthKey.p8');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(keyFile, 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const sixMonths = 15_777_000; // seconds, Apple's max allowed exp

  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + sixMonths,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  // JWS/JWT ES256 signatures must be in "IEEE P1363" (raw r||s) format, not
  // the DER format crypto.sign() produces by default — this option is the
  // one part of this script that isn't just "obvious JWT construction."
  const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  const jwt = `${signingInput}.${base64url(signature)}`;

  console.log('\nYour Apple client secret JWT (paste this into Supabase, not the .p8 file):\n');
  console.log(jwt);
  console.log(`\nExpires: ${new Date((now + sixMonths) * 1000).toISOString()} — regenerate with this same command after that.\n`);
}

main();
