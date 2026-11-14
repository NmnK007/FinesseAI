# Data sources and permissions

| Source | Implemented status | Meaning |
|---|---|---|
| Bank CSV | USER_UPLOADED_UNVERIFIED | Authorized owner upload; no independent verification |
| Original business profiles | SYNTHETIC_DEMO | Development-only, explicit demo selection |
| AgamiAI bank/ITR corpus | SYNTHETIC_DEMO | Synthetic upstream documents; no real customer ownership linkage |
| AA, GST, UPI provider APIs, EPFO, ULI, BBPS | CONFIGURATION_REQUIRED | No provider connection or credential flow implemented |
| OCEN | Historical simulated contract only | No real lender, no submissions; unsafe public writes disabled |
| Invoices/electricity imports | Not implemented | Phase 2 |

The bank importer accepts UTF-8 CSV, 500 KB and 1,000 data rows maximum. The browser sends bounded JSON containing the CSV; the server validates the text structure and columns independently of the file extension. Binary/PDF/HTML documents are rejected. Required fields are date, narration and either signed INR amount or debit/credit columns. Optional balance and reference fields improve reconciliation and deduplication. Unknown formats can be mapped manually before preview.

Dates are ISO `YYYY-MM-DD` or Indian `DD/MM/YYYY` / `DD-MM-YYYY`. Money is parsed with decimal digit arithmetic into paise. Categories are conservative narration rules; UPI by itself is not evidence of a sale. Owners can correct categories before confirmation. A reviewed category is an owner assertion, not source verification.

Fingerprints combine date, normalized narration, signed amount, balance and reference, scoped to a stable account alias. Identical rows are skipped and reported. Truly distinct transactions with identical visible fields need distinct references; this ambiguity is not silently resolved. Importing the same account under different aliases cannot be automatically identified. Reconciliation checks only ascending supplied order and warns about mismatched balances; it does not repair them.

Raw files are not retained. Source hashes, parser version, normalized rows, validation reports, consent and timestamps are stored in PostgreSQL with tenant access controls. Export is JSON, avoiding spreadsheet-formula execution. No uploaded material is sent to Gemini by the owner workflow.

Upstream references checked during the audit:

- [AgamiAI Indian-Bank-Statements](https://huggingface.co/datasets/AgamiAI/Indian-Bank-Statements): explicitly tagged Synthetic, Apache-2.0.
- [AgamiAI Indian-Income-Tax-Returns](https://huggingface.co/datasets/AgamiAI/Indian-Income-Tax-Returns): explicitly tagged Synthetic, Apache-2.0.
- [Mailpit installation](https://mailpit.axllent.org/docs/install/): local SMTP/inbox; no forwarding configured.
- [PGlite socket documentation](https://pglite.dev/docs/pglite-socket): test-only PostgreSQL wire compatibility, with concurrency limitations.

Original AgamiAI attribution is preserved. The legacy GSTIN-to-bank mapping is a hash association for demonstrations, not a consented account linkage. Identity-shaped upstream fixtures must never be represented as real PAN/account verification. A separate repository LICENSE was not found; the project owner must resolve redistribution terms before release. Dependency lockfile and package licenses are available for review; new direct libraries use MIT/MIT-0/Apache-2.0, and bundled fonts use OFL-1.1. Do not infer that dependency licensing grants rights to all project materials.

## Alternate evidence (13 November 2026)

Invoice, utility and GST CSV uploads now have persisted preview/confirmation and 90-day consent. Their origin is `USER_UPLOADED_UNVERIFIED`, including when the user uploads the supplied fictional examples. The example files are explicitly fictional: `public/samples/invoice.csv`, `utility.csv`, `gst.csv`. Invoice dates/amounts/direction, utility payments/disputes, GST periods/filing dates and conflicting record keys are validated. Imports are capped at 500 KB / 1,000 rows. No PDF/OCR extraction is claimed.

The typed provider contract reports upload-only, sandbox or configuration-required status. Its mock utility data is `SANDBOX`, never a live connection. AA/GST/utility partner fetches fail closed without an implemented authorized integration. The local loan workflow is a simulated product flow, not a verified OCEN/ULI implementation. EPFO is unavailable and contributes no automatic penalty.

Known gaps: alternate-evidence correction/replacement workflow, full provider consent lifecycle UI, optional coverage applicability controls and partner schema/version verification. Original source facts are not rewritten by reconciliation comments.

## Historical methodology practice dataset

The official [UCI South German Credit page](https://archive.ics.uci.edu/dataset/522/south+german+credit) lists CC BY 4.0 and documents the historical consumer-credit population. Source data/code table were downloaded unchanged with pinned checksums and attribution under `data/practice/south-german`. `provenance.json` records source URL, archive SHA256 and retrieval date. Derived feature selection, label inversion and train-only normalization are documented modifications.

This dataset is for the isolated offline practice command only. It supplies no Indian MSME repayment labels, time horizon, real borrower identifiers or partner integration. Its historical sampling and oversampled bad outcomes prevent real-population PD claims. See ML_TRAINING.md for evaluation and limitations.
