#!/usr/bin/env node

import { createHash, createPublicKey, verify } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkArchive } from "./lib/pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const catalogPath = join(repoRoot, "catalog", "index.json");
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!existsSync(catalogPath)) {
  console.error("catalog/index.json is missing. Run npm run build first.");
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (error) {
  console.error(`catalog/index.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

if (catalog.format !== "cairn-catalog") {
  fail("catalog format must be cairn-catalog");
}
if (catalog.signatureAlgorithm !== "ed25519") {
  fail("catalog signatureAlgorithm must be ed25519");
}
if (!Array.isArray(catalog.packs)) {
  fail("catalog.packs must be an array");
}
if (!Array.isArray(catalog.revoked)) {
  fail("catalog.revoked must be an array");
}

let publicKey;
if (typeof catalog.publicKey !== "string" || !catalog.publicKey) {
  fail("catalog.publicKey is required");
} else {
  const raw = Buffer.from(catalog.publicKey, "base64");
  if (raw.length !== 32) {
    fail("catalog.publicKey must be a raw 32-byte Ed25519 key");
  } else {
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      raw,
    ]);
    publicKey = createPublicKey({ key: spki, format: "der", type: "spki" });
  }
}

const ids = new Set();
const catalogPacks = Array.isArray(catalog.packs) ? catalog.packs : [];
for (const entry of catalogPacks) {
  const label = entry?.id ?? "unknown pack";
  for (const field of [
    "id",
    "title",
    "version",
    "description",
    "author",
    "licence",
    "level",
    "audience",
    "url",
    "sha256",
    "trust",
  ]) {
    if (typeof entry?.[field] !== "string" || !entry[field].trim()) {
      fail(`${label}: ${field} is required`);
    }
  }

  if (typeof entry?.id === "string") {
    if (ids.has(entry.id)) fail(`${label}: duplicate pack id`);
    ids.add(entry.id);
  }

  if (typeof entry?.url !== "string" || !entry.url) continue;
  const expectedPath = `packs/${entry.id}/${entry.version}.learnpack`;
  let artifactPath;
  if (/^https?:\/\//i.test(entry.url)) {
    try {
      const pathname = new URL(entry.url).pathname;
      if (!pathname.endsWith(`/${expectedPath}`)) {
        fail(`${label}: url must end with ${expectedPath}`);
      }
    } catch {
      fail(`${label}: url must be a valid absolute URL`);
    }
    artifactPath = resolve(repoRoot, expectedPath);
  } else {
    if (entry.url !== expectedPath) {
      fail(`${label}: url must be ${expectedPath}`);
    }
    artifactPath = resolve(repoRoot, expectedPath);
  }
  if (!existsSync(artifactPath)) {
    fail(`${label}: missing artifact ${expectedPath}`);
    continue;
  }

  const bytes = readFileSync(artifactPath);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== entry.sha256) {
    fail(`${label}: SHA-256 mismatch`);
  }

  if (typeof entry.signature !== "string" || !entry.signature) {
    fail(`${label}: signature is required`);
  } else if (!publicKey) {
    fail(`${label}: cannot verify signature without a public key`);
  } else {
    try {
      const signature = Buffer.from(entry.signature, "base64");
      if (signature.length !== 64) {
        fail(`${label}: signature must be 64 bytes`);
      } else if (!verify(null, bytes, publicKey, signature)) {
        fail(`${label}: signature verification failed`);
      }
    } catch (error) {
      fail(`${label}: signature verification failed (${error.message})`);
    }
  }

  const { errors: archiveErrors, manifest } = checkArchive(
    artifactPath,
    label
  );
  for (const error of archiveErrors) fail(error);
  if (!manifest) continue;

  if (manifest.id !== entry.id) {
    fail(`${label}: manifest id ${manifest.id} does not match catalog`);
  }
  if (manifest.version !== entry.version) {
    fail(`${label}: manifest version ${manifest.version} does not match catalog`);
  }
  if (manifest.license !== entry.licence) {
    fail(`${label}: manifest licence ${manifest.license} does not match catalog`);
  }

  const detailPath = join(repoRoot, "catalog", "packs", `${entry.id}.json`);
  if (!existsSync(detailPath)) {
    fail(`${label}: missing catalog/packs/${entry.id}.json`);
  } else {
    try {
      const detail = JSON.parse(readFileSync(detailPath, "utf8"));
      if (detail.format !== "cairn-catalog-pack") {
        fail(`${label}: detail format must be cairn-catalog-pack`);
      }
      if (detail.id !== entry.id) {
        fail(`${label}: detail id does not match catalog`);
      }
      if (detail.sha256 !== entry.sha256) {
        fail(`${label}: detail hash does not match catalog`);
      }
      if (detail.signature !== entry.signature) {
        fail(`${label}: detail signature does not match catalog`);
      }
    } catch (error) {
      fail(`${label}: detail JSON is invalid (${error.message})`);
    }
  }
}

for (const revocation of catalog.revoked ?? []) {
  const label = revocation?.id ?? "unknown pack";
  if (typeof revocation?.id !== "string" || !revocation.id) {
    fail("revocation: id is required");
  } else if (!ids.has(revocation.id)) {
    fail(`revocation ${label}: unknown pack id`);
  }
  if (
    revocation?.version !== undefined &&
    (typeof revocation.version !== "string" || !revocation.version)
  ) {
    fail(`revocation ${label}: version must be a string when present`);
  }
  if (typeof revocation?.reason !== "string" || !revocation.reason.trim()) {
    fail(`revocation ${label}: reason is required`);
  }
  if (
    typeof revocation?.revokedAt !== "string" ||
    Number.isNaN(Date.parse(revocation.revokedAt))
  ) {
    fail(`revocation ${label}: revokedAt must be an ISO date`);
  }
  if (
    revocation?.replacement !== undefined &&
    (typeof revocation.replacement !== "string" || !revocation.replacement)
  ) {
    fail(`revocation ${label}: replacement must be a string when present`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

console.log(
  `✓ catalog ok (${ids.size} pack(s), ${(catalog.revoked ?? []).length} revocation(s))`
);
