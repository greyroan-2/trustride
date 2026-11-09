# TrustRide

Local Next.js App Router application built directly in this directory. No deployment or live database migration has been performed.

## Run locally

Requires Node.js 22.12+ (verified here with 24.22) and npm.

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev
```

Open http://localhost:3000. The public pages work without credentials. Protected pages redirect to login; authentication clearly reports missing configuration. There is no authentication bypass or fictional demo session.

## Connect Supabase

1. Create a Supabase project. Copy `.env.example` to `.env` (ignored by Git); Prisma CLI and seed load `.env`. Next.js also reads `.env.local` if preferred, but Prisma CLI requires those variables to be exported separately when using that filename.
2. Set the project URL, publishable key, and the trusted site URL. No service-role key is needed. Use the actual project values; none are included.
3. Set `DATABASE_URL` to the pooled PostgreSQL connection and `DIRECT_URL` to the operator/direct or session-pooler connection used for migrations. Use TLS and the connection details from your Supabase project. URL-encode special password characters. Runtime Prisma uses the PostgreSQL driver adapter; migration credentials stay on the operator machine.
4. Review `prisma/migrations/20261106000000_initial/migration.sql`. On a new database, run `npm.cmd run db:migrate` yourself. Do not apply this initial schema to an existing database without inspecting and baselining it. Migration enables RLS, revokes Data API access for `anon`/`authenticated`, adds foreign keys, check constraints, overlap exclusion, and vehicle-period triggers. It requires Supabase roles and `btree_gist`.
5. Run `npm.cmd run db:seed` only in your development database. This idempotently adds two clearly marked DEMO physical units and their Veloz/Innova model entries. It deliberately supplies no invented prices, seating, transmission, or luggage specifications. Admin must enter verified values before reservations can be submitted.
6. In Supabase Auth, enable email confirmation and configure the Site URL plus allowed redirect URLs: `http://localhost:3000/auth/callback` and your approved production origin callback. Configure SMTP/email delivery and appropriate provider rate limits before launch. Password recovery returns to `/profile` after the PKCE callback.
7. Register, confirm your email, and log in once to create the default CLIENT profile. Provision the first admin as an operator using the commented SQL in `prisma/provision-admin.sql`, substituting the verified Auth UUID. Public signup cannot assign a role, and metadata roles are ignored.
8. Review and run `prisma/storage.sql` in Supabase SQL editor. This creates a public vehicle-photo bucket and an admin-only insert policy. Upload JPEG/PNG photos up to 5 MB through `/admin/vehicles`. This bucket must never contain customer documents. For GLB and panorama assets use separately configured licensed HTTPS asset URLs with suitable CORS headers. Link those through the admin vehicle editor.
9. Restart the app after changing environment values. Verify the scenarios below against this project.

## Architecture and booking rules

- React Server Components fetch database data; server actions validate and authorize all mutations. Next.js Proxy refreshes Supabase cookies. `requireUser` validates identity with Auth on every protected server operation; `requireAdmin` retrieves the role from the database. Role assignment never comes from client input.
- Prisma runs exclusively on the server. Its privileged database connection can bypass RLS: explicit ownership filtering and admin checks are the security boundary for these paths. No browser Data API policies expose application tables. Give the runtime DB role only SELECT/INSERT/UPDATE/DELETE on application tables, not DDL, schema ownership, or migration privileges. Keep the direct operator connection out of the deployment environment when possible.
- One VehicleModel has multiple independently bookable physical Vehicle units. Each booking references one unit and one customer.
- Pending policy: **NO HOLD**. Pending requests never block dates, so they cannot block a vehicle indefinitely. Different clients can submit overlapping pending requests. Each client may have only one unfinished (PENDING or CONFIRMED) reservation per physical car; other cars remain bookable. Only one can be confirmed; approval rechecks current constraints. A different timed hold policy is not implemented and would require an expiry field, expiry-aware availability queries, and transaction tests before enabling.
- Dates are civil rental dates in Asia/Manila; PostgreSQL `date` columns represent `[pickup, return)` intervals. Adjacent rentals may share a return/pickup boundary. Other timestamps are stored consistently as PostgreSQL timestamps through Prisma.
- Booking creation and admin approvals lock the physical vehicle. A PostgreSQL GiST exclusion prevents overlapping CONFIRMED bookings even outside Prisma. Triggers check confirmed reservations against maintenance/unavailability periods. Rejection/cancellation remove the confirmed status and release dates. Cancellation requests await admin review and do not release dates prematurely.
- Financial values are integer minor units. The client shows an estimate; the server calculates and saves the authoritative quote inside the transaction. Changing pricing never updates existing booking snapshots. Deposits are included in estimated totals; no payment is collected by this application.
- Booking list and detail reads are scoped to the authenticated customer. Admin mutations are audit logged in the same transaction. Profile updates expose only name, phone, and optional password; role is never writable by clients.
- Server Actions use Next.js origin checks. Photo uploads have byte-signature checks, type/size limits, random filenames, and admin authorization. HTTPS asset URLs are stored as references, without server-side URL fetching.

## Features and routes

Public: `/`, `/about`, `/services`, `/testimonials`, `/contact`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`.

Client: `/fleet` (filters and date availability), `/fleet/[vehicleId]` (specifications, 3D/panorama viewer, calendar, estimate, request), `/dashboard`, `/bookings`, `/bookings/[bookingId]`, `/profile`.

Admin: `/admin`, `/admin/vehicles`, `/admin/bookings`, `/admin/availability`, `/admin/customers`, `/admin/pricing`, `/admin/testimonials`, `/admin/settings`.

Admin can edit model details, add/update/archive physical units, upload photos, link model/panorama media, configure pricing, approve/reject/cancel/complete reservations, manage date blocks, inspect customers and histories, publish testimonials, and inspect audit records. Settings currently displays deployment-controlled operating configuration. Public story/contact/legal copy is source-managed; a general website content editor is not included.

The viewer uses React Three Fiber, Drei, and OrbitControls with rotation, zoom, reset, and loading UI. Without supplied assets it shows a labelled abstract demonstration space, never an inaccurate Toyota replica. Hotspots are not placed on unverified assets. Real interior models require scale, camera, hotspot, mobile-performance, and CORS validation.

## Verification commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd audit
```

Automated tests cover money arithmetic, exclusive return-day boundaries, invalid rental duration, invalid money, and impossible/reversed dates. They do not establish live Auth or PostgreSQL behavior.

Before production, manually verify with two clients and one admin:

1. Email confirmation, login/logout, password recovery, session refresh, safe destination preservation, and client rejection from every admin action.
2. Client A cannot view/update Client B booking IDs; guests receive neither catalogue details nor prices, including direct HTTP requests.
3. Set a verified unit rate, submit a request, compare saved quote, approve, and verify availability. Change the rate and ensure the saved quote remains unchanged.
4. Simultaneously approve overlapping requests for the same unit: one must fail. Adjacent periods and different physical units must succeed.
5. Attempt maintenance-versus-confirmation conflicts in both operation orders and concurrently. Reject/cancel confirmed reservations and verify dates become available. Verify rollback leaves no partial audit or status update.
6. Upload authorised/unauthorised, oversized, and invalid file types. Confirm public bucket contains no customer data. Test production SMTP, TLS connections, RLS grants, runtime role limits, and backup/restore.
7. Check desktop/mobile layouts, keyboard navigation, reduced-motion preference, and real 3D assets on target phones. Browser visual review was unavailable in this session; do not treat compilation as visual QA.

## Development assets and launch limitations

Toyota model reference images are from the official Veloz and Innova pages (see `public/images/SOURCES.md`); they do not verify a particular fleet unit, variant, or 2026 model year. Confirm usage rights or replace with business-owned photographs before launch. Landscape photography is illustrative. Testimonials are explicitly sample copy. Contact and social details are placeholders; legal policies are labelled drafts.

Supabase connection, migrations, RLS, Storage, email, live RBAC, and concurrent booking behavior are implemented but **not integration-tested** because credentials were not supplied. No live database or account was created. No deployment was performed.

Remaining production work includes business-supplied verified specs/rates/photos/interiors, contact/service-area/legal content, credential-backed integration/security tests, browser/mobile visual QA, production monitoring and operational limits. Admin lists currently cap reservation/customer reads at 200 without pagination; the admin availability view is a chronological period list rather than a graphical month grid. There is no payment processor, timed pending hold configuration, full content CMS, or automated end-to-end test suite.

Official implementation references: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Supabase Next.js Auth](https://supabase.com/docs/guides/auth/quickstarts/nextjs), [Prisma Supabase integration](https://www.prisma.io/docs/orm/overview/databases/supabase).

## Reservation confirmation

Admins confirm reservations from `/admin/requests`, and customers can check their reservation status and details in their dashboard. Confirmation does not send an SMS.

Requests have search/status filters and expandable details. The sidebar count includes reservations awaiting review, cancellation requests, and confirmed reservations with pending payment proofs, refreshed every 30 seconds while visible.

## Admin request details and deletion

The Requests page has a filterable transaction table on the left (transaction number, client name, status) and the selected request on the right with Overview, Travel & documents, Payment, and Actions tabs. Selection is stored in the URL and defaults to the first matching request. On smaller screens the details appear below the table. Admins can permanently delete only CANCELLED, CONFIRMED, or REJECTED requests from Actions after confirming the consequences. The server rechecks status under vehicle/booking locks, deletes payment records and workflow data, and deletes the booking in one audited transaction. Deleting a confirmed booking releases its dates. PENDING and COMPLETED bookings cannot be deleted. The audit log retains the deleted booking reference, and reference allocation includes deleted references to prevent reuse. Uploaded storage objects are not removed by this transaction; they become inaccessible through the booking document routes once the booking is deleted. No live records were deleted during development.

## Vehicle photo manager

In Admin > Vehicles, expand Manage vehicle photos to see thumbnails, preview photos with zoom, and delete individual images after confirmation. Apply `prisma/vehicle-photo-delete-policies.sql` in the Supabase SQL editor after `prisma/storage.sql` to allow application admins to read/delete vehicle-assets objects. Media records are removed first so Storage errors cannot keep deleted photos in the gallery. Storage cleanup is then attempted and any failure produces an admin warning and a vehicle-photo-cleanup-pending audit entry; external linked images are only unlinked. Public fleet pages are revalidated after upload/delete. Live Storage deletion was not performed during implementation. Storage and database changes cannot share a transaction: cleanup failures can leave an unused public file in Storage for the operator to remove. Relative local reference photos are unlinked without removing the shared local file.

## Self-drive license / LTMS OCR

Requirements submission scans the front of the driver's license and the complete LTMS digital ID screenshot locally using the installed Tesseract English model. These two uploads accept JPEG/PNG up to 5 MB; other document requirements still accept PDF. Both images must have a readable full name and one Philippine license number, and LTMS must contain the explicit text "Digital ID is Active". Names match after case, punctuation, accent, and name-order normalization; license numbers match after separator normalization. No fuzzy character substitutions are used. Unreadable, conflicting, inactive, or mismatched images return an error before any new requirements are uploaded or saved.

The extracted identity, checked file paths, active-text result, and check time are saved with the workflow. Replacing either document rechecks both images (including saved images), and concurrent document changes invalidate the submission. Self-drive payment submission and admin confirmation require a matching result tied to the current images. Existing pending self-drive requests without this result must resubmit requirements. This is OCR comparison, not LTO/LTMS authenticity, live status, expiry, or identity verification; admin document review is still required. No external OCR API receives the images. Low-quality images may be rejected and should be uploaded again clearly.

Run `node --conditions=react-server scripts/test-license-ocr.cjs` for an OCR smoke test with generated, non-personal fixtures. The attached example documents are not stored as test fixtures. Live Storage workflows and the user's actual photographs require manual integration testing.

Self-drive license and LTMS files are also scanned immediately after selection through an authenticated, ownership-scoped server action. Each upload card displays extracted name/number above the file input. A green license indicator means its text was readable; LTMS turns green only after its active text is detected and both identities match. These preliminary results do not save uploads or approve the reservation; requirements submission rechecks the actual files. Replacing an image clears its prior result, and stale scan responses are ignored. Booking errors appear as dismissible, non-blocking notification alerts.

LTMS active-status OCR now reads only the upper-left header region (left 75%, top 20% of the oriented screenshot), with a separate enlarged OCR pass before reading the full license card. An active phrase elsewhere in the image does not satisfy this check. Include the entire portal header in the screenshot. This is region-based OCR configuration, not model training or a live portal lookup.

The LTMS header scanner now tries a tight upper-left status strip first and a larger upper-left fallback. A minimum-RGB-channel black/white pass darkens bright green and blue text before OCR; a separate grayscale pass remains as a fallback. The explicit active phrase is still required, and inactive or missing status is rejected. Tests include a generated portal-style JPEG with a small, bright-green status label. The user's actual screenshot has not been automatically tested from the chat attachment.

Successful self-drive OCR scans now automatically persist the license/LTMS image in private booking Storage and save its path-bound extracted fields in the booking workflow before showing a green result. Reload restores the saved file preview and OCR details; matching LTMS status is recomputed from both saved identities. Uploads are merged under an owned pending-booking lock, and stale scans cannot overwrite newer scans. Saving resets requirementsSubmittedAt; it does not submit or approve the booking. Wait until checking/saving finishes before refreshing: an interrupted request that has not completed cannot be guaranteed saved. Unreadable images are not automatically saved. Other document uploads still save through Submit requirements. Live authenticated Storage/reload testing is required in the configured project.

## Innova route pricing and reservation payments

Apply the new migration with `npx prisma migrate deploy`, then regenerate the client with `npx prisma generate`. The migration adds per-vehicle distance-pricing settings to PricingRule. Configure a server-only `MAPBOX_ACCESS_TOKEN` in the environment. `MAPBOX_ORIGIN_ADDRESS` is an optional fallback; the preferred base pickup address is set in Admin > Pricing for Innova. Saved quotes use permanent Mapbox geocoding, which requires an account permitted to use permanent geocoding.

Admin pricing includes an optional additional fee (0 is valid), kilometer rate, full pickup address, one-way/round-trip setting, and distance-only/reference-plus-distance mode. Settings are snapshotted for new Innova with-driver reservations; self-drive keeps daily pricing. The supplied 12/24-hour area rates are displayed as a reference. Trips over 24 hours, destinations outside reference coverage, missing settings, and failed route lookups require a quotation in Requests > Actions. Date availability retains its existing exclusive return-date rule.

Route estimates appear when a customer leaves the destination field or selects Calculate driving distance. The server geocodes Philippine addresses, uses Mapbox driving distance, and recalculates on travel submission. Client prices are never trusted. Totals include the optional additional fee and existing security deposit. Confirmation still reserves dates immediately.

Online receipts must show exactly 50% of the booking total. This reservation payment is explicitly non-refundable and must be acknowledged before submission. Half-cent results round up to the nearest centavo. Receipts are checked during scanning, submission, and admin approval. The remaining balance is paid directly to TrustRide and recorded by an admin after receipt in Requests > Payment, allowing the calendar to reflect full payment.

## Security and delivery

See [SECURITY.md](SECURITY.md) for request limits, upload validation, role boundaries, required WAF/Redis settings, CI/CD setup, and the existing-database migration baseline requirement. CI runs automatically on pull requests and main/master pushes; releases are manually triggered after configuring the production environment.

## Password recovery

Forgot-password emails now target `/auth/callback?next=/reset-password`. The callback exchanges the single-use code for a verified session, then opens the new-password form. Expired links return to the email request page. Passwords must match and contain 10?128 characters; successful changes sign out existing sessions and return to sign-in.

In Supabase Auth URL Configuration, allow the exact production callback URL with `?next=/reset-password` and its local development equivalent. Set `NEXT_PUBLIC_SITE_URL` to the same canonical origin. For a custom recovery email template usable across browsers, link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`; the callback supports that verification flow as well as PKCE code links. Changes to the hosted URL allowlist/email template must be made in the Supabase project. No live recovery emails were sent during development verification.

## Page-loading caches

Fleet listing data is cached for 60 seconds; approved public testimonials for 5 minutes. Admin edits and photo changes invalidate the corresponding tags immediately. Availability, reservation/payment records, session checks, and authorization are read fresh. Profile lookups are deduplicated only within a single server request. Public `/images/` assets use browser caching for one day with background revalidation; use versioned URLs or new filenames when replacing images immediately. Nonce-protected HTML and private pages are not shared-cacheable. These data caches use Next's compatibility cache API without enabling Cache Components; a multi-instance self-hosted deployment needs a shared Next cache handler for immediate cross-instance invalidation.

## Profile photos and testimonial access

Profile settings support uploading or removing a JPEG/PNG photo (5 MB maximum). Files are decoded/re-encoded, cropped to 256 by 256 pixels, and saved under the authenticated user's folder in `profile-photos`. That bucket is public because profile photos appear in published testimonials; no identity documents belong there. Users can insert/read/delete their own folder only. A generated default user icon appears when no photo exists or loading fails. Replacing/removing a photo invalidates cached public testimonial data.

Guests see only published testimonials. Signed-in clients can select an eligible completed rental to submit star-rated feedback and view their own review statuses. The server continues to enforce ownership, completed status, and one testimonial per rental. Logged-in users visiting login, registration, or forgot-password pages redirect home; password-reset verification remains available.

Admin Customers now uses the Requests-style split table with server-side search, ten-row pagination, profile photos, and a selected customer contact/reservation panel. Client records remain behind administrator authorization.

## Delivered rental lifecycle

Pending requests require admin confirmation; payment never makes them Delivered directly. Confirmation may be approved with an unpaid balance. Confirmed reservations move to Delivered at the saved pickup date/time in Asia/Manila (legacy fallback 09:00), without requiring payment. The Supabase job `trustride-advance-deliveries` runs every minute; The schedule migration installs it when pg_cron is available; `prisma/schedule-deliveries.sql` can also install/repair it after migrations. Authenticated application reads also perform a throttled catch-up check. The database validates transitions and keeps Delivered periods reserved. Only Delivered can become Completed, and the admin form requires confirmation that the unit has been returned. No job completes rentals automatically. Outstanding balances remain payable and recordable after handover/completion.

Whenever changing Prisma schema, run `npm run db:generate` and restart `npm run dev`. An already-running Turbopack worker can retain an older generated client even when the client on disk is current. The singleton schema version is also bumped for this release to discard stale instances.
