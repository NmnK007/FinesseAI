# Finnese 2.0 implementation tracker

Audit date: 12 November 2026. Starting commit: `a541b4b` on `main`.
User-owned untracked `Finnese_2_0_Codex_Master_Prompt.md` is preserved unchanged.
Working branch: `feat/finnese-2-intelligence`. No push or deployment is authorized.

## Baseline inventory

- Keep Next.js App Router, React, TypeScript, Tailwind, cream/mist/sage/sand palette, typography, responsive cards, score simulator, language support, and original history/credits.
- Existing routes: landing, dashboard, lender, apply, architecture, onboarding, signup/login (customer/lender), logout. APIs: health-card, auth/login, applications/decide, ocen/apply, retrain, debug/dataset.
- Existing deterministic score weights: revenue 30%, compliance 25%, counterparty 25%, growth 20%. The legacy model is illustrative; missing inputs cannot safely be populated from uploads without a new evidence-aware contract.
- `getProfile` defaults to another business; dashboard synthesizes unknown GSTINs. Agami accounts are selected by GSTIN hash, not actual ownership. Both Agami upstream dataset cards explicitly tag Synthetic and Apache-2.0 (verified against upstream during audit).
- `auth.ts` exposes fixed OTP and lender passwords; editable unsigned JSON session cookie is not HttpOnly. Middleware trusts it. Sensitive APIs lack server authorization.
- Agami trainer fits all rows then calls a subset holdout: evaluation leakage. Main model uses independent synthetic samples but trains on requests. Neither has real repayment outcomes. Published AUCs do not substantiate credit-risk performance.
- Application/retrain JSON files are instance-local scratch. No database or migrations. No reliable multi-instance durability.
- Debug endpoint exposes PAN/name/runtime paths. Demo identity-shaped records need careful labelling/redaction; no real personal data is introduced by this work.
- No test suite, lint configuration, CI or repository LICENSE found. Preserve original authorship; do not invent a license. Dataset notices need explicit attribution.
- Baseline build failed before compilation: dependencies absent (`next` not found). Node 24.21.0 / npm 11.19.0 present; Docker, psql, initdb absent. Dependencies are being installed. Docker acceptance cannot be claimed without an actual run.

## Dependency map and architecture decision

Browser -> Next route -> authenticated server session -> membership/role check -> parameterized PostgreSQL transaction -> normalized records/evidence -> persisted financial metrics -> owner dashboard.

Use PostgreSQL with reviewed, checksum-tracked SQL migrations and `pg`, rather than introducing an ORM for this small slice: explicit constraints, locks and financial transactions remain inspectable. Test the identical SQL through PGlite's PostgreSQL engine when Docker is unavailable; this is not a claim that Docker networking has been tested. Node's test runner plus `tsx` avoids a second test framework. CSV parser handles quoting safely; Zod validates boundaries; Nodemailer only delivers to loopback Mailpit in development. No paid dependencies or external financial service needed.

## Migration and exact implementation areas

1. `db/migrations`, `scripts/migrate.ts`, `src/lib/db`: persistent users, organizations/memberships, businesses, OTPs, sessions, consent, accounts, import jobs, evidence, transactions, feature snapshots, audit and rate limits.
2. `src/lib/security`, `src/app/api/auth`, login and navigation: opaque sessions, HMAC OTP, single-use/expiry/attempt limits, same-origin mutation protection, local-only transport.
3. `src/lib/ingestion`, `src/lib/finance`, `src/app/api/businesses`, `src/app/api/ingest`, `src/app/data-sources`: mapping/preview, strict dates/paise, categories, deduplication, reports and authorized persisted metrics.
4. Dashboard defaults to owner records; existing visual demo retained behind explicit development flag. Guard legacy endpoints and neutralize unknown GSTIN synthesis. Correct immediate misleading claims and isolate historical documents.
5. `tests`, package scripts, Compose, setup/security/source/testing docs: validate money, imports, auth, isolation, migration and UI flow.

## Risk register

| Risk | Mitigation / remaining gate |
|---|---|
| Synthetic data misrepresented as verified | Explicit demo route/banner, source metadata, remove unsupported claims |
| Cross-business data access | Session + membership checked in server repository on every read/write |
| OTP brute force/replay | Database locks, attempts, expiry, verifier HMAC, request limits |
| Re-upload double counting | Account-scoped fingerprint uniqueness and transactional import |
| Unknown transaction meaning | Conservative categories, inferred confidence, no deposits-as-revenue shortcut |
| Missing evidence creates false score | Withhold real score until sufficient supported dimensions exist |
| CSV/PDF attacks or PII leakage | Bounded CSV only, no public raw files, safe errors, scoped reports |
| Framework/dependency vulnerabilities | Audit installed versions and patch compatible releases; document residuals |
| Production lending/privacy obligations | No live lending/partner claims; legal/security/provider review gates release |
| Missing local services | Test DB logic with PostgreSQL engine; document exact external-service verification gaps |

## Phase checklist

- [x] Phase 0: read complete master specification; inspect baseline, git and architecture; record risks and migration plan.
- [x] Phase 0: baseline documented; high-risk terminology corrected and historical documents marked superseded.
- [x] Phase 1: PostgreSQL schema/migrations and ownership/roles; migration apply/re-run tested through PostgreSQL-compatible PGlite.
- [x] Phase 1: real local Mailpit OTP, secure sessions, logout, CSRF and database rate limits.
- [x] Phase 1: bank CSV mapping, saved preview/resume, validation, reviewable categories, reconciliation warnings, idempotent persistence and provenance.
- [x] Phase 1: owner dashboard using stored cash metrics; no unknown GSTIN synthesis or unsupported score.
- [x] Phase 1: isolated development-only synthetic demo; unsafe legacy write paths closed.
- [x] Phase 1: automated negative/integration/browser checks and startup/security/source/demo documentation.
- [ ] Phase 1 deployment verification: native PostgreSQL/Docker Compose and multi-instance concurrency (Docker unavailable here). PGlite smoke tests require DB_POOL_MAX=1; it is not a production substitute.
- [x] Phase 2: invoice, electricity and GST CSV preview/commit, duplicate/conflict validation, consent and provenance.
- [x] Phase 2: deterministic evidence-aware Health Card, coverage/freshness, versioned snapshots and weighted score-change explanation.
- [x] Phase 2: split-payment reference reconciliation, aligned GST comparison, overdue receivables, utility timeliness and audited review notes.
- [x] Phase 2: typed upload/simulator/provider configuration boundaries, fictional examples, English/Hindi summary.
- [x] Phase 2 extension: configurable paise/date/withholding matching suggestions, optional low-confidence narration matching, saved alternate-import resume and finite authenticated SSE status.
- [x] Phase 2 local extensions: optional-source applicability, immutable source corrections with optimistic concurrency/history, conservative Unicode/spacing counterparty grouping, and English/Hindi secure workspaces. Legacy public/demo pages still require copy/localization cleanup; see LOCAL_COMPLETION.md. No verified entity resolution or automatic tax determination is claimed.
- [x] Phase 3: actual-record rapid-flow, receipt-spike, GST-gap and buyer-concentration signals; persisted review dispositions.
- [x] Phase 3: saved/exported cash scenarios, loan disbursement/fees/EMI, sales/cost/delay stress, cash curve, liquidity gap and conditional DSCR.
- [x] Phase 3 extension: visible three-account cycle evidence (requires both posted legs of each edge), supplier concentration, robust median/MAD receipt signal, supplier-payment deferral with outstanding liabilities, cash tax and inventory stress controls.
- [x] Phase 3 local extensions: visible-account graph and bounded 2–6-account cycle search; owner-declared financing claims and reversal/failure reasons; walk-forward seasonal-versus-recent-mean historical validation. Declarations remain unverified; unseen networks and future repayment capacity are not inferred.
- [x] Phase 4: owner-scoped read-only financial tools, vetted PostgreSQL full-text retrieval, source citations, deterministic local answers and adversarial/tenant tests.
- [x] Phase 4: reproducible synthetic train/validation/test experiment, validation-only L2 selection, untouched holdout, metrics/calibration/baseline/segment report, hashed retained candidate artifacts, schema guard and leakage tests.
- [x] Phase 4 extension: licensed UCI South German Credit practice data + checksum/provenance, isolated historical-label baseline, train-only scaling, group-preserving split and untouched test, segment diagnostics and seeded bootstrap intervals.
- [x] Phase 4 extension: explicit offline demo candidate selection/rollback, retained hash-verified artifacts, timestamped selection history, schema gates and out-of-range input rejection. This registry never publishes a lending model.
- [x] Phase 4 local extensions: opt-in external extractive adapter with citation/output validation and fallback, adversarial contract tests, aggregate category PSI monitoring. Live provider verification remains credential-dependent.
- [ ] Phase 4 BLOCKED: representative Indian MSME outcome labels/consent, real borrower IDs and dates for proper temporal/group validation, independent validation/fairness review. The acquired foreign historical practice data does not resolve this.
- [x] Phase 5: persistent clearly simulated lender terms/drafts/statuses, explicit seven-day owner grants, grant revocation, enrolled reviewer pipeline/evidence/notes, server-side authorization and tests.
- [x] Phase 5: responsive new panels, input labels, error/status feedback, setup/demo/methodology/architecture updates.
- [x] Phase 5 extension: authorized JSON export of current facts, assessments, scenarios, reconciliations, active alerts/reviews, simulated applications, consent and grant metadata. Unscopable free-text reviewer notes intentionally omitted.
- [x] Phase 5 extension: operator retention job, read-only by default; explicit apply purges source data 30 days after expiry/revocation and clears dependent business histories/notes; active source facts preserved. Unit tested; not run against user data.
- [x] Phase 5 extension: original and new browser journeys, mobile overflow checks at 390px, accessible input-label checks, screenshots and a 20-request local latency sample.
- [x] Phase 5 local extensions: automated owner/reviewer EN/HI WCAG scans, keyboard skip navigation, 80-request/eight-client local load check, concurrent correction rejection, dry-run-first Windows/systemd retention schedules and consent-scoped owner-visible reviewer-note exports. Manual screen-reader audit and native multi-instance capacity testing are not complete.
- [ ] Phase 5 BLOCKED: Docker/native PostgreSQL runtime is absent; partner protocol conformance/live AA/GST/utility/OCEN/ULI access needs actual partner credentials and contract versions; production auth, encryption, hosting, legal/security review need a deployment environment and approved providers.

## Current delivery and verification (13 November 2026)

The Docker-free launcher and guide were removed at the user's request. Docker Compose remains the supported local application setup. The previously running site and local services were stopped. Test-only PGlite dependencies are retained for automated SQL tests; no runtime fallback was introduced. User data under ignored `.local` was not deleted.

New migrations are additive: 002 evidence/snapshots, 003 reviews/scenarios/knowledge, 004 explicit sharing and lending sandbox. Existing migration 001 and project history are preserved. No automatic push, deployment or real application transmission occurs.

Implementation is a set of tested vertical slices across Phases 2–5, NOT completion of every master-spec requirement. Items explicitly labelled LOCAL WORK are unfinished engineering, not external blockers. BLOCKED items name the absent runtime, data, credentials or deployment decisions. The latest exact check results are recorded in TESTING.md.

## Latest local completion pass

Added files and fixtures from this pass remain local and uncommitted. No push or production deployment occurred. Browser checks temporarily launched an isolated embedded database, Mailpit and app on port 3100; the finite harness shuts down its own processes in `finally`. This is test infrastructure, not a restored Docker-free application launcher. Original ignored user data was preserved.

The new tests exercise source-consent revocation in exports/resume, dry-run retention, matching cutoffs/withholding, fully visible account cycles, missing cycle legs, supplier risk, cash liabilities, model integrity/rollback, historical-source labels and train/test leakage. Detailed command results and limitations are in TESTING.md.

Final observed results for this local pass: 40 automated tests pass, lint/types/build pass (32 pages), original and extended browser suites pass, practice evaluation and selected-artifact inference pass. The final extension browser run also verifies saved-preview resume/SSE and configurable matching. Latest local sequential timing sample: ~56 ms median / ~81 ms p95, explicitly not production/load validation.

## Six-feature status audit and correction

The preceding chat claim that full bilingual UI, source applicability settings and correction workflows were added was incorrect. Those remain unfinished local engineering. The Hindi summary predates that turn; no full translation system exists. Retention/export and expanded anomalies were added in earlier turns, not in that follow-up.

A new seasonal-history comparison is now wired into the analysis API/UI: at least 18 consecutive completed observed months, walk-forward same-month-last-year and prior-three-month-average baselines, mean absolute errors, and explicit partial-source limitations. Missing history withholds results. This is historical comparison, not future forecasting validation. GST filing validation now permits filing after the reporting month.

| Original main feature | Implemented extent | Remaining and significance |
|---|---|---|
| 1. Real data ingestion + validated ML | Working authorized CSV ingestion, persistence, exact monetary calculations, synthetic and licensed historical offline evaluation, model registry | Live providers and representative MSME outcome validation absent; current models cannot substantiate lending/default predictions |
| 2. Utility and alternative data | Invoice/electricity/GST imports, coverage, score explanations/history, matching and review | Full bilingual UI, applicability controls, source corrections and stronger entity resolution unfinished; affects usability and data maintenance |
| 3. TrustGuard | Reviewable rules for rapid flows, GST gaps, buyer/supplier concentration, spikes and fully visible three-account cycles | General graph visualization, financing-claim/reversal-reason inputs and broader validation unfinished; detection coverage remains limited |
| 4. Copilot | Authorized read-only tools, local deterministic answers, vetted full-text retrieval and citations | External LLM adapter, broader citation evaluation and aggregate drift monitoring unfinished; conversational scope remains narrow |
| 5. Digital twin | Saved cash scenarios, delay/cost/sales/tax/inventory/debt effects, exports, conditional DSCR; now historical seasonal-baseline comparison | Forecast uncertainty and realistic backtesting remain; scenario results are assumptions rather than guaranteed forecasts |
| 6. Local OTP + auth foundation | Real local Mailpit codes, opaque sessions, attempt/expiry/rate limits, owner isolation and expiring reviewer grants | Production delivery/identity/security operations and native PostgreSQL concurrency verification remain |

Shared release work still open: complete keyboard/screen-reader/contrast audit, concurrent load testing, deployment retention scheduling, and reviewer-note export policy. These are not all externally blocked. No percentage is asserted: requirement sizes and validation burdens differ considerably.

## Latest bounded delivery
See [LOCAL_COMPLETION.md](LOCAL_COMPLETION.md) for current implemented work, measured checks and honest remaining local/external gaps. Earlier completion claims do not supersede these limits.
