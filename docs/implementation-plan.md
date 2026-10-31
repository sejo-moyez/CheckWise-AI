# Implementation plan

1. Foundation: Django settings, modular models, React shell, migrations, JWT and account email flows.
2. Core: private uploads/extraction, atomic credit ledger, queued provider jobs, authorized PDF reports, payment verification.
3. Dashboards: real API data, document/report/payment history, pricing and staff operations.
4. Supporting features: rewriting adapters, prepaid subscriptions, referral rewards, reseller transfers, email and support.
5. Validation: backend unit/API tests, frontend forms/navigation tests, Playwright full flow, production build and deployment configuration.

External credentials are not prerequisites for clearly labeled development tests. Production activation requires licensed providers, Daraja sandbox validation, SMTP, storage, TLS, and operator review. Public deployment and live financial transactions are outside this implementation authorization.
