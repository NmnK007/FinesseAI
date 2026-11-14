#  FinesseAI

MSME financial evidence prototype, extending the original UdyamAI project for IDBI Innovate 2026. O. Existing visual design, score simulator, language demos and original authorship are preserved.

**Secure foundation:** local Mailpit OTP, opaque secure sessions, PostgreSQL migrations and owner isolation, bank CSV mapping/preview, row validation, reviewed categories, deduplication, source provenance, consent revocation, stored cash metrics, export and deletion.

**Added evidence workspace:** invoice/electricity/GST CSV imports, explainable Health Card and snapshots, reconciliation, anomaly review, saved cash-flow stress tests, scoped local copilot, simulated loan drafts and permissioned reviewer workspace. Open `/intelligence` after creating a business.

**Not a lender or bureau:** no live AA/GST/ULI/OCEN connection, real loan offers, default prediction or verified credit-risk performance. The owner-data dashboard withholds a Health Score until enough evidence exists. The original score/lender dashboards are a separate, explicit development-only synthetic demo. Both AgamiAI corpora are synthetic, as tagged by their upstream dataset cards.

## Local startup

Prerequisites: Node.js 22+ and Docker Compose. Run from this repository:

```powershell
npm.cmd ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env`: set `OTP_SECRET` to the generated random value; choose `POSTGRES_PASSWORD` and put the same password in `DATABASE_URL` (URL-encode special characters). Never commit this file.

```powershell
docker compose up -d
npm.cmd run db:migrate
npm.cmd run dev -- --hostname 127.0.0.1
```

Open [Finesse](http://localhost:3000/login/customer) and the [local OTP inbox](http://127.0.0.1:8025). Use a fictional address such as `owner@finnese.test`. Mailpit captures the code locally; no real email/SMS/WhatsApp is sent. Create a business, upload `public/samples/fictional-bank.csv`, review and confirm. Re-upload under the same account alias to verify deduplication.

`AUTH_DELIVERY=mailpit` and `ENABLE_DEMO=true` work only under `npm.cmd run dev`; production refuses both. `APP_ORIGIN` must exactly match the browser origin. PostgreSQL data persists in the Compose named volume. `docker compose down` stops services without deleting that volume.

Docker Compose is the supported application setup. Automated database tests use embedded PostgreSQL without running the site. There is no silent in-memory fallback in the app.

## Checks

```powershell
npm.cmd run check
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`check` runs lint, TypeScript, unit/database integration tests and production build. `test:e2e` additionally requires the running development app, PostgreSQL and Mailpit above. It uses fictional `.test` addresses and deletes its own business records. No paid API key is needed.

Offline illustrative model generation: `npm.cmd run ml:train:demo`. It fits synthetic labels only, never real approvals/defaults. Online requests read the committed artifact; request-triggered training is disabled.

## Current routes

| Route | Purpose |
|---|---|
| `/login/customer` | Development inbox sign-in |
| `/data-sources` | Owned business, CSV preview/import, consent, export/deletion |
| `/dashboard` | Stored owner financial metrics; neutral insufficient-evidence score |
| `/intelligence` | Evidence, Health Card, alerts, copilot, scenarios and lending sandbox |
| `/lender` | Explicitly shared records for enrolled reviewers |
| `/dashboard?mode=demo` | Explicit synthetic legacy dashboard, development only |
| `/lender?mode=demo` | Isolated synthetic lender illustration, development only |
| `/api/health` | Non-sensitive database readiness |

Legacy hardcoded credentials no longer work. To demonstrate reviewer access, sign in once as `reviewer@finnese.test`, run `npm.cmd run demo:enroll-reviewer -- reviewer@finnese.test`, then grant that account access from the owner’s evidence workspace. Reviewer role alone grants no records. A GSTIN query never grants access. Sandbox drafts never reach a real lender.

## Engineering documentation

- [Audit, phase checklist and remaining work](docs/FINNESE_2_IMPLEMENTATION_PLAN.md)
- [Implemented architecture](docs/ARCHITECTURE_V2.md)
- [Sources, permissions and licensing](docs/DATA_SOURCES.md)
- [Financial formulas and score limitations](docs/SCORING_METHODOLOGY.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Testing and observed results](docs/TESTING.md)
- [Team demonstration](docs/HACKATHON_DEMO.md)
- [Model card](docs/MODEL_CARD.md) and [offline modelling](docs/ML_TRAINING.md)

Phases 2–5 now have implemented vertical slices; the full master specification is not complete. General graph analysis, partner contracts, external LLM integration, complete localization and full accessibility/load/release validation remain. Three-account evidence cycles, licensed historical practice evaluation and owner/reviewer browser/mobile smoke checks are now implemented. See the detailed unchecked items in the implementation tracker. Run `npm.cmd run ml:evaluate` for the reproducible synthetic-only evaluation report.

## Attribution and release boundaries

AgamiAI [Indian-Bank-Statements](https://huggingface.co/datasets/AgamiAI/Indian-Bank-Statements) and [Indian-Income-Tax-Returns](https://huggingface.co/datasets/AgamiAI/Indian-Income-Tax-Returns) are attributed synthetic datasets labelled Apache-2.0. Their original fixture attribution is retained. Inter and Instrument Serif are bundled with their font-package licenses. No repository-level LICENSE was present in the baseline; resolve project redistribution rights before release.

Historic root architecture documents and PPTX decks describe earlier proposals and contain superseded claims. They are preserved for project history and are not evidence of implemented integrations, real data, regulatory compliance or credit-risk validation. Use the v2 documents for current behavior. Production requires further identity, legal, privacy, security, provider and lender reviews; nothing was deployed or pushed during this implementation.

## Latest local additions

- Restore saved alternate-evidence previews; consent-scoped status SSE and authorized JSON export.
- Review matching with explicit amount/date/withholding assumptions and optional low-confidence narration matching.
- Visible three-account cycle, supplier concentration and robust receipt-spike review rules.
- Supplier payment lag, unpaid supplier liabilities, tax and inventory cash assumptions in saved scenarios.
- `npm.cmd run data:retention` previews cleanup; `-- --apply` explicitly purges eligible expired-source records and dependent histories after the documented 30-day grace period. No user data was purged during development.
- `npm.cmd run ml:evaluate:practice` evaluates the licensed historical UCI practice dataset. This is not Indian MSME validation.
- `npm.cmd run ml:registry -- status` inspects offline candidate selection/history; `npm.cmd run ml:inference:smoke` verifies the selected demo artifact without training.
- `npm.cmd run test:e2e:intelligence` runs the new browser flow against the running Docker-backed development stack. It expects an enrolled fictional `reviewer-browser@finnese.test` account; sign in once and use the enrollment command before running.

`test:local-stack` is a finite Windows development test harness requiring the locally installed Mailpit test binary; it is not the supported app launcher. It uses a new isolated embedded test database and shuts down its own processes. Docker Compose remains the supported app setup.
