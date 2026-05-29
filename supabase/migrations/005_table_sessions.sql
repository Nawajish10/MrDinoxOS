-- Migration to support the running bill system and table_sessions
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS is_open_bill boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_finished_ordering boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS served_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_id uuid;

-- 2. Create table_sessions table
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id uuid REFERENCES public.restaurant_tables(id),
  restaurant_id uuid REFERENCES public.restaurants(id),
  order_id uuid REFERENCES public.orders(id),
  customer_name text,
  customer_phone text,
  status text DEFAULT 'active', -- active, closed
  started_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON public.table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant_id ON public.table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_order_id ON public.table_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON public.table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);
