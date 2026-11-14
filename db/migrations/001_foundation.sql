CREATE TABLE users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','lender','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizations (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','reviewer')),
  PRIMARY KEY (organization_id,user_id)
);
CREATE TABLE businesses (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120), gstin text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id,id)
);
CREATE TABLE otp_challenges (
  email text PRIMARY KEY, id uuid NOT NULL, verifier text NOT NULL,
  expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE TABLE consents (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users, purpose text NOT NULL, version text NOT NULL,
  categories text[] NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, revoked_at timestamptz,
  UNIQUE (business_id,id)
);
CREATE TABLE accounts (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  alias text NOT NULL CHECK (length(alias) BETWEEN 1 AND 60), currency text NOT NULL DEFAULT 'INR' CHECK (currency='INR'),
  UNIQUE (business_id,alias), UNIQUE (business_id,id)
);
CREATE TABLE ingestion_jobs (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  account_id uuid NOT NULL, consent_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('PREVIEW','COMPLETED')),
  file_hash text NOT NULL, filename text NOT NULL, parser_version text NOT NULL,
  preview jsonb NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  FOREIGN KEY (business_id,account_id) REFERENCES accounts(business_id,id),
  FOREIGN KEY (business_id,consent_id) REFERENCES consents(business_id,id), UNIQUE (business_id,id)
);
CREATE INDEX jobs_business ON ingestion_jobs(business_id,created_at);
CREATE TABLE source_evidence (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  job_id uuid NOT NULL, origin text NOT NULL CHECK (origin IN ('USER_UPLOADED_UNVERIFIED','SYNTHETIC_DEMO','SANDBOX','VERIFIED_PARTNER')),
  file_hash text NOT NULL, transformations text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id,job_id) REFERENCES ingestion_jobs(business_id,id), UNIQUE (business_id,id)
);
CREATE TABLE transactions (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  account_id uuid NOT NULL, evidence_id uuid NOT NULL, occurred_on date NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise <> 0 AND abs(amount_paise) <= 1000000000000),
  balance_paise bigint, description text NOT NULL, reference text, fingerprint text NOT NULL,
  category text NOT NULL CHECK (category IN ('BUSINESS_SALE','CUSTOMER_REFUND','INTERNAL_TRANSFER','CAPITAL_INJECTION','LOAN_DISBURSEMENT','LOAN_EMI','SUPPLIER_PAYMENT','SALARY','TAX','UTILITY','FEES','UNKNOWN')),
  category_confidence numeric NOT NULL CHECK (category_confidence BETWEEN 0 AND 1),
  category_method text NOT NULL DEFAULT 'inferred', created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id,account_id) REFERENCES accounts(business_id,id),
  FOREIGN KEY (business_id,evidence_id) REFERENCES source_evidence(business_id,id),
  UNIQUE (account_id,fingerprint)
);
CREATE INDEX transactions_business_date ON transactions(business_id,occurred_on);
CREATE TABLE feature_snapshots (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
  job_id uuid NOT NULL, version text NOT NULL, metrics jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id,job_id) REFERENCES ingestion_jobs(business_id,id)
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES users ON DELETE SET NULL,
  business_id uuid REFERENCES businesses ON DELETE CASCADE, action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_business_date ON audit_events(business_id,created_at);
