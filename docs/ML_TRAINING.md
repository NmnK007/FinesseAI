# Offline model workflows

`npm.cmd run ml:train:demo` reproduces the legacy illustrative model artifact consumed only by the explicit development demo. `npm.cmd run ml:evaluate` runs the new separate methodology experiment and saves a content-addressed candidate JSON in `artifacts/models`. No paid API or downloaded data is used. Existing candidate versions are retained. Re-running identical code/data yields the same hash and weights. `npm.cmd run ml:inference:smoke` verifies the explicitly selected offline registry artifact without training.

The new experiment generates 4,000 unique fictional entity rows using seed 20261113. Labels are Bernoulli draws from an author-written six-feature logistic heuristic, not real approvals/defaults. Before fitting, rows split 2,400 train / 800 validation / 800 test. All features are generated in [0,1], with no fitted scaler or imputer. Duplicate entity IDs fail validation.

Fit logistic regression for 200 epochs at learning rate 0.3. Choose L2 penalty from 0.001/0.01/0.1 by validation Brier; intercept is not penalized. No class reweighting; threshold fixed at 0.5. Test rows never select parameters. Tests poison test features/labels and verify fitted weights and validation metrics remain identical.

Artifacts record target, source, seed, full dataset SHA256, feature order/version, split, parameters, weights, validation/test metrics, class-prior baseline, calibration bins and two amount-ratio segments. Metrics include tie-aware AUROC, stepwise average precision, precision/recall, false-positive/negative rates, confusion counts, prevalence, accuracy and Brier. Missing-class metrics are null. Average precision is not trapezoidal PR-AUC. Segments are diagnostics, not fairness evidence.

Candidates are explicitly OFFLINE_CANDIDATE_NOT_SELECTED_FOR_APP. They do not replace the committed legacy model, enter the owner Health Card, provide real PD or approve applications. The local registry provides explicit demo selection/rollback and integrity checks; it does not publish app models. Live drift monitoring, representative MSME labels, out-of-time validation and fairness evaluation remain unfinished.

## Registry and uncertainty

```powershell
npm.cmd run ml:registry -- status
npm.cmd run ml:registry -- select synthetic-methodology-v1-a5d87a02bbaa.json
npm.cmd run ml:registry -- rollback
npm.cmd run ml:inference:smoke
```

Selection gates artifact status/schema, usable validation metrics, valid weights and content hash. Hash-verified prior versions remain available. Selection history records timestamps and rollback selections. This is an OFFLINE DEMO registry: neither candidate is used in owner scoring or lending. The committed legacy demo remains independent. Range checks reject missing, non-finite or outside-[0,1] candidate inputs; this is an input guard, not ongoing population drift monitoring. Offline CLI selection assumes a single operator; distributed registry concurrency and signed artifact approval remain production work.

Reports now include approximate 95% percentile bootstrap intervals for accuracy/Brier from 500 seeded resamples. These describe variability within the supplied test sample only; they do not account for population mismatch, sampling design or all model-selection uncertainty.

## Historical practice evaluation

`npm.cmd run ml:evaluate:practice` verifies the pinned SHA256 of the licensed source, parses the documented kredit label (0=bad), and writes `artifacts/practice/south-german-v1.json`. See `data/practice/south-german/README.md` and `provenance.json` for UCI attribution and CC BY 4.0.

The baseline uses six declared numerical/ordinal predictors, excluding age/sex from fitting. Identical complete predictor vectors are grouped via SHA256, producing 604 training / 209 validation / 187 test rows. Means and standard deviations are fitted only on training rows. Regularization is selected on validation Brier; the test is untouched. Tests mutate test features/labels and verify fitted preprocessing, weights and validation remain identical. Real borrower identifiers and individual timestamps are unavailable, so true borrower grouping and out-of-time testing cannot be claimed.

Observed test recall at threshold 0.5 is approximately 8.5%, with 54 false negatives out of 59 bad-label cases. This weak baseline is disclosed, not tuned against the test afterward. The dataset's historical/foreign population and oversampling prevent real-population PD or Indian MSME validation. It is never eligible for the synthetic app registry or lending decisions.
