# Signing keys

`cairn-packs-private.pem` and `cairn-packs-public.pem` are the maintainer signing keys.

- The private key stays on the maintainer machine. It is ignored by git.
- The public key is committed so contributors and the CI verifier can check signatures.
- The catalog stores the raw 32-byte public key as base64. The Cairn app pins the current official key, so rotate the key only with an app release.
- Do not regenerate the keypair after publishing a catalog. Existing signatures will stop verifying and the app will reject future updates.

Back up the private key in a password manager or encrypted volume. If it is lost, publish a new public key and treat it as a key rotation; old packs will need re-signing.

Generate a development pair only if you own the catalog:

```bash
node - <<'NODE'
const { generateKeyPairSync } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
writeFileSync('keys/cairn-packs-private.pem', privateKey.export({ type: 'pkcs8', format: 'pem' }));
writeFileSync('keys/cairn-packs-public.pem', publicKey.export({ type: 'spki', format: 'pem' }));
NODE
```
