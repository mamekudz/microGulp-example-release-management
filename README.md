# Release management (blog demo)

Runnable reconstruction of a former team workflow around **`RELEASES.json`**: each developer keeps personal notes under `dev/releases/`, a build merges only **fresh, non-duplicate** lines into the central file, and a small **opaque translation adapter** produces an English/German history page.

This is an example under [microGulp-Examples](https://github.com/mamekudz/microGulp-Examples). 

> **Historical vs. today:** The workflow (separate author files, 30-day window, automatic release-info context, multilingual history via `i18xe-sync`) was used in an earlier company project. Those sources are gone. This example **reconstructs the behavior** on current µGulp / Gulp tooling. It does **not** claim to be the original code. The translation backend is deliberately a tiny local provider because **i18x / i18xe-sync is still in the pipeline**.

---

## Quick start

```bash
cd release-management
npm install
npm test
npx gulp MERGE_RELEASES   # or: npm run releases
npx gulp BUILD            # merge + dist/history.html
npx gulp SHOW_HISTORY     # English + German accordion in the console / µGulp dashboard
```

Open `dist/history.html` and switch **English / Deutsch**.

Optional µGulp host (from the microGulp checkout, after `npm install` here):

```text
START_EXAMPLE_RELEASE_MANAGEMENT
```

---

## What problem `RELEASES.json` solves

One file at the project root is the **single source of truth** for:

- the current product version (`main` / `minor` / `revision`),
- a chronological release history,
- English release notes ready for localization.

µGulp itself already reads such a file via `ReleaseInfo.mjs` (`LoadReleases`, `GetVersionString`, `GetVersionHistoryAccordion`, …). This example shows the **team authoring path** that feeds that file.

---

## Why each developer has a private file

```text
dev/releases/MAM.json
dev/releases/DEV.json
dev/releases/UX.json
```

Several people can document work **in parallel without constantly editing the same `RELEASES.json`**, which reduces merge conflicts on the central history.

Only the merge task writes `RELEASES.json`.

---

## Pipeline

```text
dev/releases/*.json
        ↓
30-day filter          (injectable `now` — default 2026-09-24 for fixtures)
        ↓
duplicate detection    (version + normalized English text)
        ↓
context normalization  (exactly one <context="release info"/>)
        ↓
RELEASES.json
        ↓
ReleaseTranslationAdapter   ← stable boundary
        ↓
TranslationProvider
        ├─ TODAY:  LocalDemoTranslationProvider
        └─ FUTURE: i18xe-sync / i18x (not implemented here)
        ↓
localized release history (console + dist/history.html)
```

---

## 30-day rule

A contribution is merged only if its `date` is **≤ 30 days** before the merge clock.

Fixtures intentionally include:

| Case | Example |
| :--- | :--- |
| Current | UX note on `2026-09-24` |
| Inside window | DEV note on `2026-08-26` |
| Outside window | MAM / UX notes in July–August (skipped) |

Tests inject `now: 2026-09-24T12:00:00` so CI does not depend on wall clock. Override CLI builds with `RELEASE_DEMO_NOW`.

---

## Duplicate detection

Fingerprint = `main.minor.revision` + lowercased English body **without** context tags.

- Same text already in `RELEASES.json` → skipped.
- Same text twice in developer files (with/without context) → one line kept.
- Re-running the merge → `merged: 0` (idempotent).

No random IDs.

---

## Context tags (demo format)

Developers write plain American English. The merge step calls `PrepareReleaseContext()` so each line ends with exactly one:

```text
<context="release info"/>
```

Existing tags are stripped first — repeated builds never produce stacked tags.

This matches the historical µGulp `RELEASES.json` convention for screenshots. It is **not** declared to be the final i18x API. Context handling sits behind `ReleaseTranslationAdapter` so a future provider can own it.

---

## Translation layer (opaque on purpose)

Release merge and history rendering never import a concrete i18n engine beyond the adapter:

| Piece | Role |
| :--- | :--- |
| `TranslationProvider` | Contract: `register`, `translate` |
| `ReleaseTranslationAdapter` | Context + register/translate for release notes |
| `LocalDemoTranslationProvider` | Minimal en-US / de-DE dictionary for the blog |

**Historically:** `RELEASES.json` notes were fed into the global system via **`i18xe-sync`**, then shown in the user language.

**Today:** local dictionary only — enough to demonstrate language switching.

**Later:** replace the provider implementation (e.g. conceptually `I18xeSyncTranslationProvider`) **without** changing merge logic or the HTML’s use of pre-built payloads. Do **not** invent i18xe-sync APIs in this repo.

The HTML page consumes `history.json` payloads only — it does not call the provider.

---

## Version comparison

`src/release-version.mjs` provides `CompareVersions` / `VersionToSortKey` (correct for `1.10.0` vs `1.2.0`).

`VersionToLegacyFloat` documents the old “FLOAT for comparison” idea (`major + minor/1000 + revision/1e6`) but is **not** used for sorting. Never `parseFloat("1.10.0")`.

µGulp’s product engine has `GetVersionString` / history helpers; JetBrains tooling has `CompareSemVer`. This example stays self-contained so it installs without linking the private microGulp tree.

---

## Tasks / commands

| Command | Effect |
| :--- | :--- |
| `npm test` | Merge, context, version, translation, history tests |
| `npm run releases` / `gulp MERGE_RELEASES` | Merge into `RELEASES.json` + summary |
| `npm run build` / `gulp BUILD` | Merge + write `dist/history.html` |
| `npm run history` / `gulp SHOW_HISTORY` | Print EN + DE accordions (`LogAccordion`) |

Summary shape:

```text
Release notes:
  scanned / new / duplicates / expired / authors / versions
```

---

## Fixture map (for the article)

| Author | Intent |
| :--- | :--- |
| **MAM** | New 0.9.7 notes, central duplicate, expired legacy line |
| **DEV** | More 0.9.7 notes, 0.9.6 addition, note near 30-day edge |
| **UX** | Fresh 0.9.7 note, same note twice (context strip), duplicate of 0.9.5 central line, expired July note |

Seeded `RELEASES.json` already contains 0.9.6 / 0.9.5 lines so duplicates and multi-version history are visible before the first merge.

---

## License

MIT for original example code; see [LICENSE](LICENSE).

## Interactive website

The shared [examples collection website](https://github.com/mamekudz/microGulp-Examples) runs this project's original merge and translation modules in an isolated temporary directory. It shows accepted notes, duplicates, age filtering, the repeated merge and English/German history. Run `npm install` and `npm start` in the repository root, then open `http://127.0.0.1:9320/release-management/`. The source release file is not modified.
