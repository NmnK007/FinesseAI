# Security and privacy — foundation, not production certification

Implemented controls: random 6-digit OTP, HMAC verifier with server secret, five-minute expiry, five failed attempts, single-use consumption under database lock, database-backed request/verification rate limits, opaque 256-bit sessions hashed at rest, eight-hour expiry, server-side revocation, HttpOnly/SameSite=Lax cookies and Secure in production. All modifying endpoints require the configured exact Origin. Financial endpoints additionally require a database session and owner membership; a GSTIN never grants access.

Mailpit transport is allowed only when `NODE_ENV=development` AND `AUTH_DELIVERY=mailpit`. SMTP host/port are hardcoded to loopback 127.0.0.1:1025 to prevent accidental remote delivery. Production sign-in fails closed until a reviewed provider is implemented. Compose publishes PostgreSQL, SMTP and inbox only to 127.0.0.1. Do not expose a development server or inbox through a tunnel.

OTP values never appear in API responses, logs or source fixtures. Audit events store action IDs/counts, not raw documents, financial narration or credentials. Error responses omit stack traces, SQL and service secrets. Browser session identity is fetched from a server endpoint; unsigned legacy cookies and hardcoded credentials no longer authenticate. Legacy application/decision/OCEN write routes are closed pending authorized sharing and durable sandbox work.

Uploads use bounded streaming JSON, parsed CSV, row/column/string limits, strict dates, INR paise and schema checks. Filenames are metadata only, never filesystem paths. Raw files are not stored publicly or on disk. JSON exports do not evaluate spreadsheet formulas. No PDF extraction, arbitrary provider URLs or document tools exist in this slice.

Consent permits local analysis for 90 days, with revocation blocking future use/confirmation and excluding prior records from metrics/exports. Financial records remain stored until the owner deletes the business; deletion cascades normalized rows, previews, sources, consents and snapshots. Expired sessions are denied immediately; operational cleanup of expired sessions/OTP/rate-limit rows and a retention scheduler remain production work. Database backups, where configured externally, need their own deletion/retention policy.

Remaining release gates: production identity verification and lender sharing grants; managed HTTPS/secrets; encrypted PostgreSQL volumes/backups; retention jobs; restore/disaster-recovery tests; managed DB least-privilege credentials; penetration testing and concurrency/load tests; legal and privacy review for actual Indian financial data; provider agreements and lender approvals. Local PostgreSQL uses host access controls, not application field encryption or claimed regulatory certification. No legal-compliance claim is made. Historic architecture/deck material must not be used as a current legal or integration statement.

Authentication currently has global plus per-identity database rate limits; production requires an abuse-resistant gateway and monitoring to avoid global-limit denial of service. Only customer accounts self-register; there is no public admin/lender elevation. Lender real-record access is unavailable until explicit sharing is implemented.

## Added analysis and reviewer controls

New intelligence/analysis/lending routes use the same opaque session, same-origin mutation guard, bounded validation and database rate limiting. Source facts are filtered by unexpired/unrevoked consent before scoring, anomaly checks, copilot answers or reviewer access. Saved derived results referencing unavailable source IDs are omitted. Business deletion cascades new financial records; audit events follow the foundation's deletion behavior.

Explicit owner sharing expires after seven days. Enrollment is development CLI-only and restricted to fictional `@finnese.test` accounts. Reviewer role alone grants no access. Revocation denies subsequent reads and notes; it cannot erase information already viewed or copied by a previously authorized reviewer. Grant purpose and audit events are stored. Reviewer notes are business-scoped and visible to other actively authorized reviewers of that business.

The copilot has no write tools or external model calls. Questions are bounded, tools are selected deterministically and every finance query is owner-scoped. This prevents model-driven action execution; it is not a claim of universally detecting prompt injection. Uploaded records are never executed as instructions.

Outstanding controls: a reviewed policy for exporting unscopable reviewer notes and deployment scheduling of retention, production encryption/key management, production authentication, independent security review and load/concurrency testing. Revocation suppresses further use but retained data requires deletion/retention policy; it is not an immediate physical erasure promise.

## Export and retention operation

`GET /api/businesses/export?businessId=...` locks/authorizes the business and exports only active source facts and derived snapshots/scenarios whose source IDs remain authorized. JSON avoids spreadsheet formula execution. Consent/grant metadata and local application terms are included. Reviewer free-text notes are omitted because their original source-specific consent cannot be determined; this limitation is explicit in the export.

`npm.cmd run data:retention` previews eligible source count without mutation. `npm.cmd run data:retention -- --apply` is an operator-only offline task: 30 days after source consent expiry/revocation, delete the raw preview and normalized records for that source, and conservatively clear that business's derived snapshots, scenarios and free-text review notes. Active source facts, business identity, grants and simulated application terms remain. A minimal count/policy audit event is recorded. Review this policy before production scheduling. This job was tested on disposable fixtures; no user database was purged. Scheduling and legal retention requirements remain deployment work.
