# Scoring and financial calculations

The bank-only dashboard continues to withhold a score. `/intelligence` adds `evidence-health-v2`, an internal descriptive index using authorized uploaded invoices, filings and bank records. It is not a validated credit model. Default probability is always null.

## Evidence Health Card v2

Cutoff is the server's current UTC date. Invoice months are completed calendar months observed within the preceding 365 days. At least three consecutive observed invoice months are required; missing months are never populated with zero. A source older than 120 days is stale. Source coverage is the fraction of four source types present and fresh, not confidence in a prediction. Uploaded sources remain unverified.

For observed monthly gross sales invoice amounts, let mean be μ and population standard deviation σ; CV = σ/μ. Scores are rounded and clipped to [0,1000]:

- Revenue stability (30%): 1000 × (1 − 2.5 × CV).
- Filing/payment timeliness (25%): at least three GST periods due by cutoff; 1000 × on-time filing fraction. When undisputed utility bills are due, use 80% GST fraction + 20% fully paid-on-time utility fraction. Missing utility is omitted, not scored zero. Missing EPFO creates no penalty.
- Customer diversification (25%): 1000 × (1 − largest buyer share of recent gross invoice sales). Buyer labels are case-normalized owner declarations, not verified entity resolution.
- Observed sales growth (20%): 1000 × (growth + 0.30)/1.10, where growth = (last observed month − first)/first. Also requires fresh bank evidence. This is endpoint change, not annualized growth or a calibrated forecast.

Overall = round(0.30R + 0.25C + 0.25D + 0.20G). All four dimensions must be available; no reweighting or imputation is performed. A missing score remains null. Example: dimension values 600/800/500/700 give 645 overall. Saving identical inputs reuses a version/hash/cutoff snapshot. Changed inputs create another snapshot. Weighted dimension deltas explain changes; total rounding can differ by less than one point. Snapshot results depending on revoked/expired evidence are excluded from subsequent reads.

Invoice matching uses exact case-insensitive invoice reference, payment direction, date on/after issue and gross amount within one paise; split payments are summed. Matches are suggestions requiring review; comments do not rewrite source records. Outstanding amounts use owner-reported paid totals, not inferred payment status. Cash settlements, TDS, GST and missing accounts may explain unmatched items. GST gap compares declared sales and classified bank receipts over the same calendar month, with cash/accrual caveats. A separate review-only matching panel now accepts 0–10,000 paise tolerance, a 1–180 day window and 0–30% assumed withholding. Optional matching requires at least two counterparty tokens in narration; it is explicitly low confidence. It does not assert GST treatment, verify identities, assign payments uniquely or alter stored source facts/Health Card matches.

Utility status distinguishes disputed, not due, overdue, late and fully paid on time. Missing sources are shown separately; a general not-applicable selector is pending. These heuristics are transparent prototype assumptions, not empirical credit-risk validation.

## Cash scenarios

For each month: closing cash = prior cash + receipts − costs − debt service + loan disbursement − upfront fees. Both baseline and stressed paths include the proposed loan. Stressed receipts = round(baseline receipts × (1 − decline/100)); stressed costs = round(costs × (1 + increase/100)). Whole-month collection delays shift receipts; pre-start collections are not invented. Suggested inputs are means of supplied completed-month records and may be incomplete.

EMI = round(P × r / (1 − (1+r)^−n)), r = nominal annual basis points / 120000; at zero rate use round(P/n). All returned money is integer paise and cash totals use checked exact sums. Displayed total repayment = EMI × tenure + fees; rounding may affect the true final installment. This is illustrative arithmetic and nominal rate is not APR. DSCR = (stressed monthly receipts − operating costs)/(existing debt + proposed EMI), only with positive debt and user acknowledgement that obligations are complete; otherwise unavailable. It is a steady-state illustrative ratio, not a per-month debt coverage guarantee during collection delay.

Implemented `cash-metrics-v1` calculations:

- Inflow: sum of positive transaction paise; outflow: absolute sum of negative paise.
- Net movement: signed sum of paise. This is movement over supplied records, not a verified closing balance or profit.
- Classified sales receipts: positive rows categorized BUSINESS_SALE. These are cash collections, not accrual revenue.
- Customer refunds: absolute negative rows categorized CUSTOMER_REFUND, shown separately from sales receipts.
- Monthly buckets: transaction dates in the uploaded records. Missing months are absent, never inferred as zero; partial periods remain possible.
- Unknown count: records with no supported narration category. Loan proceeds, capital injections and internal transfers do not enter sales receipts.

Integer arithmetic is used for every monetary aggregation; sums use BigInt internally and reject values exceeding safe output precision. Each row is limited to 10^12 paise. No floating-point money is summed. Display conversion to rupees is presentation only.

The fictional sample has 12 rows: 10 accepted, one identical duplicate skipped and one impossible date rejected. Inflow is ₹2,05,750.50; outflow ₹36,500.25; net movement ₹1,69,250.25; classified sales receipts ₹55,000.50; customer refunds ₹1,000.00. These are automated-test expectations, not real business results.

The preserved **synthetic demonstration** uses the legacy score from `scoreEngine.ts`: revenue stability 30%, compliance 25%, counterparty 25%, growth 20%; each component is rounded to 0–1000, then the weighted sum is rounded. `scoreFromFactors` is deterministic and drives its simulator. Legacy nudge gains, score history, sector ranks and profile inputs are illustrative. Its EPFO assumptions and heuristic nudge estimates are unsuitable for the owner-data scoring contract and will not be reused without the Phase 2 missingness revision. The index is neither CIBIL nor probability of default.

## Additional scenario and review rules

Supplier delay applies only to stressed operating costs; before the lag, costs accrue but are not paid. At the horizon, outstanding supplier liabilities = stressed monthly costs × min(delay, scenario months). Extra inventory is a stress-only month-one cash investment; declared monthly cash tax is subtracted in both paths and in steady-state DSCR numerator. These are user assumptions, not inferred tax liabilities. Deferred costs are not profit or forgiven debt. Saved older scenarios without these fields retain zero defaults.

Visible-account cycle detection requires three accounts and all six posted records: each transfer has a unique exact reference, equal opposite amounts and dates within one day; cycle edges are chronologically ordered within three days. Ambiguous references or missing legs do not create edges. Treasury routing may be legitimate. Supplier concentration uses at least three purchase invoices and a >70% declared supplier share. The robust spike check requires six prior observed months and both latest >2× median and >median+3×1.4826×MAD. Nonconsecutive/partial observations and seasonality remain caveats. No reason code or financing claim is invented.
