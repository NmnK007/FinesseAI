CREATE TABLE source_applicability (
 business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('GST','UTILITY')), applicable boolean NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 1000), actor_id uuid NOT NULL REFERENCES users,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(business_id,kind)
);
CREATE TABLE evidence_corrections (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 record_id uuid NOT NULL REFERENCES evidence_records ON DELETE CASCADE,
 data jsonb NOT NULL, reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 1000),
 actor_id uuid NOT NULL REFERENCES users, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX corrections_record_time ON evidence_corrections(record_id,created_at DESC);
ALTER TABLE lender_notes ADD COLUMN evidence_ids jsonb;
ALTER TABLE lender_notes ADD COLUMN export_policy text NOT NULL DEFAULT 'LEGACY_UNSCOPED'
 CHECK(export_policy IN ('LEGACY_UNSCOPED','OWNER_VISIBLE_SCOPED'));
