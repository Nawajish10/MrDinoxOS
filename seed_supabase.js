require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID;

// Helper to generate UUID
const generateUuid = () => randomUUID();

async function seed() {
   // Generate UUIDs for seed data
   const category1Id = generateUuid();
   const category2Id = generateUuid();
   const item1Id = generateUuid();
   const item2Id = generateUuid();
   const table1Id = generateUuid();
   const table2Id = generateUuid();
   const customerId = generateUuid();
   const couponId = generateUuid();

   // Restaurant
   const { data: rest, error: restErr } = await supabase
     .from('restaurants')
     .upsert({
       id: restaurantId,
       name: 'Demo Restaurant',
       tagline: 'Fresh & Tasty',
       phone: '+910000000000',
       city: 'DemoCity',
     }, { onConflict: 'id' });
   if (restErr) console.error('Restaurant upsert error', restErr);
   else console.log('Restaurant upserted', rest);

   // Categories
   const categories = [
     { id: category1Id, restaurant_id: restaurantId, name: 'All', sort_order: 0 },
     { id: category2Id, restaurant_id: restaurantId, name: 'Starters', sort_order: 1 },
   ];
   const { error: catErr } = await supabase.from('menu_categories').upsert(categories, { onConflict: 'id' });
   if (catErr) console.error('Categories upsert error', catErr);
   else console.log('Categories upserted');

   // Items
   const items = [
     { id: item1Id, restaurant_id: restaurantId, category_id: category1Id, name: 'Demo Salad', description: 'Fresh greens with zesty dressing', price: 199, is_veg: true, is_available: true },
     { id: item2Id, restaurant_id: restaurantId, category_id: category2Id, name: 'Spicy Wings', description: 'Crispy wings with hot glaze', price: 349, is_veg: false, is_available: true },
   ];
   const { error: itemErr } = await supabase.from('menu_items').upsert(items, { onConflict: 'id' });
   if (itemErr) console.error('Items upsert error', itemErr);
   else console.log('Items upserted');

   // Tables
   const tables = [
     { id: table1Id, restaurant_id: restaurantId, table_number: 1, table_name: 'Front Table', capacity: 4 },
     { id: table2Id, restaurant_id: restaurantId, table_number: 2, table_name: 'Corner Booth', capacity: 4 },
   ];
   const { error: tableErr } = await supabase.from('restaurant_tables').upsert(tables, { onConflict: 'id' });
   if (tableErr) console.error('Tables upsert error', tableErr);
   else console.log('Tables upserted');

   // Customer
   const { error: custErr } = await supabase.from('customers').upsert({
     id: customerId,
     restaurant_id: restaurantId,
     phone: '911234567890',
     name: 'Demo Customer',
   }, { onConflict: 'id' });
   if (custErr) console.error('Customer upsert error', custErr);
   else console.log('Customer upserted');

   // Coupon
   const { error: couponErr } = await supabase.from('coupons').upsert({
     id: couponId,
     restaurant_id: restaurantId,
     code: 'WELCOME10',
     description: '10% off for new customers',
     discount_type: 'percentage',
     discount_value: 10,
     min_order_amount: 0,
     usage_limit: 100,
     is_active: true,
   }, { onConflict: 'id' });
   if (couponErr) console.error('Coupon upsert error', couponErr);
   else console.log('Coupon upserted');
 }

 seed().then(() => console.log('Seeding complete')).catch(e => console.error('Seed failed', e));
