-- Full schema for Restaurant Admin Dashboard
-- Run in Supabase SQL Editor to create necessary tables and seed demo data for local development.

-- Restaurants
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
  closing_time text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu items
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
  serves text,
  stock integer DEFAULT NULL,
  is_infinite_stock boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  email text,
  address text,
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number integer NOT NULL,
  table_name text,
  capacity integer DEFAULT 1,
  status text DEFAULT 'available',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  bill_id text,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
  table_id text REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_type text,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  delivery_charge numeric DEFAULT 0,
  total numeric DEFAULT 0,
  special_instructions text,
  delivery_address text,
  estimated_time integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id text PRIMARY KEY,
  order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id text REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text,
  quantity integer DEFAULT 1,
  price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  special_instructions text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text DEFAULT 'percentage',
  discount_value numeric DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_discount numeric,
  usage_limit integer DEFAULT 0,
  used_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz DEFAULT (now() + interval '30 days'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON public.menu_categories (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant ON public.restaurant_tables (restaurant_id);

-- Sample seed data (adjust IDs to match your NEXT_PUBLIC_RESTAURANT_ID if needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = '123456') THEN
    INSERT INTO public.restaurants (id, name, tagline, phone, city)
    VALUES ('123456', 'Demo Restaurant', 'Fresh & Tasty', '+910000000000', 'DemoCity');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE id = 'cat-1') THEN
    INSERT INTO public.menu_categories (id, restaurant_id, name, sort_order)
    VALUES ('cat-1', '123456', 'All', 0), ('cat-2', '123456', 'Starters', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE id = 'item-1') THEN
    INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_veg, is_available)
    VALUES ('item-1', '123456', 'cat-1', 'Demo Salad', 'Fresh greens with zesty dressing', 199, true, true),
           ('item-2', '123456', 'cat-2', 'Spicy Wings', 'Crispy wings with hot glaze', 349, false, true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE id = 'table-1') THEN
    INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, table_name, capacity)
    VALUES ('table-1', '123456', 1, 'Front Table', 4), ('table-2', '123456', 2, 'Corner Booth', 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = 'cust-1') THEN
    INSERT INTO public.customers (id, restaurant_id, phone, name, created_at)
    VALUES ('cust-1', '123456', '911234567890', 'Demo Customer', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE id = 'coupon-1') THEN
    INSERT INTO public.coupons (id, restaurant_id, code, description, discount_type, discount_value, min_order_amount, usage_limit)
    VALUES ('coupon-1', '123456', 'WELCOME10', '10% off for new customers', 'percentage', 10, 0, 100);
  END IF;
END
$$;

-- Done
