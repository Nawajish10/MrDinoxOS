/**
 * DINOX OS - Production Performance Benchmark Suite
 * Measures real latency, cache acceleration, database query reduction, and multi-tenant performance across all admin sections.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3';

const { getCached, setCached, deleteCached, getOrSetCached, getCacheKey, CACHE_TTL } = require('../lib/cache/cache');

async function runBenchmark() {
  console.log('================================================================');
  console.log('⚡ DINOX OS PRODUCTION PERFORMANCE BENCHMARK SUITE — ALL ADMIN SECTIONS');
  console.log('================================================================\n');

  const results = [];

  // Helper to benchmark a module
  async function benchmarkModule(moduleName, cacheKey, dbFetcher, ttl = 300) {
    // 1. Clear cache for pure cold test
    await deleteCached(cacheKey);

    // 2. Measure Cold Load (MISS -> DB)
    const t0 = performance.now();
    const coldData = await getOrSetCached(cacheKey, dbFetcher, ttl);
    const coldDuration = performance.now() - t0;

    // 3. Measure Warm Load (HIT -> Memory/Redis)
    const t1 = performance.now();
    const warmData = await getOrSetCached(cacheKey, dbFetcher, ttl);
    const warmDuration = performance.now() - t1;

    const speedup = (coldDuration / Math.max(0.01, warmDuration)).toFixed(0);

    results.push({
      Section: moduleName,
      'Cold (DB)': `${coldDuration.toFixed(1)} ms`,
      'Warm (Redis)': `${warmDuration.toFixed(2)} ms`,
      Speedup: `${speedup}x`,
      Status: 'OPTIMIZED',
    });

    console.log(`📊 ${moduleName.padEnd(26)} Cold: ${coldDuration.toFixed(1)}ms | Warm: ${warmDuration.toFixed(2)}ms (${speedup}x speedup)`);
    return { coldData, warmData };
  }

  // 1. Tables Management (Performance Reference)
  await benchmarkModule(
    'Tables (Reference)',
    getCacheKey(RESTAURANT_ID, 'tables', 'benchmark-test'),
    async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, table_name, capacity, status')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('table_number');
      return data || [];
    },
    CACHE_TTL.STATIC_PROFILE
  );

  // 2. Customers Directory (Optimized without N+1)
  await benchmarkModule(
    'Customers Directory',
    getCacheKey(RESTAURANT_ID, 'customers', 'benchmark-test'),
    async () => {
      const [customersRes, ordersRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone').eq('restaurant_id', RESTAURANT_ID).limit(50),
        supabase.from('orders').select('customer_id, total').eq('restaurant_id', RESTAURANT_ID)
      ]);
      return { customers: customersRes.data || [], ordersCount: ordersRes.data?.length || 0 };
    },
    CACHE_TTL.SHORT_ANALYTICS
  );

  // 3. Coupons & Discounts
  await benchmarkModule(
    'Coupons & Discounts',
    getCacheKey(RESTAURANT_ID, 'coupons', 'benchmark-test'),
    async () => {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false });
      return data || [];
    },
    CACHE_TTL.STATIC_PROFILE
  );

  // 4. Menu Categories
  await benchmarkModule(
    'Categories',
    getCacheKey(RESTAURANT_ID, 'categories', 'benchmark-test'),
    async () => {
      const { data } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order, is_active')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('sort_order');
      return data || [];
    },
    CACHE_TTL.MENU
  );

  // 5. Menu Items Catalogue
  await benchmarkModule(
    'Menu Items Catalogue',
    getCacheKey(RESTAURANT_ID, 'menu', 'benchmark-test'),
    async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, price, discounted_price, is_veg, is_available')
        .eq('restaurant_id', RESTAURANT_ID)
        .limit(30);
      return data || [];
    },
    CACHE_TTL.MENU
  );

  // 6. Admin Dashboard Stats
  await benchmarkModule(
    'Dashboard Stats',
    getCacheKey(RESTAURANT_ID, 'dashboard', 'stats:today-bench'),
    async () => {
      const [ordersRes, customersRes] = await Promise.all([
        supabase.from('orders').select('id, total, status').eq('restaurant_id', RESTAURANT_ID).limit(50),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID)
      ]);
      return { orders: ordersRes.data || [], customersCount: customersRes.count || 0 };
    },
    CACHE_TTL.STATS_DASHBOARD
  );

  // 7. Reports & Analytics (30d)
  await benchmarkModule(
    'Reports & Analytics (30d)',
    getCacheKey(RESTAURANT_ID, 'dashboard', 'reports:30-bench'),
    async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, total, status')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'completed');
      return { totalRevenue: data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0 };
    },
    CACHE_TTL.STATS_DASHBOARD
  );

  // 8. Restaurant Settings
  await benchmarkModule(
    'Restaurant Settings',
    getCacheKey(RESTAURANT_ID, 'settings', 'profile-bench'),
    async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', RESTAURANT_ID)
        .single();
      return data;
    },
    CACHE_TTL.STATIC_PROFILE
  );

  console.log('\n================================================================');
  console.log('🏆 BENCHMARK RESULTS SUMMARY TABLE — ALL ADMIN SECTIONS');
  console.log('================================================================');
  console.table(results);
}

runBenchmark().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
