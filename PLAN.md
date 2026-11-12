# PG & Rented Home Platform - Project Plan (Ahmedabad + Gandhinagar)

Status: PLAN ONLY (12 Nov 2026). No code written yet. Seed data: `C:\Users\15ind\OneDrive\Desktop\PG\` (csv files).

## 1. What we are building
A marketplace where owners/brokers register **PGs/hostels and rented homes/flats** for **boys, girls (and both)** in **Ahmedabad and Gandhinagar**; admin approves; seekers search, compare, shortlist and contact. Ranking is transparent and quality-based.

Seed data already in hand (Gandhinagar): 537 PG/hostel records (199 boys, 141 girls, 38 both, 159 gender unknown), 150 ranked with fit score, 294 rental listings, 88 tiffin services. Ahmedabad data: none yet (needs scrape/import in phase 2).

## 2. Roles (role-based access)
| Role | Can do |
|---|---|
| Visitor (no login) | Browse, search, filter, map, view listing (phone hidden until login) |
| Seeker (login by phone OTP) | Save/shortlist, compare (up to 4), reviews, report listing, contact owner, visit-notes |
| Owner / Broker | Register property, manage rooms/beds/prices/photos, pause/unpause, see leads, claim imported listing, reply to reviews |
| Moderator | Review pending listings, approve / reject / request changes, handle reports |
| Admin | All moderator rights + users, roles, cities/areas, ranking weights, featured slots, imports, analytics |
| Super admin | Settings, audit logs, data export, billing (later) |
Implementation: roles in DB (`user_roles`), enforced by Postgres Row Level Security + server-side checks. Every admin action written to `audit_log`.

## 3. Core flows
1. **Owner registers**: OTP login -> choose type (PG / Rented home) -> multi-step form (basics, location pin, rooms & pricing, amenities, rules, photos, documents) -> Submit.
2. **Listing lifecycle**: `draft -> submitted -> in_review -> approved | changes_requested | rejected -> published -> paused | expired | archived`. Edits to published listings go to re-review for sensitive fields (price, address, phone).
3. **Admin approval**: queue with checklist (photos real, location matches, phone verified, no duplicate), one-click approve/reject with reason; owner notified (WhatsApp/SMS/email).
4. **Seeker**: search -> filter -> map/list -> listing page -> shortlist/compare -> call / WhatsApp / "request visit" -> (after visit) leave review.
5. **Imported listings**: shown as "Unverified (from public listings)". Owner can **Claim** (OTP to the listed number) -> becomes verified. Unclaimed ones rank lower.
6. **Reports**: "wrong number / fake / full / closed" -> moderator queue; repeated reports auto-hide.

## 4. Seeker side - pages
- Home: city switch (Ahmedabad/Gandhinagar), I-am-looking-for (PG / Rented home), for (Boys / Girls / Any), area search, budget, popular areas.
- Search results: list + map split view, sticky filters, sort (Best match, Price, Distance, Rating, Newest), saved search.
- Filters: type, gender, area/sector, budget range, sharing (1/2/3/4+), food included / tiffin / self-cook, AC, WiFi, laundry, parking, CCTV/security, gate timing, distance to a chosen place (office/college), furnished, BHK (rented), move-in date, verified only.
- Listing detail: photo gallery, price table by sharing, amenities, rules (gate time, guests), food menu/timing, location map + nearby, verified badges, rating breakdown (food, cleanliness, safety, owner), reviews, similar listings, contact bar (Call / WhatsApp / Request visit), report.
- Compare, Shortlist, My visits (notes + decision, like our Notion tracker), Profile.
- "Commute" feature: enter workplace/college -> distance and approx time for each listing (high value, we already do this by hand).
- Static: About, How it works, Safety tips for girls, Owner guide, Contact, Terms, Privacy.

## 5. Owner side - pages
Dashboard (listings + status, leads, views, calls), Add/Edit listing wizard, Rooms & availability (beds available now / from date), Price update, Photos manager, Leads inbox, Reviews + reply, Verification status, Plans (featured, later).

## 6. Admin side - pages
Dashboard (pending, reports, new users, listings by city), Approval queue, Listing editor, Users & roles, Owners (verification), Reports, Reviews moderation, Master data (cities, areas/sectors, amenities), Ranking config, Featured/ads, Import tool (CSV -> staging -> review -> publish), Duplicate finder/merge, Audit log, Analytics, Settings.

## 7. Ranking (transparent, configurable)
`score = 100 x (0.30 quality + 0.20 verification + 0.15 completeness + 0.15 freshness/availability + 0.10 responsiveness + 0.10 relevance)`
- quality: Bayesian-adjusted rating (we already use this: few reviews pulled toward mean), reviews count, complaint ratio; imported Google rating shown as "Google rating" with source, separate from on-platform rating.
- verification: phone OTP, owner claimed, admin visited/photos verified.
- completeness: photos, price, amenities, rules, address pin.
- freshness: updated in last 30 days, beds available.
- responsiveness: lead response time (later).
- relevance: query-time (distance to chosen place, budget fit, gender match).
Paid "Featured" shown separately labelled "Sponsored", never mixed silently. Weights editable by admin.

## 8. Data model (Postgres)
`users`, `user_roles`, `profiles`, `cities`, `areas` (city, name, sector, geo), `properties` (type pg|home, owner_id, gender pg: boys|girls|both, name, description, address, lat/lng (PostGIS), area_id, status, source imported|owner, claimed_by, phone, whatsapp, gate_time, rules jsonb, verified_level, score, timestamps), `units` (sharing, rent, deposit, food_included, ac, beds_total, beds_available; for homes: bhk, rent, furnishing, area_sqft), `amenities` + `property_amenities`, `photos`, `reviews` (rating parts, text, status), `leads` (type call|whatsapp|visit, property, user), `shortlists`, `visit_notes`, `reports`, `moderation_actions`, `audit_log`, `import_batches` + `import_rows`, `tiffin_services` (optional phase 3).
Seed mapping from our CSVs: Name, Phone, Gender (Maps) -> gender (unknown -> "not stated"), Category, Address, Area/Sector, lat/lng, Google rating, reviews, hours, review snippet -> imported fields; our fit score -> initial score; rentals csv -> `properties(type=home)` + `units`.

## 9. Tech stack (recommended)
- **Next.js (App Router) + TypeScript**, server components for fast SEO pages (listing and area pages must be indexable: "girls PG in Sector 3 Gandhinagar").
- **Supabase** (Postgres + PostGIS, Auth with phone OTP, Storage for photos, Row Level Security) - fastest path to role-based + live DB; can later move to self-hosted Postgres.
- **Maps:** MapLibre + OpenStreetMap tiles (no per-load cost) or Google Maps if budget allows (better POI data); geocoding for owner pin.
- **OTP/notifications:** MSG91 or Twilio (India DLT rules apply); WhatsApp Business API later.
- **Search:** start with Postgres full-text + filters; add Typesense/Meilisearch only if needed.
- **Images:** upload -> resize/WebP (Supabase transform or Cloudflare Images), watermark optional.
- **Hosting:** Vercel (app) + Supabase (DB); Cloudflare in front; Sentry + PostHog for errors/analytics.
- Admin panel: same Next.js app under `/admin`, role-guarded (not a separate generic admin template, so it matches the design).

## 10. Design direction (professional, not "AI-looking")
- Avoid purple/blue gradients, glass cards, emoji icons, generic hero with floating blobs, stock 3-card feature rows.
- Calm editorial feel: warm off-white background, one deep accent (e.g. forest green or ink-blue) + one signal colour for "verified", strong type pairing (e.g. a serif display like Fraunces/Newsreader for headings + Inter/Source Sans for UI), real photography of rooms, dense but clear information (price, gender, sharing, food, distance visible on every card - like the best classified/real-estate sites).
- Components: custom design tokens, consistent 8px grid, accessible contrast (WCAG AA), keyboard navigable, mobile-first (most users on phone), fast (LCP < 2.5 s), Gujarati + Hindi + English (i18n from day 1).
- Trust UI for girls' safety: verified badge levels, gate timing, CCTV/warden, "women only" filter, report button, safety guide.
- Design process: wireframes (Figma) -> design system -> clickable prototype -> build. Get the user's approval at wireframe stage.

## 11. Trust, legal, risk (decide early)
- **Scraped data:** Google Maps data is used as an initial seed. Do not reproduce Google reviews/photos verbatim at scale; show our own score + "Google rating (source)" link, let owners claim/correct/remove. Prefer owner-submitted data over time. Get legal advice before public launch.
- Phone numbers are personal data: login required to see, rate-limit reveals, honour removal requests (DPDP Act 2023). Privacy policy + consent.
- Fake listings/brokers: OTP on listed number, admin photo review, duplicate detection, report system, owner vs broker label.
- Girls' safety and discrimination rules: neutral wording; moderate abusive reviews.
- Payments not needed in v1 (contact-only). Monetisation later: featured listing, owner subscription, lead packs.

## 12. Phases
| Phase | Scope | Est. |
|---|---|---|
| 0 Discovery | Confirm decisions (section 14), brand/name, wireframes, design system | 1-2 wk |
| 1 MVP | Auth (OTP), roles, owner register PG/home, admin approval queue, public search + map + detail, import 537 PG + 294 homes, basic ranking, shortlist, report | 5-6 wk |
| 2 Growth | Reviews, compare, commute calculator, lead tracking, visit notes, owner dashboard analytics, Ahmedabad data import, SEO pages, Gujarati/Hindi | 4-5 wk |
| 3 Scale | Featured/ads, WhatsApp notifications, tiffin directory, saved searches/alerts, mobile app/PWA, payments (token/booking) | later |
Timeline assumes 1-2 developers + 1 designer; MVP can be done faster with our existing data and scripts.

## 13. First build steps (when we start)
1. Create repo + Supabase project; schema + RLS migrations.
2. Write importer: our CSVs -> `import_rows` -> dedupe (same phone/name/location) -> `properties` with `source=imported, status=published_unverified`.
3. Build design system + listing card + search page (the heart of the product).
4. Owner wizard + admin queue.
5. Ranking function (SQL) + nightly recompute.

## 14. Decisions needed from you
1. Brand name and domain.
2. Free listing for owners at launch? (recommended: free in v1, monetise later)
3. Are we OK showing imported (unclaimed) listings publicly with an "Unverified" label?
4. Show phone number openly, or only after login (recommended)?
5. Languages: English + Gujarati + Hindi at MVP, or English first?
6. Budget for maps/OTP (OpenStreetMap + MSG91 is cheapest).
7. Who will do admin approvals (you, team)? How many moderators?
8. Ahmedabad data: scrape the same way as Gandhinagar (we have the method) - yes?

## 15. DECISIONS LOCKED (12 Nov 2026, "Recommended rakho")
1. Brand: placeholder "PGhub" until you pick a name/domain.
2. Owner listing: free in v1; monetise later (featured / subscription).
3. Imported listings: public with "Unverified" label; owner can claim via OTP.
4. Phone numbers: visible only after login (reveal is logged as a lead, rate-limited).
5. Languages: i18n built in from day 1; English content first, Gujarati + Hindi in phase 2.
6. Stack: Next.js + Supabase + MapLibre/OpenStreetMap + MSG91 OTP + Vercel.
7. Moderation: you (admin) at start; moderators added later via roles.
8. Ahmedabad data: scrape with the same method in phase 2.

## 16. Built so far
- `db/schema.sql` - tables, enums, indexes, RLS rules (NOT yet run on a real Postgres). Known gap: `pub_read` policy exposes the phone column; replace with a column-restricted view + `reveal_phone()` RPC (migration 002).
- `scripts/import_seed.py` -> `db/seed.sql`: 511 unique Gandhinagar PGs (194 boys, 139 girls, 19 both, 159 gender not stated) + 279 rented homes, all imported/unverified/published. Run: `python scripts/import_seed.py`. Dedupes by name + phone/coords.
- Data copy: `PG/` folder (CSVs, PDFs, Notion/WhatsApp work).
Next: create Supabase project, run schema + seed, then Next.js app + design system (wireframes first).

## 17. Build log - Step 1 done (12 Nov 2026)
Running locally: `cd web && node scripts_devdb.mjs` (embedded Postgres on :54329, auto-loads schema + seed on first run, no Docker needed) then `npm run dev -- -p 3100`.
Built: Next.js 16 app in `web/` (cacheComponents turned OFF in next.config.ts), design tokens (forest green / warm paper / Fraunces + Inter), Home, Search (filters: city, type, gender, text, min/max rent, sort, pagination), Property detail (rooms table, details, OSM map embed, nearby), List-property placeholder. Ranking = Bayesian-adjusted Google rating for now.
Schema changed to plain lat/lng (PostGIS removed) so it also runs on the local Postgres; add PostGIS on Supabase later if radius queries are needed.
NOT built yet (next steps, in order): 1) auth (phone OTP) + roles + phone reveal RPC, 2) owner wizard + photos, 3) admin approval queue, 4) reviews/shortlist/compare/commute, 5) Ahmedabad import, 6) Supabase deploy.
