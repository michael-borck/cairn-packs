#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { checkArchive } from "./lib/pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const { values, positionals } = parseArgs({
  options: {
    approve: { type: "boolean" },
    "request-changes": { type: "boolean" },
    reject: { type: "boolean" },
    notes: { type: "string" },
    reviewer: { type: "string" },
  },
  allowPositionals: true,
});

const packId = positionals[0];
if (!packId) {
  console.error(
    "Usage: npm run review -- <pack-id> --approve|--request-changes|--reject [--notes text] [--reviewer name]"
  );
  process.exit(1);
}

const flags = [
  values.approve,
  values["request-changes"],
  values.reject,
].filter(Boolean);
if (flags.length !== 1) {
  console.error("Choose exactly one of --approve, --request-changes, or --reject.");
  process.exit(1);
}

const status = values.approve
  ? "approved"
  : values["request-changes"]
    ? "changes-requested"
    : "rejected";
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
const archive = checkArchive(join(submissionDir, packFile), packId);
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

const review = {
  packId: manifest.id,
  version: manifest.version,
  status,
  reviewer: values.reviewer ?? "Cairn maintainers",
  reviewedAt: new Date().toISOString(),
  notes: values.notes ?? "",
};
await writeFile(
  join(submissionDir, "review.json"),
  JSON.stringify(review, null, 2) + "\n"
);
console.log(`${packId}: ${status}`);
