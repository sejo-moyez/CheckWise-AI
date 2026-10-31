# API v1

See [OpenAPI](openapi.yaml) and `/api/v1/docs/`. Paths end in `/`. Paginated lists return `{count,next,previous,results}` with `?page=N` and 30 rows/page. Errors use `detail`, field error lists, or a list of validation messages. Owner-scoped UUID lookups return 404 for another user's resources.

## Authentication

GET `auth/csrf/` sets the CSRF cookie and returns `{csrf}`. POST `auth/register/` accepts email, password (10+ characters), first_name and optional referral_code. POST `auth/login/` accepts email/password and requires `X-CSRFToken`. Access JWTs stay in memory; the rotated refresh JWT uses an HttpOnly, SameSite=Lax cookie scoped to `/api/v1/auth/` (Secure in production). Send Bearer access tokens on authenticated requests. POST `auth/refresh/` and `auth/logout/` require cookies plus X-CSRFToken. GET/PATCH `auth/me/` permits profile name changes only. POST `auth/verify/` takes token, `auth/resend/` resends verification, `auth/forgot/` takes email, `auth/reset/` takes uid/token/password. Reset revokes refresh tokens and invalidates password-hash-bound access JWTs.

## Core flow

| Operation | Payload / result |
| --- | --- |
| GET config/ | Brand, development flags, current pricing/packages, retention/upload limits |
| POST documents/ | Multipart title/file OR JSON title/text; exactly one content input |
| GET/DELETE documents/{id}/ | Private metadata / deletion after active checks finish |
| GET documents/{id}/download/ | Authorized original download |
| POST detection/quote/ | document, kind → credits, words; does not charge |
| POST detection/ | document, kind, mode, UUID request_key → reservation and job |
| GET detection/{id}/ | Status, normalized results, error and report_id |
| GET reports/ | Owner's reports |
| GET reports/{id}/download/ | PDF rendered from stored private results |
| GET credits/ | Available balance and reserved amount |
| GET credits/ledger/ | Auditable movements with balance snapshots |
| POST credits/redeem/ | code → eligible promotion, once per verified user |
| POST payments/ | package, Kenyan phone, UUID request_key → selected provider purchase |
| GET payments/{id}/ | Payment status and server-snapshotted amount/credits |
| POST payments/{id}/reconcile/ | Request independent Daraja query |
| POST payments/{id}/mock-confirm/ | DEBUG-only simulation; no money moves |
| POST payments/mpesa/callback/ | Untrusted hint; never awards without server query verification |

Job kinds: combined, plagiarism, ai, humanize. Modes: natural, academic, professional, simple, formal, conversational. Each started word allowance is billed as a unit. Request keys make repeated submissions idempotent; conflicting payloads are rejected. Reuse purchase keys after ambiguous network failures rather than generating another STK request. Phone accepts 07…, 01… and 254… formats.

## Supporting routes

GET dashboard/ supplies real counts and 14-day usage. GET/PATCH notifications/{id}/ changes read state only. GET/POST support/ and GET support/{id}/ are owner-only; POST contact/ is public and throttled. GET referrals/ returns link/code/reward totals. GET/POST referrals/reseller/ reads or updates customer opt-in using a reseller code (empty code disconnects). GET referrals/customers/ and referrals/customers/{id}/usage/ expose paginated metadata only for opted-in customers. POST referrals/transfer/ requires a verified reseller and accepts verified customer email, credits and UUID request_key. GET/PATCH subscriptions/{id}/ supports prepaid terms and cancellation; no recurring charge is scheduled. GET admin/overview/ and POST admin/adjust/ require staff; adjustments accept email, credits, reason and UUID request_key. `/admin/` provides model permissions, pricing/promotions, users, support replies, provider switches and audit logs in a separate staff session.

## Licensed gateway adapter contract

DETECTION_API_URL and REWRITE_API_URL must be licensed HTTPS gateway roots; keys stay on the server. This is an integration contract, not a preconfigured vendor. POST `{root}/jobs` takes text, kind, mode, idempotency_key and preservation instructions; returns `{id}`. GET `/jobs/{id}` returns status queued/processing/completed/failed. GET `/jobs/{id}/results` returns finite 0–100 similarity/ai_likelihood/human_likelihood or null; sources `[{title,url,passage?}]`; optional sentences `[{text,ai_likelihood}]`; rewritten_text and notes. Scores and bounds are validated, never invented. Provider passages are escaped before display.

The processing window is bounded; timeout/error releases credits. Vendors requiring longer jobs need a provider-specific durable callback/polling adapter before activation. Mock detection returns null scores; mock rewriting returns unchanged text. No Turnitin access is claimed.
