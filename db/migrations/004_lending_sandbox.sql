CREATE TABLE sharing_grants (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 reviewer_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,owner_id uuid NOT NULL REFERENCES users,
 purpose text NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,reviewer_id)
);
CREATE TABLE sandbox_applications (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users,profile text NOT NULL,terms jsonb NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SIMULATED_SUBMISSION','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE lender_notes (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
 reviewer_id uuid NOT NULL REFERENCES users,disposition text NOT NULL CHECK(disposition IN ('NEEDS_INFORMATION','REVIEWED','ESCALATED')),
 note text NOT NULL CHECK(length(note) BETWEEN 5 AND 1000),created_at timestamptz NOT NULL DEFAULT now()
);
