CREATE TABLE evidence_batches (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 consent_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('INVOICE','UTILITY','GST')),
 status text NOT NULL CHECK(status IN ('PREVIEW','COMPLETED')), filename text NOT NULL,
 file_hash text NOT NULL, preview jsonb NOT NULL, result jsonb,
 origin text NOT NULL DEFAULT 'USER_UPLOADED_UNVERIFIED' CHECK(origin IN ('USER_UPLOADED_UNVERIFIED','SYNTHETIC_DEMO','SANDBOX')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 FOREIGN KEY(business_id,consent_id) REFERENCES consents(business_id,id), UNIQUE(business_id,id)
);
CREATE TABLE evidence_records (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 batch_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('INVOICE','UTILITY','GST')),
 record_key text NOT NULL, fingerprint text NOT NULL, data jsonb NOT NULL,
 FOREIGN KEY(business_id,batch_id) REFERENCES evidence_batches(business_id,id),
 UNIQUE(business_id,kind,record_key)
);
CREATE INDEX evidence_business_kind ON evidence_records(business_id,kind);
CREATE TABLE assessments (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 as_of date NOT NULL, version text NOT NULL, input_hash text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,as_of,version,input_hash)
);
CREATE TABLE reconciliation_reviews (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 match_key text NOT NULL, disposition text NOT NULL CHECK(disposition IN ('CONFIRMED','DISMISSED')),
 note text NOT NULL CHECK(length(note) BETWEEN 5 AND 1000), actor_id uuid NOT NULL REFERENCES users,
 created_at timestamptz NOT NULL DEFAULT now()
);
