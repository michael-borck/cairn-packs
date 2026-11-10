# Cairn packs

Static catalog and submission queue for [Cairn](https://github.com/michael-borck/cairn) content packs.

Catalog site: https://michael-borck.github.io/cairn-packs/

No backend. `catalog/index.json` and the `.learnpack` artifacts are served as static files. The Cairn app fetches the catalog, downloads a pack, verifies its hash, and installs it into the local library.

A merged submission is **not** live immediately. The maintainer reviews it, rebuilds the catalog, and deploys the catalog separately.

## What lives here

```text
catalog/
├── index.json                  catalog entries and SHA-256 hashes
└── packs/<pack-id>.json        one entry per pack
packs/<pack-id>/<version>.learnpack
submissions/<pack-id>/
├── pack.learnpack
└── submission.json
templates/submission.json
site/                          static catalog browser
scripts/build-packs.mjs         maintainer build from Cairn content sources
scripts/verify-catalog.mjs     CI hash and archive check
scripts/validate-submission.mjs CI submission check
```

## First-party packs

The initial catalog contains the two official Cairn packs:

- `docker-fundamentals`
- `git-github-fundamentals`

Build artifacts from the Cairn content sources:

```bash
node scripts/build-packs.mjs ../cairn/content-packs
```

The script writes `packs/<id>/<version>.learnpack`, `catalog/index.json`, and `catalog/packs/<id>.json`. It requires `zip` on the maintainer machine. The build is intentionally local; the private review and signing step stays outside CI.

## Site

`site/` is a static catalog browser. The deploy workflow copies `site/`, `catalog/`, and `packs/` into the Pages artifact.

## Verify

```bash
npm run verify
```

CI runs the same command. It checks:

- catalog shape and unique pack IDs
- every artifact exists
- SHA-256 matches the catalog
- every archive contains the required pack files
- the archive manifest ID and version match the catalog

## Submit a pack

1. Build and validate the pack in Cairn with `cairn validate <path> --strict`.
2. Export the `.learnpack`.
3. Create `submissions/<pack-id>/` with the artifact and a filled-in `submission.json`.
4. Run `npm run validate`.
5. Open a pull request. CI runs the same validator.
6. A maintainer reviews licence, provenance, safety, accuracy, and accessibility.
7. The pack is rebuilt into the catalog and deployed.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [POLICY.md](POLICY.md).

## Trust tiers

- **Official**: first-party, maintained, built from the Cairn content sources.
- **Reviewed**: human-reviewed for licence, safety, accuracy, and accessibility.
- **Community**: schema and safety validated, not accuracy-reviewed.
- **Local**: imported by the learner, never uploaded.

The app shows the tier. Unreviewed packs can be restricted in AI-assisted modes.

## Safety

Cairn packs are not inert data. They contain prompts, hints, lab instructions, and AI boundaries. Packs must not contain executable content, free-form system prompts, or copyrighted material without permission. Labs are learner-run text in v1; the app does not execute pack code.

## Licence

The catalog code is MIT. Each pack carries its own licence in its manifest and archive.
