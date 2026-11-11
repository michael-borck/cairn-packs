#!/usr/bin/env node

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkArchive, readZipFile } from "./lib/pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const packId = process.argv[2];
const force = process.argv.includes("--force");

if (!packId) {
  console.error("Usage: npm run approve -- <pack-id> [--force]");
  process.exit(1);
}

const baseUrl = (
  process.env.CAIRN_PACKS_BASE_URL ??
  "https://michael-borck.github.io/cairn-packs/"
).replace(/\/?$/, "/");
const privateKeyPath =
  process.env.CAIRN_PACKS_PRIVATE_KEY ??
  join(repoRoot, "keys", "cairn-packs-private.pem");
const submissionDir = join(repoRoot, "submissions", packId);
const submissionPath = join(submissionDir, "submission.json");

if (!existsSync(submissionPath)) {
  console.error(`No submission at submissions/${packId}/submission.json`);
  process.exit(1);
}

const submission = JSON.parse(await readFile(submissionPath, "utf8"));
const packFile =
  typeof submission.packFile === "string" && submission.packFile
    ? submission.packFile
    : "pack.learnpack";
const sourcePath = join(submissionDir, packFile);
const archive = checkArchive(sourcePath, packId);
if (archive.errors.length > 0) {
  for (const error of archive.errors) console.error(`✗ ${error}`);
  process.exit(1);
}
const manifest = archive.manifest;

if (manifest.id !== submission.packId) {
  console.error("✗ manifest id does not match submission packId");
  process.exit(1);
}
if (manifest.version !== submission.version) {
  console.error("✗ manifest version does not match submission version");
  process.exit(1);
}
if (manifest.license !== submission.licence) {
  console.error("✗ manifest licence does not match submission licence");
  process.exit(1);
}

const signingKey = createPrivateKey(await readFile(privateKeyPath));
const publicKey = createPublicKey(signingKey)
  .export({ format: "der", type: "spki" })
  .subarray(-32)
  .toString("base64");
const catalogPath = join(repoRoot, "catalog", "index.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
if (catalog.publicKey !== publicKey) {
  console.error("✗ catalog public key does not match the signing key");
  process.exit(1);
}

const bytes = await readFile(sourcePath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const signature = sign(null, bytes, signingKey).toString("base64");
const destination = join(repoRoot, "packs", manifest.id, `${manifest.version}.learnpack`);
await mkdir(dirname(destination), { recursive: true });

if (existsSync(destination) && !force) {
  const existing = createHash("sha256")
    .update(await readFile(destination))
    .digest("hex");
  if (existing !== sha256) {
    console.error(
      `✗ packs/${manifest.id}/${manifest.version}.learnpack already exists with a different hash. Bump the version or use --force.`
    );
    process.exit(1);
  }
}
await copyFile(sourcePath, destination);

const curriculum = JSON.parse(readZipFile(sourcePath, "curriculum.json"));
const items = JSON.parse(readZipFile(sourcePath, "items.json"));
const labs = JSON.parse(readZipFile(sourcePath, "labs.json"));
const tags = [
  ...new Set((curriculum.skills ?? []).flatMap((skill) => skill.tags ?? [])),
].sort();

const entry = {
  id: manifest.id,
  title: manifest.title,
  version: manifest.version,
  description: manifest.description,
  author: manifest.author?.name ?? submission.author,
  licence: manifest.license,
  level: manifest.level,
  audience: manifest.audience,
  estimatedMinutes: manifest.estimatedMinutes,
  skills: curriculum.skills?.length ?? 0,
  items: items.length,
  labs: labs.length,
  url: new URL(
    `packs/${manifest.id}/${manifest.version}.learnpack`,
    baseUrl
  ).toString(),
  sha256,
  signature,
  trust: "reviewed",
  tags,
  updatedAt: new Date().toISOString(),
};

const packs = (catalog.packs ?? []).filter((pack) => pack.id !== entry.id);
packs.push(entry);
packs.sort((a, b) => a.title.localeCompare(b.title));
const next = {
  ...catalog,
  generated: new Date().toISOString(),
  packs,
};
await writeFile(catalogPath, JSON.stringify(next, null, 2) + "\n");
await writeFile(
  join(repoRoot, "catalog", "packs", `${entry.id}.json`),
  JSON.stringify({ format: "cairn-catalog-pack", ...entry }, null, 2) + "\n"
);

console.log(`Approved and signed ${entry.id}@${entry.version} as reviewed.`);
