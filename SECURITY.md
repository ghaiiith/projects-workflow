# Security & production release notes

This version is a **local pilot**, not authorized for production government procurement or public expenditure.

Required hardening before real institutional use:
- HTTPS, protected infrastructure, secrets manager, key rotation, secure session cookies/CSRF defense, MFA/SSO.
- Limit database records and document download to organizational unit, delegation and clearance; current authenticated staff access all project details.
- Permanent, append-only/WORM evidence logs and signed minutes. SQLite audit table is not tamper-proof.
- Antivirus scanning, file signature inspection, encrypted at-rest storage, backup verification/restore rehearsal.
- DB migrations, PostgreSQL for concurrency/HA, rate limiting for all sensitive endpoints.
- Formal conflict-of-interest review of committee memberships and delegate validity, plus legal e-signatures.
- Financial controls for certified works, retention, tax, prior advances, guarantees and budget allocation.
- Official integrations (IDMS / tenders platform / payment systems). An electronic record is NOT an official publication, decision or bank transaction.
- Current frontend uses bearer tokens in localStorage for pilot simplicity. Replace with hardened auth before production.
- Dependencies and CI outputs must be scanned/reviewed; no security claim is made.
