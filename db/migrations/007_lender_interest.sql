CREATE TABLE lender_interest (
 business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 reviewer_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 profile_id text NOT NULL CHECK (profile_id IN ('working-capital','compliance','diversification','growth')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (business_id, reviewer_id, profile_id)
);
