# FINNESE 2.0 — CODEX MASTER IMPLEMENTATION PROMPT

> **Copy everything in this document into Codex while the Finnese repository is open as its working directory.**
> Repository: https://github.com/NmnK007/Finnese
> Task type: Extend and harden an existing fintech hackathon prototype. Implement working code, tests, documentation and a compelling local demo—not just designs or plans.

---

## 0. YOUR ROLE, GOAL AND OPERATING RULES

You are a senior full-stack engineer, financial-data engineer, ML engineer, application-security engineer, and fintech product architect. You are also an excellent technical mentor: the project owner understands Python, TypeScript and some ML but is still learning lending and business finance.

**Mission:** Evolve Finnese into an evidence-backed MSME Financial Health and Credit Intelligence platform for Indian new-to-credit/new-to-bank enterprises. Preserve and improve the existing app. Build six connected features:

1. **Real-data ingestion + rigorously validated financial scoring/ML** (replace misleading hardcoded production behavior).
2. **Utility and alternate-data intelligence** (GST, bank/UPI, invoices, EPFO where authorized, utility payments, optional AA sandbox).
3. **Fraud/manipulation/anomaly detection** with evidence and human-review workflows.
4. **Financial AI copilot with RAG + constrained tool-calling agent**.
5. **Cash-flow digital twin** with forecasting, working-capital analysis and loan stress tests.
6. **Development-only local OTP inbox**, replacing the hardcoded/WhatsApp demo flow locally, plus secure auth foundations.

**Cross-cutting product feature:** An **Explainable Financial Health Card**, showing score, dimension scores, data provenance, evidence coverage, source trust, model/data version, risks, trends and recommended actions.

The product is designed to *support lender underwriting and empower MSMEs*, not to represent itself as a regulated bank or to approve loans autonomously. No claims of actual bureau scores, real lender preapproval, live ULI/OCEN connectivity or real-world default prediction without substantiating integration and validation.

### How to execute the request

- **FIRST inspect the actual repository**, its source files, README, architecture, package.json, tests and git status. Treat this document as desired outcomes; the checked-out code is the source of truth.
- Create a new working branch named `feat/finnese-2-intelligence` if safe, but **do not overwrite uncommitted user work**. Do not force-push or push automatically. Preserve history. Do not remove original authors' credits or violate third-party licensing; audit license/attribution and document any issue.
- Write `docs/FINNESE_2_IMPLEMENTATION_PLAN.md` containing an architecture audit, a dependency map, migration plan, risk register and a checklist. Then **implement**, not just plan.
- Execute in vertical slices/phases, complete the highest-priority functional paths, run checks and fix failures. Do not wait for permission for ordinary file edits, tests or local development; ask only if a truly blocking external credential, paid service, legal access or destructive action is required. If blocked, implement a working compliant local adapter and document exactly what remains gated.
- Prefer **working, comprehensible, testable software** to buzzword-heavy complexity. Explain decisions in concise inline comments and developer docs. Keep dependency additions small and verify licenses and actively supported versions.
- Preserve existing product aesthetics and routes where possible, while improving accessibility, mobile behavior, page performance and understandable financial labels.
- Keep the application usable **without any paid API key** using local uploads, synthetic demonstration fixtures explicitly labelled as such, and deterministic/local fallbacks. Real partner integrations must be opt-in and disabled unless properly configured.
- When an integration cannot lawfully or technically run in local development, do **not** fabricate a working integration. Build a typed interface, a simulated/sandbox adapter with a conspicuous status label, and a documented onboarding path.
- Never pretend to have tested unavailable services. Report what ran and what did not.
- Do not deploy, register paid services, send real WhatsApp/SMS messages, submit real loan applications, or perform other externally consequential operations without explicit owner authorization.

## 1. BASELINE REPOSITORY AUDIT

Inspect at least these existing locations (adjust if paths changed):

- `package.json`, `next.config.mjs`, `src/app/`, `src/components/`, `src/data/`
- `src/lib/scoreEngine.ts` — current deterministic 0–1000 health score, four dimensions.
- `src/lib/mlModel.ts` — current TypeScript logistic regression / approval confidence model.
- `src/lib/agami/lrRetrain.ts`, `src/lib/agami/dataset.ts`, and data parsing/statement modules.
- `src/lib/mockData.ts` — example MSME profiles.
- `src/lib/gstin.ts` — GSTIN format validation / deterministic profile synthesis.
- `src/lib/auth.ts` and auth routes — current demo OTP / sessions / lender auth.
- `src/lib/gemini.ts` — existing explanatory LLM integration.
- `src/lib/ocen.ts` — simulated loan-protocol integration.
- `src/app/api/health-card`, `src/app/api/retrain`, `src/app/dashboard`, `src/app/lender`, and relevant application routes.
- `README.md`, `ARCHITECTURE.md`, `AGAMI_INTEGRATION.md`, `PRODUCTION_ARCHITECTURE.md`, `.env.example`, Docker/deployment files.

**Audit issues to verify and fix:**

1. A valid-looking but unknown GSTIN must **not** silently generate a synthetic financial profile in real-data mode. Return a useful `DATA_NOT_AVAILABLE` or a consent/upload invitation, not a fabricated score. Demo profiles may remain as an explicitly labelled, separate demo mode.
2. The AgamiAI bank statement and income tax datasets are tagged **synthetic** on the upstream Hugging Face dataset pages. Correct any misleading README, UI, deployment or deck claim that they are verified real bank/customer data. Keep attribution and license notices.
3. Existing approval labels may be generated from synthetic heuristics. A model trained to imitate synthetic approval rules is **not** a model validated on actual loan approval/default outcomes.
4. Check the logistic regression training implementation and evaluation split. Never train on data subsequently reported as held-out evaluation, including through duplicated entities, time leakage or test-set-derived preprocessing. Fix any leakage.
5. Inspect fake bank quotes and OCEN `.example` endpoints. Label sandbox/demo flows accurately and remove misleading claims of sanctioned or pre-qualified offers.
6. Inspect hardcoded OTP, lender credentials and unsafe session cookies. Replace with safe development mode and proper authenticated, authorized server-side access.
7. Temporary process-local files under `/tmp` are not reliable multi-instance persistence. Replace mutable business/consent/session/model metadata with persistent storage or explicitly ephemeral-only demo storage; no fake persistence claims.
8. Check for sensitive data in API responses, browser console logs, git-tracked fixtures, analytics and error messages.

Create a concise **baseline inventory**: existing features worth keeping, broken/inaccurate behaviors, security risks, database decisions, frontend routes, tests and build status.

## 2. FINANCIAL & ETHICAL PRODUCT REQUIREMENTS

### The core problem

Traditional MSME underwriting may depend on documents and bureau histories that new-to-credit and new-to-bank businesses often lack. Finnese should transform **authorized, provenance-tracked economic activity** into understandable financial-health evidence, with uncertainty and human review.

### Crucial distinctions to enforce in code and UI

- **Financial Health Score (0–1000):** an internally defined, explainable descriptive index. **Not a CIBIL score** and **not a calibrated probability of default**.
- **Evidence Coverage:** share of applicable requested/possible evidence available and usable. **Not statistical prediction confidence.**
- **Data Quality/Trust:** validation, recency, source authentication, completeness, consistency and verification status. An uploaded CSV is not inherently independently verified.
- **Risk flags:** signals requiring investigation. **Not proof of fraud.**
- **Predicted default probability:** only display if a properly labelled, representative and calibrated model exists and is validated for its intended population and horizon. Otherwise display `Not available / not validated`.
- **Demonstration loan offer / sandbox journey:** clearly labelled illustrative, not a real bank commitment.
- **No-data:** present a neutral unavailable state; never silently replace missing evidence with high/low risk or synthetic values.
- **Fairness:** explain missingness, especially EPFO not applicable, cash-heavy businesses, seasonal businesses and low digital transaction volume. Avoid treating lack of a conventional record as automatic negative evidence.

Include on-screen wording that this is an informative prototype and does not replace lender underwriting. Use non-misleading terminology for risk and eligibility.

## 3. TARGET ARCHITECTURE — MINIMAL, MODULAR AND MAINTAINABLE

**Baseline recommendation (adapt to repo after inspection):**

- Retain **Next.js + React + TypeScript + Tailwind + Framer Motion** as primary application. Avoid unneeded redesign/migration.
- Keep the current deterministic TypeScript score engine as an explainable baseline, refactor it behind stable typed interfaces.
- Keep the current TypeScript logistic regression for continuity, but correct the dataset, labeling and evaluation flow. Optionally add a **Python modelling workspace** (`ml/` with scikit-learn, pandas, numpy; optional XGBoost/LightGBM) if it materially improves reproducibility and validation. Do not force a long-running Python inference service unless necessary.
- Use **PostgreSQL** for user-owned business, finance, consent, assessment, session and audit data. Prefer a migration-managed ORM such as Prisma or Drizzle (choose one, justify, document). Local development via Docker Compose.
- Use encrypted or access-controlled local object storage for document files in development, with an abstract object-store interface for cloud storage. Do not put raw financial documents in public static assets.
- Use **HTTP/REST** for ingest, provider requests and inference. Use **SSE** for import/analysis progress and status; WebSockets only if genuine bidirectional real-time needs justify the operational complexity. **Never retrain on every user request.**
- RAG: use provider documents, explainability notes, financial guides and authorized tenant documents. Prefer PostgreSQL full-text search first; introduce **pgvector** if semantic retrieval produces demonstrably better results. Scope every retrieval by tenant and access permissions.
- Use existing Gemini integration when an API key is present, otherwise show a graceful explanatory fallback. Keep key access server-side. No LLM calculations for money when deterministic code can calculate them.
- Use local **Mailpit** or equivalent inbox for developer OTP. Do not publicly expose it.
- Avoid Kubernetes, Kafka, Redis, graph DB, extra model servers or new paid dependencies unless justified by measured need.

### Suggested folders (adapt rather than blindly create duplicates)

```text
src/
  app/
    dashboard/                  # expanded Health Card
    lender/                     # authorized lender review
    data-sources/               # upload / consent / verification
    fraud/                      # review alerts and evidence
    copilot/                    # AI financial assistant
    simulator/                  # digital twin stress test
    api/
      auth/ data-sources/ ingest/ health-card/ assessments/
      fraud/ copilot/ scenarios/ events/ models/ integrations/
  lib/
    auth/ security/ db/
    providers/                  # provider interfaces and adapters
    ingestion/ normalization/ reconciliation/
    finance/ features/ scoring/ explainability/
    fraud/ forecast/ loans/
    ai/ rag/ tools/
    ml/                          # TS model interface and inference
    consent/ audit/
  components/
    finance/ sources/ fraud/ copilot/ simulations/
  data/demo/                     # unmistakably synthetic fixtures
ml/                              # OPTIONAL offline Python evaluation
prisma/ or db/migrations/
scripts/
tests/
docs/
compose.yaml
.env.example
```

Document data flow clearly:

```text
Verified/authorized provider OR user upload OR labelled synthetic fixture
    -> identity + access check -> schema validation -> data normalization
    -> provenance + deduplication + entity resolution -> persistent records
    -> financial feature extraction -> baseline health score
    -> anomaly / reconciliation checks -> risk and coverage metrics
    -> model inference (only for a validated use case)
    -> evidence-backed Health Card, copilot and digital twin
    -> optional sandbox OCEN/ULI-compatible journey
```

## 4. CANONICAL DATA MODEL AND SECURITY BOUNDARIES

Design migrations with appropriate constraints, indices, retention metadata and ownership relationships. Include at least these logical entities (actual names may differ):

- `User`, `Role`, `Organization`, `OrganizationMembership`, `BusinessProfile`.
- `DataSourceConnection` (`UPLOAD`, `SYNTHETIC_DEMO`, `SANDBOX`, `PARTNER_API`, `VERIFIED_PARTNER` as carefully defined), provider ID, last refresh, last error, credential reference, status.
- `ConsentRecord`: purpose, data categories, grant/expiry/revocation timestamps, actor, scope, provider reference, version. Revocation blocks future data use/refresh; implement deletion/retention behavior per data agreement.
- `FinancialAccount`, `Transaction` (event ID, account, dates, direction, amount in integer paise, currency, description, counterparty, category, category confidence, status, source reference, dedupe hash).
- `GstPeriod` / `GstFiling`, `Invoice`, `InvoiceLine` where needed, `Customer`, `Supplier`, `UtilityBill`, `UtilityPayment`, optionally `PayrollAggregate`.
- `IngestionJob`, `IngestionError`, `DataQualityIssue`, `ReconciliationMatch`, `SourceEvidence` (origin/provider, raw record pointer, observed_at, imported_at, verification level, transformations, hash).
- `FeatureSnapshot`: company, effective cutoff, as-of date, versioned feature values, missingness and source IDs.
- `ScoreSnapshot`: overall and subscores, version, coverage, risk notes, score-driver contributions, source flags, model/scheme version and timestamp.
- `AnomalyAlert`, `AlertEvidence`, `AlertReview` (reviewer, disposition, justification, timestamp).
- `TrainingDatasetVersion`, `ModelVersion`, `ModelEvaluation`, `PredictionLog` (without exposing sensitive raw data in logs).
- `LoanScenario`, `ScenarioResult`, optional `LoanApplication` and `DemoLenderQuote` with simulated/live status.
- `KnowledgeDocument`, `KnowledgeChunk` and access scope for RAG.
- `AuditEvent` for user login, consent changes, imports, assessments, anomaly review, model publishing and data export/deletion.

**Guardrails:**

- Use integer paise or exact decimal arithmetic for money; never casually sum money using binary floating point. Format INR correctly (`₹`, Indian digit grouping).
- All sensitive query paths must filter by tenant/business ownership and enforce role authorization **server-side**. Never trust a GSTIN query param as proof of ownership.
- Encrypt sensitive fields/objects appropriately, protect secrets and connection credentials, and keep real financial documents out of git.
- Implement input validation at API boundaries (e.g. Zod), reasonable upload size/type limits, anti-CSV formula injection on export, PDF processing safety, path traversal protection, anti-SSRF provider URL allowlists, rate limits and request timeouts.
- Provide a deletion/export story and safe retention defaults. Document how actual production storage/data-residency/legal review would be handled; don't claim blanket compliance.
- No real PAN, Aadhaar, UAN, phone number, passwords or OTPs in seeded fixtures or logs.

## 5. FEATURE ONE — REAL DATA INGESTION + VALIDATED FINANCIAL ML

### 5A. Data source pipeline

Implement an end-to-end ingestion feature:

1. User registers/opens a business profile and selects a source.
2. At minimum, supports a **CSV bank statement upload** with a mapping/preview step. Include varied sample header formats, ISO/Indian date handling, debit-credit columns, signed amount formats, duplicate rows, bank narration categories and balance reconciliation warnings.
3. Support user-uploaded invoices (CSV; PDFs optional only if extraction is tested and confidence is clearly shown). Provide at least one utility-bill import type.
4. Explicitly distinguish `USER_UPLOADED_UNVERIFIED`, `SANDBOX`, `SYNTHETIC_DEMO` and verified partner outputs in database and UI.
5. Validate file sizes, MIME vs actual file content, schema, ownership and record counts; show accepted/rejected/skipped rows with reasons and downloadable validation report.
6. Normalize dates, currency, transaction direction, account identity and counterparty names. Deduplicate idempotently across re-uploads using source IDs/fingerprints and review ambiguous duplicates.
7. Categorize money flows: business sale, customer refund, internal transfer, capital injection, loan disbursement, loan EMI, supplier payment, salary, tax, utility, fees, unknown. Mark inferred categories with confidence and allow human correction.
8. **Do not equate all deposits with revenue.** Do not automatically count loan proceeds, owner transfers and refunds as sales.
9. Persist records and provenance; generate feature snapshots after a successful import.
10. Show meaningful progress through SSE and make failures resumable/retryable.
11. Unknown but structurally valid GSTIN => invitation to connect/upload data; **do not produce a synthetic business** unless user explicitly enters a labelled demo flow.

Implement a typed `FinancialDataProvider` interface with `listCapabilities`, `startConsentOrAuthorize`, `fetch`, `normalize`, `getStatus`, `disconnect/revoke` as appropriate. Build adapters for user upload, synthetic demo, and at least one documented sandbox/mock-provider contract. Implement partner adapter skeletons for AA/GST/utility with status guards and no invented access.

### 5B. Partner ecosystem strategy

- **AA:** support consent journey, status, expiration/revocation and a sandbox flow using public sandbox documentation where feasible. Production financial information requires actual eligibility/partners and user consent; never bypass these controls.
- **GST:** official/authorized data or user-provided return exports only. No credential harvesting, scraping, captcha bypass or unauthorized bulk GSTIN queries. GSTIN checksum verifies format, not sales truth or ownership.
- **UPI:** derive UPI activity from consented bank records or authorized provider data; do not assume a public API exposes arbitrary accounts.
- **EPFO:** aggregate only authorized/applicable data. Absent EPFO coverage is `NOT_APPLICABLE` or `UNAVAILABLE`, not automatic noncompliance.
- **ULI / OCEN:** retain existing demo contract, build correct versioned API interfaces, consent/status tracking and labelled sandbox flows. No live lender integrations without authorization.
- Make provider configuration via `.env.example`; avoid requiring premium APIs to run tests.

### 5C. Deterministic financial feature engine

Calculate (with sufficient supporting input and explicit missingness):

- Monthly business revenue and trend; rolling 3/6/12 month totals.
- Revenue variability (coefficient of variation when mathematically valid), negative growth, seasonality indicators, inflow/outflow ratios.
- Operational cash surplus/deficit from categorized transactions; closing cash, minimum balance, days of cash buffer (with assumptions disclosed).
- Distinct active customers/suppliers; top-1/top-3 concentration; repeated counterparties; transaction counts and ticket sizes.
- Invoice ageing; DSO/DPO approximations if invoice and matching dates support them; unpaid receivables, overdue ratios.
- GST reported-sales pattern, late-filing indicator (only if authorized records), reconciliation gap with bank collections allowing timing and channel mismatches.
- Financial ratios: net margin/EBITDA/DSCR/debt-to-equity/current ratio **only when required financial inputs exist**; otherwise `UNAVAILABLE`, not zeros or guessed denominators.
- Utility payment timeliness and stability; only use where relevant, consistently observed and sufficiently reliable.
- Data recency and source coverage by applicable source type.

Unit test every formula and edge case (zero denominators, negative revenue, repeated months, partial periods, multiple accounts, currency mismatch, bank transfers, no invoices).

### 5D. Offline training vs online inference — NON-NEGOTIABLE

The current repo contains a TypeScript logistic regression and a synthetic-labelled retrain. Refactor instead of falsely presenting it as genuine credit-risk prediction.

**Training must be a separate reproducible workflow**, NOT triggered by every user input. Use commands such as:

```bash
npm run ml:train:demo
npm run ml:evaluate
npm run ml:inference:smoke
# If a Python pipeline is chosen:
python -m ml.train --config ml/configs/demo.yaml
python -m ml.evaluate --model path/to/model --split test
```

Choose exact commands after examining the repo. Use a versioned artifact containing: feature schema/order, imputers/scalers fitted only on training data, model parameters, target definition, training data hash/source/license, dataset size, split logic, created timestamp, metrics, training seed and model version. Do not allow an incompatible input feature version at inference time.

**Crucial label strategy:**

- Data with synthetic transactions but no real repayment labels can support parsing, analytics, stress testing and **synthetic demo experiments**, not credible real-world default prediction.
- Source a **legally redistributable and clearly documented labelled historical credit dataset** for modelling practice (e.g. UCI South German Credit, subject to terms). Another option is a permitted downloaded consumer default dataset. Record provenance, license and population mismatch.
- If data are consumer/foreign-market rather than Indian MSME, restrict conclusions: the model is for **methodology demonstration only**. Never claim it is validated for Indian NTC MSMEs.
- If no valid real MSME repayment outcome labels are available, **do not display a real PD, default prediction or automated approval**. Use the transparent rules-based Financial Health Score and show model status `DEMO_ONLY / NOT_VALIDATED`.
- Synthetic approval labels created from heuristics must be conspicuously labelled as synthetic and kept separate from ground-truth labels.

**Evaluation requirements:**

- Define target precisely (e.g. `90+ DPD within next 12 months` if labels and horizons actually support it). No vague `approved=yes` target if claiming defaults.
- Split train/validation/test **before** preprocessing, scaling, augmentation, feature selection and tuning. Hold out the same borrowers/businesses across splits; where historical timestamps exist, use time-based out-of-time testing. Guard against multiple accounts from the same entity leaking into other splits.
- Baseline: logistic regression with documented regularization, stable preprocessing and class-imbalance treatment. Optional tree ensembles only if dataset size and evaluation justify them.
- Report AUROC, AUPRC/PR-AUC, precision, recall, false positive/negative rates at a specified threshold, confusion matrix, class prevalence, calibration curve/Brier score where applicable, and performance by segment when sample counts allow. Use confidence intervals where supportable. Don't overclaim from tiny samples.
- Compare against simple baselines, prevent overfitting and hyperparameter selection on test data, and pin random seeds.
- Include a model card (`docs/MODEL_CARD.md`) with intended use, target, training source, limitations, fairness concerns, monitoring needs and explicit prohibition of autonomous lending decisions.
- **Publish candidate models only after validation** and an explicit version selection. Retain older versions for reproducibility. Model inference should be fast, deterministic given fixed features/model, and request-local.
- Explain features with model coefficients for logistic regression or SHAP if necessary/verified. Differentiate model attributions from the deterministic health-score component contributions.
- Optional monitoring for input drift, missingness, out-of-distribution sources, and stale models. Trigger retraining as a controlled admin/offline job, not per borrower input.

## 6. FEATURE TWO — UTILITY AND ALTERNATIVE-DATA INTELLIGENCE

Create a modular data coverage and reconciliation system supporting:

- Bank transaction/UPI evidence (from uploads/authorized partners).
- GST filings or authorized exported summaries.
- Customer and supplier invoices/receivables/payables.
- Electricity bills and proof of payments (first-class utility example).
- Optional water/internet bills, POS sales, marketplace exports, payroll/EPFO aggregates, Udyam metadata when legally available.

Create `AlternativeDataProvider` adapters with source, permissions, schema, data quality, latest refresh, applicability and consent. Never infer trust from a provider's name alone. Provide onboarding instructions and labelled demo adapters where official credentials are unavailable.

**Reconciliation pipeline:**

- Match invoice identifiers, counterparties, dates and net/gross amounts with configurable tolerances and GST treatment.
- Compare GST-declared sales with bank-identified business receipts **over aligned periods**, flagging timing, credit sales, cash settlements, refunds and multi-account coverage as possible explanations.
- Explain unmatched items and allow reviewer confirmation/corrections with audit log, without overwriting original source facts.
- Utility bill payment: compare bill amount, due date, payment date and dispute status; show `not applicable`, `missing`, `late`, `on-time` distinctly.
- Evidence completeness/quality dashboard showing each source's origin (`synthetic`, `uploaded`, `sandbox`, `verified`), coverage time, freshness, missing values, extraction confidence and last-sync errors.

Tests must cover contradictory data, off-by-one months, INR rounding, unpaid invoices, two payments against one invoice, duplicate re-uploads, mixed UPI/bank channel records and legitimate cash receipts not matched to a bank transaction.

## 7. FEATURE THREE — FINNESE TRUSTGUARD: FRAUD/ANOMALY/MANIPULATION REVIEW

Build a **review assistant**, not an automatic criminal accusation or automatic loan-rejection module.

### Detection levels

**Rules (ship first, fully test):**

1. Rapid repeated inflow/outflow of similar amounts with an apparently related counterparty.
2. Potential circular transfers among accounts **only to the extent all participating accounts are actually visible/authorized**. Do not infer an entire financial network from one person's statement.
3. Duplicate invoices or repeated financing claims for the same invoice ID; OCR/document fingerprints may assist but need verification.
4. Sudden turnover/volume spikes relative to the business's own baseline, considering seasonality.
5. Large number of reversals or payment failures, distinguishing `technical failure` from insufficient funds when reason code exists.
6. Unexplained GST vs receipts mismatch, with contextual caveats.
7. Very high buyer/supplier concentration.
8. Suspicious balance manipulation near reporting dates, only as an investigatory signal.

**Optional ML:** Isolation Forest or robust statistical anomaly scoring on a sufficiently documented dataset. Compare to the rule-only baseline. Label anomaly scores as anomaly scores, never calibrated fraud probability without verified fraud labels.

**Graph analysis:** create a transaction/counterparty graph from authorized records, run simple cycle finding and concentration graph metrics. Visualize only connected known accounts/counterparties; do not invent network edges or use cross-tenant data.

**Fraud alert payload should include:**

- Alert ID, rule ID/version, severity as triage priority, score (if applicable) and source type.
- Specific supporting transaction/invoice IDs, temporal window, amounts, counterparties masked appropriately, reason/evidence summary.
- Alternate plausible explanations and confidence limitations.
- Review status: `OPEN`, `UNDER_REVIEW`, `FALSE_POSITIVE`, `CONFIRMED_ISSUE` (or neutral `ESCALATED`), `RESOLVED`.
- Reviewer note, timestamps, audit history, ability to dismiss and correct future re-detection.

Build both a borrower-friendly anomaly page and an authorized lender/reviewer dashboard. Alert badges must not say “Fraud: 95% confirmed.” Optimize useful review and lower false-positive rates, and create tests for normal circular-looking business workflows (sweeps, refunds, payroll, internal transfers).

## 8. FEATURE FOUR — FINNESE COPILOT: RAG + TOOL-USING AGENT

Goal: a finance-specific assistant that can answer questions grounded in a business's **authorized** records and Finnese's calculations. Do not build a generic chat toy.

### User queries to support

- “Why did my score fall by 64 points this month? Cite the data.”
- “Which customers contribute the most revenue? How much is overdue?”
- “Do I have cash for a ₹5 lakh loan's illustrative EMI?”
- “Explain the three biggest risks and suggest measurable steps.”
- “Why did TrustGuard flag these transactions?”
- “What is DSCR, and what does my estimated DSCR mean?”
- “What happens if revenue drops 20% for three months?”

### Architecture

- `intent -> tenant auth -> approved read-only tool selection -> deterministic computation / scoped retrieval -> LLM synthesis -> evidence citations and limitations`
- RAG over vetted finance glossaries, app methodology, provider docs and optionally explicitly authorized user financial documents.
- Structured numerical data MUST come from permission-checked SQL/services and typed tools, not from vague vector retrieval alone.
- Suggested tools: `getHealthCard`, `getScoreDrivers`, `getSourceCoverage`, `getCashFlow`, `getOutstandingInvoices`, `getFraudAlerts`, `explainAnomaly`, `simulateLoan`, `searchKnowledgeBase`, `getModelStatus`.
- Validate arguments and permissions per tool. Explicit allowlist of tools. Rate-limit requests, bounded iterations/tool calls and time/cost budgets.
- Support evidence citations with source record IDs and human-readable links that respect permissions; never fabricate a citation.
- Defend against prompt injection in uploaded documents and retrieved text. Treat retrieved content as untrusted *data*, not instructions. Avoid arbitrary SQL, shell commands, URL fetching, file-system access, payment tools or hidden privileged actions.
- Read-only in V1. No loan approval, fund transfer, account alteration, document destruction, contacting third parties or loan submission through chat without additional authenticated product flows and explicit user confirmation.
- Enforce tenant isolation so user A cannot query user B's data. Avoid exposing private details in model prompts beyond necessary scope; document provider privacy implications and allow a no-LLM fallback.
- Where the model cannot support an answer, say so and identify missing source/data rather than hallucinating.

### UX

Build chat interface in borrower dashboard with suggested questions, markdown response, expandable evidence citations, tool-use activity (high-level), model disclaimer, feedback, error/retry handling, EN/HI capability if existing localization is adequate. Keep Telugu if present; do not regress existing support. Show clean local deterministic responses for key finance questions when LLM API is absent; clearly mark fallbacks.

### Evaluate

Test accuracy of numeric answers against known fixtures, cross-tenant leakage, prompt-injection resistance, missing-data cases, unsupported questions, fake-citation suppression and tool authorization.

## 9. FEATURE FIVE — CASH-FLOW DIGITAL TWIN & STRESS TESTS

Build a simulation engine that derives a simplified month-by-month financial state from normalized records and **clearly labelled assumptions**. Prioritize transparent accounting over flashy ML.

### Functional scope

- Baseline monthly inflow, outflow, opening/closing cash and outstanding receivables/payables for a specified business and lookback period.
- Working-capital metrics including approximate DSO/DPO/DIO/CCC only where required evidence exists.
- Deterministic scenarios: sales decline (0–50%), cost increase, customer payment delays, top-customer loss, seasonal demand variation, supplier payment acceleration and proposed additional loan with EMI.
- Calculate EMI with reducing-balance formula; support principal, annual rate, tenure, start date and optional fees. Clearly distinguish quoted APR, nominal interest, EMI and total borrowing cost.
- Show projected monthly cash balances, lowest balance, months with negative cash, potential liquidity gap, average cash buffer and illustrative repayment capacity/DSCR where inputs permit. Existing obligations must be accounted for when known; otherwise label exclusions.
- Compare baseline and stressed scenarios on an interactive chart. Use accessible sliders and number inputs, scenario presets, exportable results and assumptions panel.
- Provide explanatory output such as “At this assumed revenue decline and payment delay, the cash balance becomes negative in month 4,” not “loan will default.”
- Add a transparent, robust baseline forecast using historical average/seasonal naive/rolling trends with backtests if sufficient history; optional gradient boosting with lagged features **only after** demonstrating out-of-time predictive benefit and data sufficiency. No invented uncertainty bands. If there is inadequate history, show scenario-only mode instead of asserting forecasts.
- Link scenario actions to copilot tools and the Health Card; do not alter the stored historic financial facts or score with hypothetical scenario values.

### Formula examples

- Reducing balance EMI: `EMI = P*r*(1+r)^n / ((1+r)^n - 1)` for monthly interest rate `r`; handle `r=0` as `P/n`.
- Month end cash: `opening_cash + cash_receipts - cash_outflows - debt_service`, with invoice timing, loan disbursement and fees explicitly represented.
- DSCR: `cash flow available for debt service / debt service`, only when input definitions are sound and documented.

### Tests

Zero rate, short/long tenure, no-data months, negative opening cash, very delayed customer payments, existing loans, duplicate cash flows, month-boundary dates, extreme seasonality and consistency of chart numbers versus finance engine.

## 10. FEATURE SIX — DEV-ONLY LOCAL OTP + REAL AUTH FOUNDATIONS

Current hardcoded `DEMO_OTP = 123456` and weak demo authentication must be eliminated from production behavior.

### Local developer mode

- Add **Mailpit** to Docker Compose: development SMTP service (e.g. host `127.0.0.1:1025`) and web inbox (`http://127.0.0.1:8025`), accessible only locally.
- OTP request -> cryptographically strong 6-digit single-use code -> store only a hashed/HMAC-protected verifier in temporary server-side database with expiry, attempt count and rate limits -> send only to the **local Mailpit inbox in development** -> verify -> invalidate.
- Label UI “Development inbox” in dev mode; provide an explicit safe **Open local OTP inbox** link/button. Browser tabs cannot always be opened automatically after asynchronous responses due to popup blocking; implement click-initiated opening, not a brittle OS-specific hack.
- Environment-guard the local OTP transport: impossible to enable inadvertently in production. No OTP code in HTTP responses or frontend console logs.
- Do not call WhatsApp, SMS gateways or real emails in dev mode. Implement `OtpDeliveryProvider` interface for future authorized transport.

### Security foundations

- Server-side session management or properly signed/session-managed auth library compatible with checked project; HttpOnly, Secure in HTTPS, SameSite cookies, CSRF protection for relevant mutations, expiration and logout.
- Borrower/lender/admin authorization, business-owner linking, server-side resource checks, hashed passwords if passwords are kept, appropriate lockout/rate limiting and audit logging.
- Secrets only in server environment; update `.env.example` with nonsecret placeholders and document configuration.
- Add negative tests for brute force, expired/reused code, cross-account access and exposure of the dev transport in production mode.

## 11. EXPLAINABLE FINANCIAL HEALTH CARD — CROSS-CUTTING REQUIREMENT

Extend the existing 0–1000 system, don't silently replace it with an opaque ML output.

### Score components

Existing system to verify:
- Revenue Stability 30%
- Compliance 25%
- Counterparty Risk 25%
- Growth Momentum 20%

Maintain baseline compatibility or make a deliberate documented versioned revision. The score must be a reproducible deterministic function with a `scoring_version` and timestamp.

**Handle missing data correctly:**

- Show `NOT_APPLICABLE`, `MISSING`, `STALE`, `UNVERIFIED`, `VERIFIED` states.
- Never fill absent GST, EPFO, DSCR or utility data with fabricated values. If dynamically reweighting components, document exactly how and display coverage; avoid an inflated score from a single remaining component. Consider withholding score when below a justified minimum evidence threshold.
- Explain absolute score changes using deterministic per-component contributions so contributions sum to actual delta (within rounding). Do not attribute an exact numeric score movement to an LLM-generated narrative.
- Show recent vs prior comparable time periods, data cutoffs, confidence/coverage limitations and top sources of risk.
- Include a visible banner for `Synthetic demo`, `User-uploaded, unverified`, `Sandbox`, or `Verified partner` as appropriate.
- Each score driver has a drill-down to underlying source records (authorized and masked appropriately).
- Add owner-facing improvement recommendations: diversify customers, shorten invoice collection days, improve available cash buffer, reconcile mismatched receipts, review overdue utility payments **only when source evidence supports it**. No guaranteed credit approvals.

### UI must include

1. Overall score ring, 4 dimension charts and comparable period movement.
2. Evidence coverage + source status (not falsely described as statistical confidence).
3. Top strengths, risks, and unobserved/insufficient evidence.
4. Financial metrics with definitions/tooltips, source citations, last updated and as-of date.
5. Alerts + review state, cash-flow forecast/scenario link, and copilot context link.
6. Human-friendly plain-language explanations in English and Hindi at minimum; retain existing supported language options if feasible.
7. Lender view: reason codes and evidence review; no autonomous final decision.

## 12. INDIAN FINTECH INTEGRATION CONTRACTS

Build interfaces and clearly labelled integration levels for:

- **AA / FIP / FIU:** consent request/status/expiry/revocation, provider session, fetch status, financial data schemas; sandbox adapter if feasible with documented prerequisites.
- **ULI:** data service adapter placeholders/schema maps and approved onboarding path; do not assert public arbitrary lookup of financial data.
- **OCEN:** loan agent workflow of application, lender discovery, offer, accepted terms and status updates **as simulated/sandbox unless a real participant integration exists**.
- **GST/GSTN:** user-provided data and authorized APIs; no scraping or circumvention.
- **BBPS/Bharat Connect utility providers:** potential future adapters for authorized bill/payment history, not unrestricted consumer bill surveillance.

If fake bank quotes exist (IDBI/SBI/HDFC), change them to named `Illustrative lender profiles` unless real, verifiable lender participation is documented. Include terms disclosure for any comparison: illustrative APR, fees, EMI, total repayment, assumptions, date and `not an offer` label.

Provider health UI should show `CONNECTED`, `SANDBOX`, `UPLOAD_ONLY`, `CONFIGURATION_REQUIRED`, `UNAVAILABLE`, not “Live” without evidence.

## 13. UX / PRODUCT DESIGN REQUIREMENTS

Build a coherent experience for a beginner MSME owner:

**Borrower flow:** register/verify appropriately -> create business -> connect/upload source -> import review -> evidence dashboard -> Health Card -> anomaly review -> chatbot -> scenario -> optional demo loan journey.

**Lender flow:** authorized workspace -> pipeline overview -> applicant with approved access -> evidence and data-quality review -> risk/anomaly triage -> model/methodology explanation -> decision notes. Lender must not be able to access data of applicants who haven't shared/authorized it.

**Admin/developer flow:** dataset + adapter status, ingestion jobs, ML model registry and metrics, synthetic demo mode switch only in development, Mailpit link only in development.

Keep current styling identity unless a clear defect warrants change. Use sensible typography, readable charts, explicit empty states, loading skeletons, responsive cards and keyboard accessibility. Respect reduced motion. Avoid AI-looking generic gradients and excessive animations. Let metrics be the visual focus.

Make demo fixtures compelling:
- `Healthy NTC retail business` with stable UPI receipts and no bureau history.
- `Cash-strapped but profitable manufacturer` with late receivables and low liquidity.
- `Suspicious activity demonstration` with clearly synthetic circular transfers and mismatches, and at least one false-positive example.

All synthetic fixture data must be fictional, non-identifying and prominently marked as DEMO. Explain why the businesses differ and show data provenance.

## 14. API DESIGN + ERROR CONTRACTS

Design typed endpoints, respecting existing route names when possible:

```text
POST /api/businesses
GET  /api/businesses/:id
POST /api/ingest/upload
GET  /api/ingest/jobs/:id
GET  /api/ingest/jobs/:id/events     # SSE progress
GET  /api/businesses/:id/sources
POST /api/businesses/:id/assessments
GET  /api/businesses/:id/health-card
GET  /api/businesses/:id/score-history
GET  /api/businesses/:id/anomalies
POST /api/anomalies/:id/review
POST /api/businesses/:id/scenarios
POST /api/copilot/chat
GET  /api/ml/models/current
POST /api/auth/request-otp
POST /api/auth/verify-otp
```

Exact endpoint names are examples, not mandates. Keep routing idiomatic to Next.js and ensure auth on each endpoint. For ingestion jobs and assessments use idempotency keys or transaction-safe generation to prevent repeated imports.

Use a consistent response structure with typed errors: `VALIDATION_ERROR`, `AUTH_REQUIRED`, `FORBIDDEN`, `DATA_NOT_AVAILABLE`, `CONSENT_REQUIRED`, `SOURCE_UNVERIFIED`, `INSUFFICIENT_DATA`, `PROVIDER_UNAVAILABLE`, `MODEL_NOT_VALIDATED`, and safe 5xx handling. Do not leak stack traces or secrets to users.

## 15. TESTS, FINANCIAL VALIDATION AND PERFORMANCE

Build automated checks at multiple levels:

- Unit: GSTIN validation, money arithmetic, EMI, DSCR, CCC, revenue classification, reconciliation, score weighting/changes, evidence coverage, anomaly rules, graph detection, model feature order, OTP expiry/reuse.
- Integration: CSV -> normalized rows -> DB -> feature snapshot -> score -> dashboard; invoices/utility -> cross-source review; Mailpit OTP -> session -> protected assessment; copilot tool -> tenant-restricted data.
- End-to-end (Playwright or existing equivalent): three fictional MSMEs, missing data, good/bad upload, fraud review, scenario sliders, local OTP, copilot fallback, mobile viewport.
- Security: cross-tenant reference attacks, valid-looking unknown GSTIN, unauthenticated GET, rate limits, untrusted document prompt injection, provider SSRF, large file upload, deletion/revocation, production OTP service exposure.
- ML: reproducibility, no entity leakage, no future features, preprocessor fit only on train, model version integrity, calibrated metrics where labels permit, withheld test set, refusal to claim PD in demo-only mode.
- Finance: monetary values and aggregates reconcile; user interface and charts show the same values as the backend; no accidental double counting of internal transfers, loan disbursements, refunded sales or duplicate transactions.

Provide realistic performance targets to monitor rather than fabricated benchmarks. Aim for quick interactive assessment on small datasets, stream long-running ingestion tasks, and avoid synchronous model retraining on UI requests. Benchmark in the actual environment and report measured results only.

Add CI or a documented single script running lint, types, unit tests, integration tests, build and smoke test. Repair test failures. Do not silently mark a broken test as skipped.

## 16. SECURITY, COMPLIANCE AND DEPLOYMENT READINESS

- Follow a privacy-by-design, data-minimizing implementation. Verify current applicable RBI digital-lending directions and related guidance rather than asserting legal compliance without review. Consider institution and licensed-partner obligations, consent, data retention, borrower disclosure, grievance channels and where data may be stored; legal counsel and partner approval are required for real financial data deployment.
- Do not scrape protected data, retrieve other people's credit records, bypass provider consent, imitate a bureau score, or represent sample data as verified.
- Data residency: provide a configurable deployment region and recommendations for compliant storage; do not hardcode a regulatory claim without verification.
- Do not commit `.env`, secrets, real bank statements, PII or license-restricted datasets. Check `.gitignore` and secrets exposure.
- Supply `compose.yaml` for PostgreSQL and Mailpit plus app instructions. Existing Docker/Cloud Run deployment should continue to work where feasible; document environment-specific configuration and tradeoffs.
- Add a health endpoint and structured non-sensitive audit/operational logs. Use migrations and robust startup configuration validation.
- Document which gaps prevent production release: audits, provider agreements, legal review, security penetration testing, model validation using representative labels, privacy review and lender approval.

## 17. PHASED IMPLEMENTATION ORDER — DO NOT STOP AFTER PLANNING

### Phase 0 — Inspect, baseline, plan

- Record git status and package/test state; preserve uncommitted work.
- Map existing components and broken claims.
- Produce `docs/FINNESE_2_IMPLEMENTATION_PLAN.md` with exact files to change and checklist.
- Correct high-risk misleading demo terminology immediately.

**Acceptance:** app still runs; baseline documented; no uncommitted user work lost.

### Phase 1 — Secure foundation and real data

- Add PostgreSQL + migrations, role/ownership model, dev OTP + Mailpit, secure session, upload pipeline, source provenance, no unknown GSTIN synthesis in real mode.
- Implement bank CSV imports and deterministic transaction categorization.
- Preserve demo fixtures behind explicit demo mode.

**Acceptance:** owner logs in locally, receives OTP in Mailpit, uploads fictional statement, reviews import, sees stored financial metrics, and cannot see another business's records.

### Phase 2 — Health Card + alternate data

- Implement source coverage, invoice and electricity bill support, reconciliation, score snapshots/compare, score drivers and evidence links.
- At least one functional sandbox adapter if feasible; otherwise provider interface + tested simulator + accurate status.

**Acceptance:** uploaded data drives score and flags; missing data remains missing; re-upload does not double count; changed input yields reproducible score delta.

### Phase 3 — Fraud intelligence + digital twin

- Implement rule-based TrustGuard with graph/counterparty subset and review workflow; optional anomaly baseline.
- Implement validated finance formulas and interactive cash-flow stress-testing UI.

**Acceptance:** seeded synthetic suspicious ring creates an investigatory alert, legitimate transfer case does not get falsely marked confirmed; scenarios calculate consistent cash/EMI outcomes and are reproducible.

### Phase 4 — AI copilot + ML validation

- Implement permission-checked read-only finance tools, RAG, citations, LLM fallback and adversarial tests.
- Refactor TypeScript model workflow; create offline trainer, rigorous evaluation, model registry and truthful demo-only status when lacking suitable labels.

**Acceptance:** user asks why score changed and receives record-backed response; cross-tenant request fails; trained model can be reproduced, evaluated on untouched holdout, and refuses unsupported PD claims.

### Phase 5 — Lending sandbox, UX, release package

- Integrate demo OCEN/ULI-style flows with truthful status, enhance lender view, improve UI accessibility/mobile experience.
- Run complete checks, fix errors, create demo and architecture docs, measure performance and list production blockers.

**Acceptance:** complete documented demo from NTC signup through evidence -> score -> anomaly -> copilot -> stress test -> simulated loan journey, without fabricated integration or security claims.

If time/tool budget is constrained, maximize **completed tested vertical slices** in this order: phase 1, phase 2, phase 3, phase 4, phase 5. Never claim unfinished features are implemented. Keep a detailed remaining-work checklist and explicit blockers.

## 18. REQUIRED DELIVERABLES

At the end of the implementation, provide **actual edited source code**, migrations, tests and documentation. The following files or equivalents should exist:

- `docs/FINNESE_2_IMPLEMENTATION_PLAN.md`
- `docs/ARCHITECTURE_V2.md` with data-flow and deployment diagrams
- `docs/DATA_SOURCES.md` — provenance, source status, upload vs sandbox vs production, licenses and partner prerequisites
- `docs/SCORING_METHODOLOGY.md` — exact formulas, thresholds, weight handling, missingness and sample calculations
- `docs/MODEL_CARD.md` + `docs/ML_TRAINING.md` — labels, dataset, splits, leakage prevention, metrics and limitations
- `docs/SECURITY_AND_PRIVACY.md` — permissions, consent, encryption, retention, OTP, deployment considerations
- `docs/TESTING.md` — commands and test coverage summary
- `docs/HACKATHON_DEMO.md` — 5–7 minute script with pre-seeded fictional businesses, screenshots/flows and honest claims
- Updated `README.md` — setup, screenshot guide, architecture, feature status, environment variables, caveats, credits to original author and datasets
- `.env.example`, `compose.yaml`, tested migrations, relevant scripts and automated tests.

### Acceptance demonstration

A new developer should be able to:

1. Clone repository, install dependencies, start Docker Compose and app with documented commands.
2. Open local OTP inbox, sign in, and create a business without real credentials.
3. Select a synthetic demo business or upload a sample bank CSV and other alternative-data evidence.
4. Watch source ingestion status, inspect source provenance, and get a reproducible Health Card.
5. Open an anomaly and see the actual underlying fictional transactions and review options.
6. Ask copilot to explain a metric/score movement and get accurate citations without accessing another business.
7. Simulate a revenue decline and delayed collections, see cash balance and illustrative EMI change correctly.
8. Follow a clearly marked simulated loan workflow.
9. Run offline ML evaluation and inspect an honest model card including data limitations.
10. Run the automated test suite successfully.

### Final status report format

Return a concise but complete final engineering report:

```text
FINNESE 2.0 IMPLEMENTATION REPORT
- Branch and working tree status:
- Features fully implemented (with changed file paths):
- Features partially implemented / blockers:
- Architecture decisions and why:
- Data sources / provider access status:
- ML target, label source, split, metrics, validation caveats:
- Security protections and remaining production blockers:
- Exact local startup commands:
- Test commands executed, passes and failures:
- 5-minute demo steps:
- Next three highest-priority improvements:
```

**Start by auditing the repository and writing the implementation plan, then immediately begin Phase 1. Continue to subsequent phases as far as possible in this working session. Do not respond with only a roadmap. Make real working changes and verify them.**

---

## 19. VERIFIED REFERENCE STARTING POINTS (DO NOT HARD-CODE API ASSUMPTIONS)

- Finnese repository: https://github.com/NmnK007/Finnese
- AgamiAI synthetic bank statements: https://huggingface.co/datasets/AgamiAI/Indian-Bank-Statements
- AgamiAI synthetic ITRs: https://huggingface.co/datasets/AgamiAI/Indian-Income-Tax-Returns
- UCI South German Credit dataset: https://archive.ics.uci.edu/dataset/573/south+german+credit
- Finvu sandbox guide: https://finvu.github.io/sandbox/
- Finvu developer docs: https://docs.finvu.in/
- RBI Digital Lending Directions, 2025: https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12848

These are starting references, not guarantees of free credentials, unrestricted record access, current production API terms or data suitable for real MSME default modelling. Verify official documentation and current legal/technical prerequisites before integration.
