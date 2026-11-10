import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export const PACK_FILES = [
  "manifest.json",
  "curriculum.json",
  "items.json",
  "rubrics.json",
  "misconceptions.json",
  "labs.json",
  "policy.json",
  "LICENSE",
  "CHANGELOG.md",
];

export function listZip(path) {
  const output = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim().replace(/^\.\//, ""))
    .filter(Boolean);
}

export function readZipFile(path, name) {
  return execFileSync("unzip", ["-p", path, name], { encoding: "utf8" });
}

export function checkArchive(path, label) {
  const errors = [];
  if (!existsSync(path)) {
    errors.push(`${label}: missing archive ${path}`);
    return { errors };
  }

  let files;
  try {
    files = new Set(listZip(path));
  } catch (error) {
    errors.push(`${label}: unreadable archive (${error.message})`);
    return { errors };
  }

  for (const file of PACK_FILES) {
    if (!files.has(file)) {
      errors.push(`${label}: missing ${file} in archive`);
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(readZipFile(path, "manifest.json"));
  } catch (error) {
    errors.push(`${label}: manifest.json is missing or invalid (${error.message})`);
  }

  return { errors, manifest, files };
}
