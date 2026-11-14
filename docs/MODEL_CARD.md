# Model status: DEMO_ONLY / NOT_VALIDATED

No representative Indian MSME repayment/default labels exist in this repository. There is no validated probability of default, autonomous approval, lender underwriting model or real lender participation.

The preserved TypeScript logistic regression fits seeded **synthetic approval heuristics** for three fictional lender profiles. These labels describe author-written rules, not observed approvals or defaults. AUC/accuracy on generated data measure reproduction of those rules only. They must not be quoted as credit-risk performance.

Online demo inference now reads a committed artifact with six-feature schema/version and seven weights; it does not retrain during a user request. The offline command `npm run ml:train:demo` generates 2,400 training samples and a separate 600-sample synthetic holdout per profile. Scaling uses fixed bounds, not fitted test statistics. This is a continuity demonstration, not the complete Phase 4 model lifecycle.

The separate legacy Agami trainer previously fit all rows before evaluating the first quarter. That direct leakage was removed: fitting uses the remaining rows only. It is not exposed as a public training endpoint, and prior reported metrics are withdrawn. Full entity-aware splitting, time cutoffs, model registry, calibration, dataset hashes, validation gates, fairness analysis and a complete evaluation suite remain Phase 4 work.

Permitted use: inspect a transparent modelling example on synthetic data. Prohibited use: credit decisions, creditworthiness claims, sanction odds, real default prediction, or claims that foreign/consumer practice datasets validate Indian NTC MSMEs. The owner-data workflow displays no model probability.

## New offline candidate experiment

`synthetic-methodology-v1` is an independent, reproducible DEMO_ONLY candidate. Its 2,400/800/800 disjoint generated entities support validation-only regularization selection and untouched test evaluation, with dataset hashes and a class-prior baseline. See ML_TRAINING.md for exact parameters and metric definitions. Synthetic metric values are persisted in the candidate artifact and MUST NOT be quoted as real credit-risk performance.

The candidate has no real historic dates, protected attributes, repeated borrowers or repayment outcomes. It cannot establish out-of-time performance, fairness, calibration for actual businesses or regulatory suitability. It is not selected for application inference. The requested historical practice dataset is now acquired with verified UCI CC BY 4.0 attribution, source checksum and a separate evaluation. It is foreign historical consumer credit and remains unsuitable for MSME validation. A validated production credit model remains blocked on authorized representative outcomes and independent review.

## Local completion update

The synthetic candidate now includes seeded uncertainty intervals and a separate explicit-selection/rollback registry with integrity checks. Historical practice evaluation is `METHODOLOGY_ONLY_NOT_MSME_VALIDATED`, never a candidate for app inference. The report discloses a poor bad-label recall at its fixed threshold. No threshold was chosen using the held-out test. All practice limitations, transformations, source labels and split details are in ML_TRAINING.md; full borrower/time/fairness validation remains unsupported by the source data.
