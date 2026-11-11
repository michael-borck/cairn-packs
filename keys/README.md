# Signing keys

`cairn-packs-private.pem` and `cairn-packs-public.pem` are the maintainer signing keys.

- The private key stays on the maintainer machine. It is ignored by git.
- The public key is committed so contributors and the CI verifier can check signatures.
- The catalog stores the raw 32-byte public key as base64. The Cairn app pins the current official key, so rotate the key only with an app release.
- Do not regenerate the keypair after publishing a catalog. Existing signatures will stop verifying and the app will reject future updates.

Back up the private key in a password manager or encrypted volume. If it is lost, publish a new public key and treat it as a key rotation; old packs will need re-signing.

## Rotation

1. Generate a new pair:

   ```bash
   npm run keygen -- --out keys/next
   ```

2. Add the printed raw public key to `TRUSTED_CATALOG_PUBLIC_KEYS` in the Cairn app and ship an app update. Keep the old key in that list for the transition.
3. Re-sign official and reviewed packs with the new key:

   ```bash
   CAIRN_PACKS_PRIVATE_KEY=keys/next/cairn-packs-private.pem npm run build
   ```

4. Replace `keys/cairn-packs-public.pem` with the new public key. Keep the old public key in the app's trusted list until old clients are gone.
5. Run `npm run verify`, commit the catalog and artifacts, and deploy.

The catalog stores a short `keyId` fingerprint so the signing key is visible in the artifact metadata. Rotate only with an app release that trusts the new key.
