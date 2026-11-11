# Reviewing a submission

A submission is not approved by opening a pull request. It needs a review record and a signed catalog entry.

## Review statuses

- `approved`: ready to sign and publish.
- `changes-requested`: the author needs to update the pack. Bump the version when the artifact changes.
- `rejected`: not suitable for the catalog.

## Review

```bash
npm run validate

# Approve
npm run review -- <pack-id> --approve --notes "Content and licence checked." --reviewer "Your name"

# Request changes
npm run review -- <pack-id> --request-changes --notes "Please fix the answer key in item X."

# Reject
npm run review -- <pack-id> --reject --notes "Not a fit for the catalog."
```

The command writes `submissions/<pack-id>/review.json`. Review notes are committed with the submission.

## Publish

Only an `approved` review can be signed:

```bash
npm run approve -- <pack-id>
npm run verify
```

The approval script copies the artifact into `packs/`, signs it, and updates the catalog with `trust: "reviewed"`. Commit `submissions/<pack-id>/review.json`, `packs/<pack-id>/`, and the catalog together.

## What to check

Use [POLICY.md](POLICY.md). At minimum:

- Licence and provenance.
- Accuracy for the stated audience.
- No executable content, scripts, or free-form system prompts.
- Labs are learner-run text.
- Level 1 hints do not reveal answers.
- Accessibility and clear prompts.
- The archive passes `cairn validate <pack-dir> --strict` in Cairn.
