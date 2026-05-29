This folder contains SQL migrations for the Restaurant Admin Dashboard and instructions to apply them to your Supabase project.

Why: If your Supabase project is missing tables/columns referenced by the app (errors like "Could not find the table 'public.restaurants'" or missing columns such as `address`, `bill_id`, `item_name`), run the SQL below to ensure the schema is present.

Quick options to apply schema:

1) Supabase SQL Editor (recommended for quick fixes)
- Open https://app.supabase.com -> Your Project -> SQL Editor -> New query
- Copy the contents of `supabase/migrations/001_full_schema.sql` and run it.
- This will create all required tables and seed demo data.

2) Supabase CLI (local or CI)
- Install: https://supabase.com/docs/guides/cli
- Authenticate: `supabase login`
- From this repo root run:

```bash
supabase db remote set <your-db-connection-string>
psql <your-db-connection-string> -f supabase/migrations/001_full_schema.sql
```

3) Manual SQL (if you prefer)
- The file `supabase/migrations/001_full_schema.sql` is a full schema including `restaurants`, `menu_categories`, `menu_items`, `customers`, `restaurant_tables`, `orders`, and `order_items`.
- Run it in your Supabase project's SQL editor.

Notes & Troubleshooting:
- The app includes client-side fallbacks when the remote DB schema is missing. However, to enable full functionality (order persistence, real-time updates, coupons, etc.) apply the SQL migration to your Supabase project.
- If you see errors about relationships (e.g., "Could not find a relationship between 'orders' and 'restaurant_tables'"), re-run the full migration above — it creates foreign keys and indexes.
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` point to the correct Supabase project.

If you'd like, I can try to run the SQL against your Supabase project if you provide an admin connection string (not recommended to share secrets here). Alternatively I can generate a PowerShell or bash script to run the migration locally if you have `psql` access.
