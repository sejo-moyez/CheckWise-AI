# Database design

UUID resource identifiers are used for users, documents, jobs, reports, payments, ledger entries, subscriptions, referrals, notifications and tickets. User email is unique and the login identifier. Roles distinguish users, resellers, administrators and super administrators; Django staff permissions independently protect operations.

Wallet has nonnegative balance and reserved amounts. Ledger is append-only, with a unique idempotency key, signed amount, movement type and balance snapshot. Credit reservations and their settlement run in atomic transactions. Payment package prices and credit quantities are snapshotted into each payment. Payment receipt and provider checkout IDs are unique. Duplicate callbacks cannot grant a second credit.

Document owns private source files and extracted text. Jobs reference a document and store a cost, provider result, error, lifecycle timestamps and a unique owner/request key. Report is one-to-one with a successful job. Notifications and support tickets belong to users. Subscription purchases grant prepaid terms; no automatic recurring debit is performed. Referrals grant rewards only after the referred user's first verified purchase. Audit logs record administrative adjustments and sensitive model operations.

See checked-in Django migrations for exact constraints and indexes.

Reseller membership is explicitly opted into by the customer. CreditTransfer tracks sender, recipient, amount and unique sender/request key; reseller usage endpoints disclose check metadata only, and unlinking revokes access. PromoCode has positive amounts, expiry, a capped usage count and one redemption per user.
