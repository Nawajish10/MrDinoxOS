-- Minimal schema to run the demo locally
-- Run this in your Supabase SQL editor (it will create simple tables and seed sample data)

CREATE TABLE IF NOT EXISTS public.restaurants (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  phone text,
  whatsapp_number text,
  email text,
  address text,
  city text,
  logo_url text,
  banner_url text,
  upi_id text,
  upi_qr_url text,
  is_open boolean DEFAULT true,
  tax_percentage numeric DEFAULT 0,
  delivery_charge numeric DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  avg_preparation_time integer DEFAULT 15,
  opening_time text,
  closing_time text
);

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id text REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  discounted_price numeric,
  image_url text,
  is_veg boolean DEFAULT false,
  is_bestseller boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_spicy boolean DEFAULT false,
  spicy_level integer DEFAULT 0,
  is_available boolean DEFAULT true,
  preparation_time integer DEFAULT 10,
  serves text
);

-- Sample data: update the restaurant id if you set a different NEXT_PUBLIC_RESTAURANT_ID
INSERT INTO public.restaurants (id, name, tagline, phone, city)
VALUES ('123456', 'Demo Restaurant', 'Tasty & Healthy', '0000000000', 'DemoCity')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_categories (id, restaurant_id, name, sort_order)
VALUES ('cat-1', '123456', 'All', 0),
       ('cat-2', '123456', 'Starters', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_veg, is_available)
VALUES ('item-1', '123456', 'cat-1', 'Demo Salad', 'Fresh greens with dressing', 199, true, true),
       ('item-2', '123456', 'cat-2', 'Spicy Wings', 'Crispy chicken wings with spicy glaze', 349, false, true)
ON CONFLICT (id) DO NOTHING;
