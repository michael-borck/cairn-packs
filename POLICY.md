# Catalog policy

The catalog is discovery. The Cairn app is the runtime. A downloaded pack is copied into the local library and works offline afterwards.

## Trust tiers

- **Official**: first-party, maintained, built from the Cairn content sources.
- **Reviewed**: human-reviewed for licence, safety, accuracy, and accessibility.
- **Community**: schema and safety validated, not accuracy-reviewed.
- **Local**: imported by the learner, never uploaded.

## Review checklist

- The pack ID is stable and the version is semantic.
- The licence is present and compatible with redistribution.
- The author has the right to share every item, hint, lab, and media file.
- The content is accurate enough for the stated audience.
- The pack does not include executable content, scripts, or free-form system prompts.
- Labs are learner-run text. The app does not execute pack code.
- No external media unless the host is explicitly allowlisted.
- Hints at level 1 do not reveal answers.
- The pack passes `cairn validate --strict` in Cairn.
- The archive contains the required files and the manifest ID and version match the catalog entry.
- Accessibility: clear prompts, no answer-only interactions, and no reliance on colour alone.

## Reject

- NSFW, hate, harassment, or dangerous instructions.
- Copyrighted material without permission.
- Prompt injection, hidden instructions, or attempts to change the engine's system prompt.
- Executable code, installers, or scripts.
- Misleading claims of evidence, accreditation, or endorsement.
- A pack that cannot be reviewed because it is incomplete or unreadable.

## Ranking

No free-text reviews and no leaderboard. Start with curated featured packs, categories, and tags. Add popularity counts only if the catalog grows enough to need them.

## Removal

A maintainer can remove a pack for licence, safety, accuracy, or integrity reasons. Removed packs stay in learner local libraries until the learner removes them. The catalog records the removal reason and replacement version when possible.
