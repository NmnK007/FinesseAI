# South German Credit — offline methodology practice only

Attribution: **South German Credit [Dataset]. (2019). UCI Machine Learning Repository. https://doi.org/10.24432/C5X89F.**

Official source and license verified 13 November 2026: https://archive.ics.uci.edu/dataset/522/south+german+credit

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The original data file and code table are redistributed unchanged. The derived evaluation, feature selection, label inversion and preprocessing are modifications by this project. No endorsement by UCI or the data contributors is implied. See `provenance.json` for download URL and archive hash. The evaluation command verifies the exact data SHA256 before fitting.

The official source describes 1,000 historical credits from 1973–1975, including 300 bad outcomes in an oversampled sample. `codetable.txt` defines kredit=0 as bad and kredit=1 as good. The experiment models the dataset label, not a defined 12-month delinquency event.

This is foreign historical consumer-credit practice, entirely separate from Indian MSME records, the Health Card and application inference. Actual borrower IDs, per-record timestamps and sampling weights are unavailable. No real MSME default probabilities, lending decisions, representative calibration or fairness claims are supported.
