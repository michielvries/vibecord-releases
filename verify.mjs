#!/usr/bin/env node
// Check a VibeCord release statement, and optionally a downloaded file against it.
// Copied verbatim into the public statements repo by deploy/public-hashes.mjs; needs only Node 18+.
//
//   node verify.mjs windows/VibeCord-0.201.0.txt
//   node verify.mjs windows/VibeCord-0.201.0.txt "VibeCord Setup 0.201.0.exe"
//   node verify.mjs android/VibeCord-0.5.1.txt VibeCord-0.5.1.apk
//
// Exit code 0 only when the statement's signature verifies against the key in keys/ AND, if a file was
// given, its SHA-256 matches the statement.
import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [statementPath, filePath] = process.argv.slice(2);
if (!statementPath) {
  console.error('usage: node verify.mjs <statement.txt> [downloaded file]');
  process.exit(2);
}
const statement = readFileSync(statementPath);
const text = statement.toString('utf8');
const field = (k) => new RegExp(`^${k}: (.+)$`, 'm').exec(text)?.[1]?.trim();
const keyId = field('signed-by');
if (
  !text.startsWith('vibecord-release-statement-v1\n') ||
  !keyId ||
  !/^[0-9a-f]{16}$/.test(keyId)
) {
  console.error('✗ not a VibeCord release statement');
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const key = createPublicKey(readFileSync(join(here, 'keys', `${keyId}.pem`)));
// The key file must BE the key its name claims: its id is the first 16 hex of sha256 over the raw
// 32-byte public key. Otherwise a swapped keys/ file would verify under the original id's name.
if (key.asymmetricKeyType !== 'ed25519') {
  console.error(`✗ keys/${keyId}.pem is not an Ed25519 key — do not trust this statement`);
  process.exit(1);
}
const raw = Buffer.from(String(key.export({ format: 'jwk' }).x), 'base64url');
const fingerprint = createHash('sha256').update(raw).digest('hex');
if (fingerprint.slice(0, 16) !== keyId) {
  console.error(`✗ keys/${keyId}.pem is not the key ${keyId} — do not trust this statement`);
  process.exit(1);
}
const sig = Buffer.from(readFileSync(`${statementPath}.sig`, 'utf8').trim(), 'base64');
if (!verify(null, statement, key, sig)) {
  console.error(
    `✗ the signature does NOT verify against key ${keyId} — do not trust this statement`,
  );
  process.exit(1);
}
console.log(`✓ statement signed by key ${keyId}: ${field('platform')} ${field('version')}`);
console.log(`  key fingerprint (sha256): ${fingerprint}`);
console.log('  Compare it with a copy you got some other way; see the README.');
if (filePath) {
  const got = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  if (got !== field('sha256')) {
    console.error(`✗ ${filePath} does NOT match: sha256 ${got}, statement says ${field('sha256')}`);
    process.exit(1);
  }
  console.log(`✓ ${filePath} matches (sha256 ${got})`);
  const cert = field('signing-certificate-sha256');
  if (cert) {
    console.log(
      `  Also check the APK's signer: \`apksigner verify --print-certs ${filePath}\` should`,
    );
    console.log(
      `  print the signer's certificate SHA-256 digest as ${cert} ("Signer #1 certificate SHA-256` +
        ' digest" before build-tools 37, "V2 Signer: certificate SHA-256 digest" from 37).',
    );
  }
}
