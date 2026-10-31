# CheckWise AI

An original React + Django content-review application with private documents, credit accounting, queued jobs, PDF reports, a Daraja M-Pesa adapter, user workspace and staff administration.

**Development detection is explicitly mocked. No real plagiarism or AI analysis occurs without a licensed gateway. Mock rewriting returns the original text unchanged. Simulated payments do not charge money. No Turnitin affiliation or access is claimed. Nothing has been publicly deployed.**

## Access, GitHub and environment publication

Publishing a ChatGPT cloud environment saves its development workspace. It does not upload source files to GitHub or deploy a website. This environment does not provide an interactive ChatGPT web-preview URL. Servers started here listen inside the cloud machine; opening localhost on your own device will not reach them.

To use the application in a browser, either run the repository on your own computer using the commands below (then open `http://localhost:5173` on that computer), or deploy it to a web host using the deployment guide. Git commits must be pushed explicitly before the application appears in the GitHub repository. Source upload and public website deployment are separate actions.

## Start locally

Requires Python 3.12 and Node 22.12+ or 24.

```sh
bash scripts/install.sh
bash scripts/dev.sh
```

The API uses port 8000 and Vite uses 5173. Local development uses SQLite, eager tasks and private files. Register, open your verification email under ignored `backend/emails/`, and verify before purchasing simulated credits. No credentials are predefined. `.env.example` documents settings; Django reads exported process variables, not implicit dotenv files.

For PostgreSQL, Redis and a real Celery worker:

```sh
docker compose up --build -d --wait
docker compose exec backend python manage.py smoke
docker compose exec backend python manage.py createsuperuser
```

Staff management lives at `/admin/` in a separate session; `/app/admin` provides API-connected analytics and audited credit adjustments. Cloud tasks are already isolated: use the existing checkout without an extra Git worktree.

## Implemented

- Responsive public pages and light/dark user workspace connected to actual API data.
- Registration, verification/reset, JWT access in memory, rotated HttpOnly refresh cookies, CSRF protection and backend role checks.
- Private PDF/DOCX/TXT uploads/extraction, authorized download/deletion and retention task.
- Atomic wallets, reservations/settlements/refunds, immutable ledger history, pricing, promotions and idempotency.
- Queued checks, provider gateway contract, labeled mocks, source/sentence results, rewrite comparison and private PDF reports.
- M-Pesa initiation/query adapter, untrusted callback hints, reconciliation, simulated purchases, prepaid terms and history.
- Referral rewards, audited reseller transfers and consent-based customer usage, email/in-app notices, support and admin replies.
- Staff administration, audits, usage/revenue statistics, OpenAPI, Docker configurations, CI and operational scripts.

## Validate

```sh
bash scripts/test.sh
cd frontend
npx playwright install chromium
npm run test:e2e
# Or use an installed Chromium:
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Browser tests start their own API/frontend and temporary SQLite database; stop services on ports 8000/5173 first. Run backend tests in Docker for PostgreSQL concurrency coverage. See [progress](docs/progress.md) for executed results; remote CI execution is not claimed.

## Documentation

- [Architecture](docs/architecture.md) · [Database](docs/database-design.md)
- [API contracts](docs/api-specification.md) · [OpenAPI](docs/openapi.yaml)
- [Implementation plan](docs/implementation-plan.md) · [Progress](docs/progress.md)
- [Deployment, sandbox testing and backups](docs/deployment.md)

Before commercial launch, configure and validate licensed providers, Daraja sandbox, SMTP, private storage, TLS, backups and operator-specific legal policies. Automatic recurring debit subscriptions and cash refunds are not implemented. The Sites plugin was unavailable; no site was created through that service.
