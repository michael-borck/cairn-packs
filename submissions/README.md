# Submissions

`first-commit` is a small worked example of the submission shape. It is not automatically live.

Add one folder per pack:

```text
submissions/<pack-id>/
├── pack.learnpack
└── submission.json
```

Copy [`../templates/submission.json`](../templates/submission.json), fill it in, and run:

```bash
npm run validate
```

Then open a pull request. A merged submission is not live until the maintainer records a review, signs it, and deploys the catalog. See [REVIEWING.md](../REVIEWING.md).
