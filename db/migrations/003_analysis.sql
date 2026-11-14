CREATE TABLE anomaly_reviews (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 alert_key text NOT NULL, status text NOT NULL CHECK(status IN ('UNDER_REVIEW','FALSE_POSITIVE','ESCALATED','RESOLVED')),
 note text NOT NULL CHECK(length(note) BETWEEN 5 AND 1000), actor_id uuid NOT NULL REFERENCES users,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE scenarios (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users,input jsonb NOT NULL,result jsonb NOT NULL,
 evidence_ids jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE knowledge_documents (
 id text PRIMARY KEY,title text NOT NULL,body text NOT NULL,
 search tsvector GENERATED ALWAYS AS (to_tsvector('english',title||' '||body)) STORED
);
CREATE INDEX knowledge_search ON knowledge_documents USING gin(search);
INSERT INTO knowledge_documents(id,title,body) VALUES
 ('health-methodology','Financial Health Index','The internal descriptive index is not a bureau score or probability of default. Revenue stability uses invoice variability. Timeliness uses reported GST filings and utility payments. Customer diversification uses invoice buyer shares. Growth compares observed invoice months. Missing evidence withholds the overall score.'),
 ('cash-and-revenue','Cash receipts versus revenue','Bank deposits can include capital injections, internal transfers, loans and refunds. Only classified sales receipts enter operating receipts. Invoice revenue and GST sales may differ from cash receipts because of timing, tax withholding, refunds, cash payments and missing accounts.'),
 ('dscr','Debt service coverage ratio','DSCR is cash flow available for debt service divided by debt service. It is unavailable when debt service is zero or when obligations and cash-flow definitions are incomplete. A scenario ratio uses explicit assumptions, not a lending decision.'),
 ('consent','Source consent and coverage','Uploaded records are unverified. Consent expiry or revocation blocks their use. Evidence coverage measures available source categories, not statistical prediction confidence. EPFO absence is not automatic noncompliance.'),
 ('scenarios','Cash-flow scenarios and EMI','Scenarios are hypothetical assumptions, not forecasts or default predictions. Reducing-balance EMI uses principal, nominal annual rate and term; fees and total repayment are separate. Timing delays and sales declines change projected receipts.');
