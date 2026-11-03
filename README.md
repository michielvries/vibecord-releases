# VibeCord release statements

Each VibeCord installer published from this repository's start onward is listed here with its hashes,
signed with VibeCord's offline release key. This repository is kept separately from the server the
installers download from, so you can check a download against something that server cannot change.

- `windows/VibeCord-<version>.txt`: the Windows installer's file name, size, SHA-256 and SHA-512.
- `android/VibeCord-<version>.txt`: the Android APK's SHA-256 and the SHA-256 of the certificate it is
  signed with. The certificate is the same for every release, so it also tells you whether an APK
  you already have is genuine.
- `*.txt.sig`: the statement's Ed25519 signature (base64).
- `keys/<id>.pem`: the public key that made the signatures. The installed desktop app checks its
  updates against the same key.

## What this proves, and what it does not

A statement shows that whoever controls this repository's signing key published that hash. It does
not depend on VibeCord's server. It does depend on this repository: someone who could change it could
also replace a key, and rewrite its history. So the key's fingerprint should stay the same over time.
`verify.mjs` prints it. The strongest check is a copy of that fingerprint you got some other way —
from the person who gave you VibeCord, say — and noticing if it ever changes.

## Checking a download

On Windows, in PowerShell:

```powershell
Get-FileHash "VibeCord Setup 0.201.0.exe" -Algorithm SHA256
```

The hash must equal the `sha256:` line of `windows/VibeCord-0.201.0.txt`.

For an Android APK, with the Android SDK's `apksigner`:

```
apksigner verify --print-certs VibeCord-0.5.1.apk
```

The signer's certificate SHA-256 digest must equal the statement's `signing-certificate-sha256:`
line. apksigner before build-tools 37 prints it as `Signer #1 certificate SHA-256 digest`; 37 prints
`V2 Signer: certificate SHA-256 digest` (plus V3 lines, the same value).

## Checking the statement itself

With Node.js 18 or later, from a clone of this repository:

```
node verify.mjs windows/VibeCord-0.201.0.txt "path\to\VibeCord Setup 0.201.0.exe"
```

Or with OpenSSL 3:

```
openssl base64 -d -A -in windows/VibeCord-0.201.0.txt.sig -out sig.bin
openssl pkeyutl -verify -pubin -inkey keys/<id>.pem -rawin -in windows/VibeCord-0.201.0.txt -sigfile sig.bin
```

`<id>` is the `signed-by:` line of the statement.
