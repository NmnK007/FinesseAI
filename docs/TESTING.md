# Testing and verification

Run `npm run check` for lint, types, unit/PostgreSQL-engine integration tests and production build. Run `npm run test:e2e` with the development app, database and Mailpit running. Install its browser once with `npx playwright install chromium`.

Verified during implementation: migrations apply and rerun idempotently; lint and types pass; the initial 15 unit/integration tests pass; browser flow passes real Mailpit OTP, HttpOnly session, CSV preview/confirmation, exact persisted metrics, deduplication, tenant denial, CSRF rejection, malformed/oversized uploads, unknown GSTIN refusal, mobile overflow, consent revocation, deletion and logout. Two additional model-boundary tests check artifact reproducibility and exclusion of evaluation rows from training. Final command results are reported in the engineering handoff.

Docker is unavailable on the implementation machine. SQL tests use PGlite; browser tests used its PostgreSQL wire adapter and the official Mailpit v1.33.1 Windows binary. This is not a native PostgreSQL/Docker acceptance claim. Compose and multi-instance concurrency still require verification on a Docker-equipped machine.

For the test-only database, run `npm run test:db`, set `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres` and **DB_POOL_MAX=1**, then migrate and start the app. The PGlite server's single connection caused ECONNRESET errors with the normal eight-connection pool; production PostgreSQL retains the normal pool. Native Mailpit must bind SMTP to 127.0.0.1:1025 and HTTP to 127.0.0.1:8025. Never expose these test services publicly.

The browser test now also rejects any API 5xx response. Desktop/mobile screenshots are local ignored artifacts under `.test-artifacts`. No unavailable external financial provider was tested. No paid API is required.

Phase 1 verification: lint and TypeScript passed; all 17 automated tests passed, with zero skipped tests. npm audit reported zero vulnerabilities after the dependency updates.
Phase 1 production build passed on Next.js 15.5.29 (all 26 pages generated).

## Phase 2–5 extension checks (13 November 2026)

- `npm.cmd test`: **31 tests passed, zero failures/skips**. Coverage includes all four migrations, alternate CSV chronology/conflicts/deduplication, split payments, score missingness/reproducibility, source consent, tenant rejection, scenario accounting/year boundaries, anomaly evidence and reviews, scoped copilot/policy/knowledge citations, seven-day grants/revocation/expiry, simulated draft transitions, model metric ties/missing classes and untouched-test leakage guards.
- `npm.cmd run lint`: passed with no lint warnings/errors. Next reports that its lint command will be deprecated in a future major version.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run ml:evaluate`: passed, retained a hashed DEMO_ONLY candidate and passed saved-artifact inference smoke. Test values only describe the synthetic generator.
- `npm.cmd run build`: passed, 29 pages generated on Next 15.5.29. Initial sandboxed attempt encountered EPERM on `.next`; rerunning with permitted filesystem access succeeded.
- `git diff --check`: passed.

Current tests are PostgreSQL-engine integration tests through embedded PGlite, not a Docker/native PostgreSQL run. The earlier Phase 1 browser smoke remains historical evidence; the newly added intelligence/reviewer screens have NOT yet had a complete browser/mobile/accessibility walkthrough. No concurrency/load SLO or production performance claim is made. The test suite startup on this machine varied substantially; this is not a database/app latency benchmark.

The site, Mailpit and test database were stopped at the user's request; ports 3000, 5433, 8025 and 1025 had no listeners at final inspection. Docker-free launcher/guide were removed; embedded test dependencies remain. Docker Compose remains the supported runtime setup.

## Latest local completion verification (supersedes earlier gaps)

`npm.cmd run check` completed successfully: lint clean, TypeScript clean, **40 tests passed (0 failed/skipped)** and production build generated 32 pages. `npm.cmd run ml:evaluate`, `npm.cmd run ml:evaluate:practice`, explicit offline registry selections and `npm.cmd run ml:inference:smoke` also passed. The historical-practice test verifies the 1,000 source rows/300 bad labels and no test influence on trained scaling/weights.

The original Phase 1 browser suite passed again. The new browser suite passed owner alternate-source imports, saved-preview recovery after reload, consent-scoped SSE access/tenant rejection, matching-options UI/API, saved assessment, cited copilot answer, saved scenario/export, simulated application submission, owner grant, reviewer read/note, revocation denial, JSON export isolation and cleanup. Accessible selector/textarea names were fixed after the browser checks exposed them. A test wait was corrected to allow the upload file field to remain empty after preview recovery. Reviewer fixture enrollment occurs before the test app starts because embedded PostgreSQL has a single-connection limitation; this is not a workaround in production app authorization.

Screenshots: `.test-artifacts/intelligence-desktop.png`, `intelligence-mobile.png`, `reviewer-mobile.png`. Owner/reviewer pages passed horizontal-overflow checks at 390px; owner form controls passed accessible-name checks. These are smoke checks, not a complete WCAG/screen-reader/keyboard/contrast certification.

Latest local warm endpoint sample: 20 sequential evidence requests, median approximately **56 ms**, p95 approximately **81 ms**. Exact sample is in `.test-artifacts/intelligence-performance.json`. Environment: Next development server, one embedded PostgreSQL connection, tiny fictional fixture. This is not concurrent load, production latency or a throughput guarantee.

The finite Windows test harness is `npm.cmd run test:local-stack`; `-- --intelligence-only` reruns the extension. It requires the local test Mailpit binary, refuses occupied ports, creates isolated test DB files and stops its own child processes in a finally block. It never replaces Docker Compose as the supported app setup. All temporary app/database/inbox services were stopped afterward. Retention apply was exercised only in disposable in-process database tests; no user records were purged.

Remaining test gates: real Docker/native PostgreSQL and multiple app instances, full accessibility audit, realistic concurrent load and lifecycle/retention scheduling in a production-like deployment, live external-provider/LLM contracts and real-data model validation.

## 13 November final verification
Lint and TypeScript passed; all 50 tests passed with zero failures/skips. Production compilation and 33-page generation passed; final build result is recorded in LOCAL_COMPLETION.md. Latest owner/reviewer English/Hindi axe scans report zero violations. Eight-client/80-request local sample: median 232 ms, p95 501 ms, maximum 631 ms. See LOCAL_COMPLETION.md for limitations and honest unfinished local work.
