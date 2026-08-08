-- DINOX OS - Performance & Multi-Tenant Composite Indexes Migration

-- 1. Menu Items: Composite index for fast category filtering & availability checks
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_cat_avail 
ON public.menu_items (restaurant_id, category_id, is_available) 
WHERE deleted_at IS NULL;

-- 2. Menu Items: Fast active menu catalogue retrieval
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_avail 
ON public.menu_items (restaurant_id, is_available) 
WHERE deleted_at IS NULL;

-- 3. Menu Categories: Ordered category listing
CREATE INDEX IF NOT EXISTS idx_menu_categories_rest_sort 
ON public.menu_categories (restaurant_id, sort_order) 
WHERE deleted_at IS NULL;

-- 4. Orders: Rapid recent orders retrieval and date-range filtering
CREATE INDEX IF NOT EXISTS idx_orders_rest_created_status 
ON public.orders (restaurant_id, created_at DESC, status);

-- 5. Orders: Fast revenue aggregation and payment status lookup
CREATE INDEX IF NOT EXISTS idx_orders_rest_payment_status 
ON public.orders (restaurant_id, payment_status, status);

-- 6. Order Items: Rapid join by order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);

-- 7. Restaurant Tables: Ordered table management
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_rest_num 
ON public.restaurant_tables (restaurant_id, table_number);

-- 8. Customers: Rapid lookup by phone and restaurant
CREATE INDEX IF NOT EXISTS idx_customers_rest_phone 
ON public.customers (restaurant_id, phone);
