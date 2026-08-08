-- Migration 006: Grant public access and configure permissive RLS policies for unified restaurant operations
-- Run this in your Supabase SQL Editor if you wish to allow direct client-side reads & writes alongside server APIs.

-- 1. Ensure RLS is enabled or permissive on core restaurant tables
ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy restrictive policies if they exist
DROP POLICY IF EXISTS "Allow anon all on restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow anon all on restaurant_tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Allow anon all on menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow anon all on menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow anon all on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow anon all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon all on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon all on kitchen_tickets" ON public.kitchen_tickets;
DROP POLICY IF EXISTS "Allow anon all on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow anon all on table_sessions" ON public.table_sessions;

-- 3. Create permissive policies for public/anon/authenticated access
CREATE POLICY "Allow anon all on restaurants" ON public.restaurants FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on restaurant_tables" ON public.restaurant_tables FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on menu_categories" ON public.menu_categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on menu_items" ON public.menu_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on customers" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on order_items" ON public.order_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on kitchen_tickets" ON public.kitchen_tickets FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on coupons" ON public.coupons FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on table_sessions" ON public.table_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Grant all permissions to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
