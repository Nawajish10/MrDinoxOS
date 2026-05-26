-- Multi-tenant & product catalog schema for scaling
-- Run this in Supabase SQL editor after applying primary schema (001_full_schema.sql)

-- Tenants (organizations)
CREATE TABLE IF NOT EXISTS public.tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  billing_plan text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link restaurants to tenants (adds tenant_id to restaurants)
ALTER TABLE IF EXISTS public.restaurants
  ADD COLUMN IF NOT EXISTS tenant_id text REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Global product catalog (shared products across tenants)
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  sku text UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  default_price numeric DEFAULT 0,
  default_is_veg boolean DEFAULT false,
  default_is_spicy boolean DEFAULT false,
  default_is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Restaurant specific product overrides (price, availability, name, images)
CREATE TABLE IF NOT EXISTS public.product_restaurants (
  id text PRIMARY KEY,
  product_id text REFERENCES public.products(id) ON DELETE CASCADE,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text,
  description text,
  price numeric,
  discounted_price numeric,
  image_url text,
  is_available boolean,
  is_veg boolean,
  is_spicy boolean,
  stock integer DEFAULT NULL,
  is_infinite_stock boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, restaurant_id)
);

-- Inventory adjustments / history per restaurant product
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_restaurant_id text REFERENCES public.product_restaurants(id) ON DELETE CASCADE,
  change integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Tenant users (admin users scoped to a tenant)
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id text PRIMARY KEY,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Role and permissions (simple RBAC model)
CREATE TABLE IF NOT EXISTS public.roles (
  id text PRIMARY KEY,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id text PRIMARY KEY,
  role_id text REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id text REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  role_id text REFERENCES public.roles(id) ON DELETE CASCADE,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_id, tenant_id)
);

-- Indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_product_restaurant_restaurant ON public.product_restaurants (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_product_restaurant_product ON public.product_restaurants (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON public.inventory_transactions (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_restaurants ON public.restaurants (tenant_id);

-- Sample tenant and a product mapping for local dev
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = 'tenant-demo') THEN
    INSERT INTO public.tenants (id, name, slug) VALUES ('tenant-demo', 'Demo Tenant', 'demo-tenant');
  END IF;

  -- attach existing demo restaurant to tenant-demo
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = '123456') THEN
    UPDATE public.restaurants SET tenant_id = 'tenant-demo' WHERE id = '123456';
  END IF;

  -- create a product and map to restaurant
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'prod-1') THEN
    INSERT INTO public.products (id, sku, name, description, default_price)
    VALUES ('prod-1', 'DEMO-SALAD', 'Demo Salad', 'Global catalog demo salad', 199);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.product_restaurants WHERE id = 'pr-1') THEN
    INSERT INTO public.product_restaurants (id, product_id, restaurant_id, name, price, is_available, is_veg)
    VALUES ('pr-1', 'prod-1', '123456', 'Demo Salad', 199, true, true);
  END IF;
END
$$;

-- Done
