# Contributing a pack

Thanks for contributing. Keep submissions small, complete, and reviewable.

## Before you submit

- Build the pack in Cairn.
- Run `cairn validate <pack-dir> --strict` and fix every error and warning you can.
- Confirm the pack has a licence, source, changelog, and no content you do not have the right to redistribute.
- Confirm labs are learner-run text and the pack contains no executable content or free-form system prompts.
- Use Cairn's **Export .learnpack** action and do not edit the archive afterwards.

## Submission layout

Create one folder per pack:

```text
submissions/<pack-id>/
├── pack.learnpack
└── submission.json
```

Copy [`templates/submission.json`](templates/submission.json) and fill it in. Keep `packId`, `version`, and `licence` consistent with the pack manifest.

## Validate

```bash
npm run validate
```

CI runs the same script. A pull request with a failing validation is not reviewed.

## Review

A maintainer checks the pack against [POLICY.md](POLICY.md), runs `npm run approve -- <pack-id>`, verifies the catalog, and deploys it. A merged PR is not live until that deploy completes.

## Corrections

Do not replace an artifact after review. Ship corrections as a new semantic version.
