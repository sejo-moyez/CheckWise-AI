# Architecture

CheckWise AI is a React/TypeScript client and a Django REST API. PostgreSQL is the production source of truth; Redis carries Celery tasks and shared rate limits. SQLite and eager tasks support a self-contained local development workflow. Production uses PostgreSQL, a worker, and private S3-compatible storage or a private shared filesystem.

All resource access is scoped by authenticated owner. Access JWTs remain in browser memory; rotated refresh JWTs use HttpOnly cookies and a CSRF-protected refresh/logout flow. Django admin supplies staff operations and audit records. Credit mutations use database transactions, conditional balance updates and immutable ledger entries. Jobs reserve funds before enqueueing and consume or release reservations exactly once.

Detection, rewriting, and payments use explicit adapters. Development fixtures are labeled, deterministic test data, never claims about actual authorship or similarity. Production refuses mock processing. Licensed detection gateways implement the documented adapter contract. Daraja payment callbacks trigger a server-side status query before wallet crediting. Live payments require explicit deployment/operator configuration.

Deployment topology: TLS terminator → Nginx (frontend and API) → Gunicorn → PostgreSQL; Celery → Redis/PostgreSQL; private object storage. Email is delivered by asynchronous tasks. No uploaded content or credentials belong in logs.
