
-- Running Order / Open Bill System
-- Adds session tracking, kitchen tickets, and modifies orders/order_items for append-only functionality

-- Add session_id to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS session_id uuid;

-- Update order status enum to support running order states
-- Note: Since status is text type, we don't need to change the type, just the allowed values
-- Status values: ACTIVE, SERVED, BILL_REQUESTED, CLOSED (in addition to existing ones)
-- Payment status values: PENDING, PAID

-- Create kitchen_tickets table
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  ticket_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add ticket_id to order_items table
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.kitchen_tickets(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order_id ON public.kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_id ON public.order_items(ticket_id);

-- Update existing orders to have a session_id if they don't have one
-- For backward compatibility, we'll set session_id = id for existing orders
DO $$
BEGIN
  UPDATE public.orders 
  SET session_id = id 
  WHERE session_id IS NULL;
END $$;

-- Create a function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number(order_id uuid)
RETURNS text AS 
DECLARE
  ticket_count integer;
  ticket_num text;
BEGIN
  SELECT COUNT(*) INTO ticket_count 
  FROM public.kitchen_tickets 
  WHERE order_id = generate_ticket_number.order_id;
  
  ticket_num := 'KT-' || (ticket_count + 1);
  RETURN ticket_num;
END;
 LANGUAGE plpgsql;

-- Trigger to set ticket_number before insert
CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.kitchen_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number(NEW.order_id);
