#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PACK_FILES } from "./lib/pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const defaultSource = resolve(repoRoot, "../cairn/content-packs");
const source = resolve(
  process.argv[2] ?? process.env.CAIRN_PACKS_SOURCE ?? defaultSource
);
const packsRoot = join(repoRoot, "packs");
const catalogRoot = join(repoRoot, "catalog");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function buildPack(directory) {
  const manifest = await readJson(join(directory, "manifest.json"));
  if (!manifest?.id || !manifest?.version) {
    throw new Error(`${directory}: manifest needs id and version`);
  }

  const staging = await mkdtemp(join(tmpdir(), `cairn-pack-${manifest.id}-`));
  try {
    for (const file of PACK_FILES) {
      await copyFile(join(directory, file), join(staging, file));
    }
    const readme = join(directory, "README.md");
    try {
      await copyFile(readme, join(staging, "README.md"));
    } catch {
      // README is optional.
    }

    const outputDirectory = join(packsRoot, manifest.id);
    const outputPath = join(outputDirectory, `${manifest.version}.learnpack`);
    await mkdir(outputDirectory, { recursive: true });
    await rm(outputPath, { force: true });
    execFileSync("zip", ["-qrX", outputPath, "."], {
      cwd: staging,
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    });

    const bytes = await readFile(outputPath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const [curriculum, items, labs] = await Promise.all([
      readJson(join(directory, "curriculum.json")),
      readJson(join(directory, "items.json")),
      readJson(join(directory, "labs.json")),
    ]);

    const tags = [
      ...new Set(
        (curriculum.skills ?? []).flatMap((skill) => skill.tags ?? [])
      ),
    ].sort();

    return {
      id: manifest.id,
      title: manifest.title,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author?.name ?? "",
      licence: manifest.license,
      level: manifest.level,
      audience: manifest.audience,
      estimatedMinutes: manifest.estimatedMinutes,
      skills: curriculum.skills?.length ?? 0,
      items: items.length,
      labs: labs.length,
      url: `packs/${manifest.id}/${manifest.version}.learnpack`,
      sha256,
      trust: "official",
      tags,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  await mkdir(packsRoot, { recursive: true });
  await mkdir(join(catalogRoot, "packs"), { recursive: true });

  let entries = [];
  try {
    entries = await readdir(source, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Cannot read source directory ${source}: ${error.message}`);
  }

  const packs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name === "example") continue;
    const directory = join(source, entry.name);
    const manifestPath = join(directory, "manifest.json");
    try {
      await readFile(manifestPath);
    } catch {
      continue;
    }
    const pack = await buildPack(directory);
    packs.push(pack);
    console.log(`Built ${pack.id}@${pack.version} -> ${pack.url}`);
  }

  packs.sort((a, b) => a.title.localeCompare(b.title));

  for (const pack of packs) {
    await writeFile(
      join(catalogRoot, "packs", `${pack.id}.json`),
      JSON.stringify({ format: "cairn-catalog-pack", ...pack }, null, 2) + "\n"
    );
  }

  const catalog = {
    format: "cairn-catalog",
    version: 1,
    generated: new Date().toISOString(),
    packs,
  };
  await writeFile(
    join(catalogRoot, "index.json"),
    JSON.stringify(catalog, null, 2) + "\n"
  );
  console.log(`Catalog has ${packs.length} pack(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
