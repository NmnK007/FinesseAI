# Team demo: evidence to simulated application

Use Docker Compose and the README startup commands. On Windows PowerShell use `npm.cmd`, which avoids the npm.ps1 execution-policy error. Run `npm.cmd run db:migrate` after pulling these changes so migrations 002–004 apply. All services remain off until you explicitly start them. No real financial records or credentials are required.

The examples use July–November 2026 periods. As the calendar advances, they intentionally become stale; adjust fictional dates coherently before a later demo. Do not remove freshness checks to manufacture a score.

## Seven-minute walkthrough

1. **0:00–1:00 — Owner and consent.** Open `/login/customer`, use `owner@finnese.test` and the real generated OTP in local Mailpit. Create “Fictional Demo Traders” at `/data-sources`. Upload `public/samples/fictional-bank.csv`. Show rejected/duplicate rows, category review and confirm. Explain cash collections versus loan/owner transfers.
2. **1:00–2:00 — Alternate evidence.** Open `/intelligence` from Health Card navigation. Import the supplied invoice, utility and GST CSV files, each with explicit consent and preview/confirmation. Show uploaded/unverified origin and provider configuration status.
3. **2:00–3:00 — Explain the card.** Save an assessment. Open component bars, source citations, coverage and missingness. Explain deterministic weights, no PD and no bureau score. For a delta, add a genuinely new fictional invoice record with a unique invoice_id, confirm and save again; repeated identical input reuses its snapshot.
4. **3:00–4:00 — Review evidence.** Show exact-reference reconciliation and an aligned GST cash/accrual gap. Open an available TrustGuard signal and its actual evidence IDs; record a justified review note. If no rule triggers, say so rather than manufacture an accusation. Show late/overdue/disputed utility states.
5. **4:00–5:00 — Copilot.** Ask “Why did my score change?”, “How much is overdue?” and “What is DSCR?”. Show read-only tool name and source citations. Explain local deterministic retrieval, not a connected general-purpose AI. Asking for another tenant or a loan approval cannot perform that action.
6. **5:00–6:00 — Cash stress.** Review suggested historical inputs; enter opening cash and known debt. Compare 20% sales decline, one-month collection delay and a proposed loan. Show baseline/stressed cash, loan disbursement/fees/EMI, negative cash months and DSCR acknowledgement. Save, reopen and export the scenario. These are user assumptions, not a guaranteed forecast.
7. **6:00–7:00 — Simulated loan.** Compare illustrative profiles, create a persistent draft, inspect terms and use “Simulate submission (nothing is sent)”. Show SIMULATED_SUBMISSION after refresh. No real lender receives anything.

## Optional reviewer demonstration

Sign in once as `reviewer@finnese.test`, then run:

```powershell
npm.cmd run demo:enroll-reviewer -- reviewer@finnese.test
```

Use a separate browser profile for the reviewer. Owner grants seven-day access in the lending panel. Reviewer opens `/lender` to inspect only the shared business and add a review note. Owner revokes access; the next reviewer request must fail. An already viewed page cannot be remotely erased.

## Evidence and shutdown

Run `npm.cmd run check` and `npm.cmd run ml:evaluate`. Show the model report's DEMO_ONLY status; never present generated-data metrics as genuine credit-risk performance. The new walkthrough has passed automated browser checks on the isolated test stack, including mobile overflow and input labels. Docker networking/native PostgreSQL and a full manual accessibility review still need verification.

Press Ctrl+C in the app terminal, then `docker compose down` to stop infrastructure while retaining the database volume. Do not use `down -v` unless you intend to erase local data.

## Additional features to show

- Start an invoice preview, reload the page, then use **Resume preview** and reaffirm consent before confirmation.
- Open **Explore matching tolerances and withholding assumptions**. Explain that low-confidence narration candidates are review suggestions, not verified identities or settlements.
- Enter extra inventory cash outlay, monthly tax and supplier payment delay in the simulator. Point out unpaid supplier liabilities at the horizon; delayed payment does not eliminate debt.
- Use **Export authorized evidence, assessments and scenarios (JSON)**. Revoked source facts and dependent results must be absent.
- Show the offline registry, integrity smoke and historical practice report. Never represent its weak consumer-credit baseline as validated MSME risk performance.
