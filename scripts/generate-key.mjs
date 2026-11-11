#!/usr/bin/env node

import { generateKeyPairSync } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const { values } = parseArgs({
  options: {
    out: { type: "string", default: "keys/next" },
  },
});
const outputDir = resolve(repoRoot, values.out);
const privatePath = join(outputDir, "cairn-packs-private.pem");
const publicPath = join(outputDir, "cairn-packs-public.pem");

if (existsSync(privatePath) || existsSync(publicPath)) {
  console.error(`Refusing to overwrite keys in ${outputDir}`);
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
await writeFile(
  privatePath,
  privateKey.export({ type: "pkcs8", format: "pem" }),
  { mode: 0o600 }
);
await writeFile(
  publicPath,
  publicKey.export({ type: "spki", format: "pem" })
);
const raw = publicKey
  .export({ type: "der", type: "spki" })
  .subarray(-32)
  .toString("base64");

console.log(`Generated ${privatePath}`);
console.log(`Generated ${publicPath}`);
console.log(`Raw public key: ${raw}`);
console.log(
  "Add this key to TRUSTED_CATALOG_PUBLIC_KEYS in the Cairn app before rotating the catalog."
);
