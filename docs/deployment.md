# Deployment and operations

No public deployment or real financial transaction has been performed. Public launch requires operator approval and the external validations below.

## Local development

Windows users can run the Bash scripts in Git Bash after installing Python 3.12 (including the `py` launcher) and Node.js. The scripts detect the Windows `Scripts/python.exe` virtualenv layout and fail early with installation guidance if a prerequisite is absent. See README for Windows installer commands. Native Windows uses eager development tasks; production Gunicorn and real Celery workers run in Linux containers.

Use Python 3.12 and Node 22.12+ or 24. Run `bash scripts/install.sh`, then `bash scripts/dev.sh`. These commands use SQLite, eager tasks, explicitly selected mock providers and file-based email in ignored `backend/emails/`. Read your own verification email locally; never expose that directory over HTTP. No admin credentials or initial wallet credits are predefined. Create staff with `DEBUG=true .venv/bin/python backend/manage.py createsuperuser`.

For PostgreSQL, Redis and real Celery execution, run `docker compose up --build -d --wait`. Linux bind mounts use UID/GID 1000; override DEV_UID and DEV_GID to match your host. The development stack binds only loopback ports 8000/5173, uses development-only database credentials, persists database/Redis volumes and source-tree private uploads/emails. It deliberately forces mocks. Run `docker compose exec backend python manage.py smoke` for the queued purchase/document/check/PDF flow; it retains labeled test records. Run `docker compose exec backend python manage.py test apps.core` for PostgreSQL tests, including concurrent spending. `docker compose stop` preserves data.

Cloud tasks are already isolated: use the existing checkout without creating a Git worktree. Dependencies survive snapshots; processes and runtime authentication must restart. Never assume a worker is still running after restore.

### Managed proxy builds

Build secrets mount the public CA bundle with TLS verification enabled. BUILD_CA_BUNDLE defaults to `/etc/ssl/certs/ca-certificates.crt`. If Buildx requests a file grant, use `docker buildx bake --allow=fs.read=/etc/ssl/certs/ca-certificates.crt -f docker-compose.yml`, then `docker compose up -d --wait`. Preserve configured proxy defaults. Development containers mount the bundle for Requests/npm. Never disable certificate, signature or checksum verification.

## VPS / cloud release

1. Provision Docker Compose, a domain, trusted TLS certificates, restricted SSH and encrypted off-host backups. Expose only 80/443. PostgreSQL, Redis and Gunicorn must stay private.
2. Copy `infrastructure/production.env.example` to ignored `.env.production`. Supply a random Django secret, unique PostgreSQL password matching DATABASE_URL, HTTPS origins/hosts, SMTP, licensed providers and optional private S3 configuration. URL-encode database password special characters. Keep DEBUG=false. `.env` files are not implicitly loaded by Django; Compose env_file or exported process variables supply configuration.
3. Run `docker compose -f docker-compose.prod.yml build`, then `... up -d db redis`. Run `... run --rm backend python manage.py migrate --noinput`, `... run --rm backend python manage.py seed`, `... run --rm backend python manage.py createsuperuser`, and `... run --rm backend python manage.py check --deploy`. The ellipsis means the same `docker compose -f docker-compose.prod.yml` prefix.
4. Start `docker compose -f docker-compose.prod.yml up -d --wait`. Frontend binds 127.0.0.1:8080. Configure the host TLS ingress from `infrastructure/tls.conf.example`. It must overwrite forwarded headers and be the sole public ingress. Secure cookies, redirects, HSTS and CSP require testing at the final domain.
5. Use private S3 with public access blocked, encryption, least-privilege credentials and lifecycle controls, or the private shared filesystem volume. Never publish MEDIA_ROOT. PDFs are rendered on demand from stored results; Report.file is reserved for provider artifacts. Configure resource limits and isolation for untrusted file extraction.
6. Verify PostgreSQL health, Redis ping, Celery inspect ping, one beat scheduler, retention/reconciliation execution, SMTP, private files, completed checks and restored backups in staging. `/api/v1/health/` checks the database only; worker and Redis monitoring are separate.

## Daraja sandbox testing

Provide authorized sandbox consumer key/secret, shortcode, passkey, supported transaction type and a public HTTPS callback under your control. Set PAYMENT_PROVIDER=mpesa and MPESA_ENV=sandbox in staging; development Compose intentionally forces mock. Allow sandbox.safaricom.co.ke; production uses api.safaricom.co.ke. Do not switch to production or send live transactions as a test.

Initiate a sandbox purchase, approve through the documented simulator/sandbox flow, and confirm one purchase ledger grant after independent STK query verification. Test duplicate callbacks/reconciliation, cancellation (1032), timeout (1037), delayed confirmation and insufficient credits. Callbacks are unauthenticated hints only: checkout IDs must match locally initiated purchases. The STK query verifies that checkout for the snapshotted amount/phone. Callback-supplied receipt numbers are not independently authenticated and are not stored as trusted receipts; the verified payment/checkout reference remains available. Transaction-receipt validation, cash reversal and till-specific extensions need additional provider APIs and validation.

Unknown initiation outcomes become review to avoid silently reinitiating accepted requests. Beat reconciles pending checkouts, moving unresolved queries to review after 24 hours. Staff cannot manually mark payments paid. Resolve ambiguous initiations through provider records before asking a customer to retry. This session has no Daraja credentials, so no live sandbox call is claimed.

## Backup / recovery

Run `bash scripts/backup.sh /private/backup/path` from the repository root. It produces a custom pg_dump and private-media archive with restrictive permissions. Encrypt and copy off-host; monitor backup age and restore success. S3 requires its own private versioning/snapshot policy; the local archive does not back up remote objects. Store secrets in a vault separately from source/backups.

Practice restoration in an isolated staging stack: stop application writes/workers/beat, create an empty database, then pipe the dump to `docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error'`. Restore matching private media/S3 state, migrate, verify ledger totals/payment references, restart and query existing payments read-only. Never replay production payment initiations during recovery.

## Monitoring and remaining release gates

Logs should contain identifiers and sanitized errors, never document contents, tokens or credentials. Nginx logs omit query strings. Add host/image security scanning, resource limits, PII-scrubbed error monitoring, queue/beat alarms, disk alerts and pending/review payment alerts. Production throttles use Redis; enforce strict ingress limits as cache throttles alone are not global quotas. Monitor the daily retention job. Review all public policies for operator identity, jurisdiction and consumer rights before commercial use.

External validations still required: licensed detection/rewrite gateway, Daraja sandbox, SMTP, S3, final-domain TLS, backup restore and load testing. Subscriptions are prepaid one-time allowances, not recurring debit billing. Resellers can transfer credits and view metadata-only usage for customers who explicitly connect their code in account settings. Disconnecting revokes this access; original text, titles and reports remain private. Advanced referral fraud review is manual. Automatic cash refunds and receipt-specific reconciliation extensions are not implemented. CI configuration is included, but remote CI execution is not claimed.
