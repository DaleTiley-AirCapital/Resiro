# Demo dashboard verification

Run the API regression checks from a cloud environment with Node.js 22:

```sh
node tooling/verify-demo.mjs
```

Set RESIRO_BASE_URL to check another Railway deployment. The script exercises the public demo accounts and creates clearly named demonstration properties, documents, templates and jobs in their shared tenants. Never use private documents in these accounts.

The checks cover login, session restoration, invalid credentials, account isolation, property creation and document counts, supplier profile/settings/templates/jobs, document upload/download, and password-protected expiring links. The script saves a JSON result under /tmp.

Browser acceptance on 30 October 2026 used Chromium in Railway at 1440x1000 and 390x844. Both login forms, refresh persistence, sign-out, property navigation and creation, supplier profile/job/template/settings changes, file upload/download and share unlocking were exercised. Screenshots were captured for both dashboards.

The former prototype displayed successful bookings, compliance checks and document verification without working integrations. Those messages have been replaced by clear unavailable/not-evaluated states. AI policy analysis, reminders, provider invitations, bookings and consultations remain unimplemented. Supplier templates currently save reusable job names/categories, rather than implementing a dynamic form designer.

Supplier profile, jobs, templates, settings and share metadata are stored in the existing organization-owned JSONB settings. Property documents use the existing documents table. File contents live on the Railway uploads volume. Row locks protect concurrent supplier updates; share tokens are random, expire automatically and support optional passwords.
