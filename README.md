# PGhub

PG, hostel and rented-home marketplace for Gandhinagar and Ahmedabad. Next.js 16 + Supabase (Postgres, Auth, Storage, RLS).

## Structure
- `web/` Next.js app (seeker, owner dashboard, admin)
- `supabase/migrations/` schema, RLS, RPCs (apply in order)
- `scripts/import_seed.py` builds `db/seed.sql` from the Gandhinagar CSVs (not committed: contains owner phone numbers)
- `PLAN.md` product plan and build log

## Run locally
1. `cd web && npm install`
2. Create `web/.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL=...` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (publishable key)
3. `npm run dev -- -p 3100`

## Database
Apply `supabase/migrations/*.sql` in order (SQL editor or `supabase db push`). Never commit the database password.
First admin: sign in once, then run in the SQL editor:
`insert into user_roles(user_id, role) select id, 'super_admin' from profiles where email = 'YOU@EXAMPLE.COM';`

## Roles
seeker (default) - owner - moderator (approve/reject, reports, reviews) - admin (users, roles, ranking) - super_admin (grants admin).
Phone numbers are column-protected: visible only through the `reveal_phone` RPC after sign-in.
