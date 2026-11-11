#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkArchive } from "./lib/pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const submissionsRoot = join(repoRoot, "submissions");
const errors = [];
const ids = new Set();
let reviewed = 0;

function fail(message) {
  errors.push(message);
}

if (!existsSync(submissionsRoot)) {
  console.log("No submissions directory; nothing to validate.");
  process.exit(0);
}

for (const item of readdirSync(submissionsRoot, { withFileTypes: true })) {
  if (!item.isDirectory() || item.name.startsWith(".")) continue;
  const label = item.name;
  const directory = join(submissionsRoot, item.name);
  const submissionPath = join(directory, "submission.json");

  if (!existsSync(submissionPath)) {
    fail(`${label}: missing submission.json`);
    continue;
  }

  let submission;
  try {
    submission = JSON.parse(readFileSync(submissionPath, "utf8"));
  } catch (error) {
    fail(`${label}: submission.json is invalid JSON (${error.message})`);
    continue;
  }

  for (const field of [
    "packId",
    "title",
    "author",
    "contact",
    "licence",
    "version",
    "description",
    "changes",
    "status",
    "trust",
  ]) {
    if (
      typeof submission?.[field] !== "string" ||
      !submission[field].trim()
    ) {
      fail(`${label}: ${field} is required`);
    }
  }

  if (submission?.licenceConfirmed !== true) {
    fail(`${label}: licenceConfirmed must be true`);
  }

  if (typeof submission?.packId === "string" && submission.packId) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(submission.packId)) {
      fail(`${label}: packId must be kebab-case`);
    }
    if (ids.has(submission.packId)) {
      fail(`${label}: duplicate pack id ${submission.packId}`);
    }
    ids.add(submission.packId);
  }

  const packFile =
    typeof submission?.packFile === "string" && submission.packFile
      ? submission.packFile
      : "pack.learnpack";
  const packPath = join(directory, packFile);
  const { errors: archiveErrors, manifest } = checkArchive(packPath, label);
  for (const error of archiveErrors) fail(error);
  if (!manifest) continue;

  if (manifest.id !== submission.packId) {
    fail(`${label}: manifest id ${manifest.id} does not match packId`);
  }
  if (manifest.version !== submission.version) {
    fail(`${label}: manifest version ${manifest.version} does not match submission`);
  }
  if (manifest.license !== submission.licence) {
    fail(`${label}: manifest licence ${manifest.license} does not match submission`);
  }

  const reviewPath = join(directory, "review.json");
  if (existsSync(reviewPath)) {
    let review;
    try {
      review = JSON.parse(readFileSync(reviewPath, "utf8"));
    } catch (error) {
      fail(`${label}: review.json is invalid JSON (${error.message})`);
      continue;
    }
    if (review.packId !== submission.packId) {
      fail(`${label}: review packId does not match submission`);
    }
    if (review.version !== submission.version) {
      fail(`${label}: review version does not match submission`);
    }
    if (
      !["approved", "changes-requested", "rejected"].includes(review.status)
    ) {
      fail(`${label}: review status is invalid`);
    }
    if (typeof review.reviewer !== "string" || !review.reviewer.trim()) {
      fail(`${label}: review reviewer is required`);
    }
    if (
      typeof review.reviewedAt !== "string" ||
      Number.isNaN(Date.parse(review.reviewedAt))
    ) {
      fail(`${label}: review reviewedAt must be an ISO date`);
    }
    if (typeof review.notes !== "string") {
      fail(`${label}: review notes must be a string`);
    }
    reviewed += 1;
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

console.log(`✓ ${ids.size} submission(s) valid (${reviewed} reviewed)`);
