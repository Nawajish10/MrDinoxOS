-- Migration to support the running bill system
-- Adds new columns to orders and creates table_sessions table

-- Add columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS is_open_bill boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_finished_ordering boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS served_at timestamptz;

-- Table sessions tracking (for active table occupancy)
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

-- Index for table sessions
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON public.table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant_id ON public.table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_order_id ON public.table_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON public.table_sessions(status);
