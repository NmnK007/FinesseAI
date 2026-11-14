CREATE TABLE review_inputs (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users,kind text NOT NULL CHECK(kind IN ('FINANCING_CLAIM','REVERSAL','TECHNICAL_FAILURE','INSUFFICIENT_FUNDS')),
 evidence_id uuid NOT NULL,amount_paise bigint,party_alias text,reason text NOT NULL,
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz
);
CREATE INDEX review_inputs_business ON review_inputs(business_id);
