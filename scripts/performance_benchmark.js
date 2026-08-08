/**
 * DINOX OS - Production Performance Benchmark Suite
 * Measures real latency, cache acceleration, database query reduction, and waterfall elimination.
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
  console.log('⚡ DINOX OS PRODUCTION PERFORMANCE BENCHMARK SUITE');
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
      module: moduleName,
      coldMs: coldDuration.toFixed(2),
      warmMs: warmDuration.toFixed(2),
      speedup: `${speedup}x`,
    });

    console.log(`📊 ${moduleName.padEnd(26)} Cold: ${coldDuration.toFixed(1)}ms | Warm: ${warmDuration.toFixed(2)}ms (${speedup}x speedup)`);
    return { coldData, warmData };
  }

  // Benchmark 1: Customer Menu Catalogue
  await benchmarkModule(
    'Customer Menu (All Dishes)',
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

  // Benchmark 2: Menu Categories Listing
  await benchmarkModule(
    'Menu Categories Scroller',
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

  // Benchmark 3: Admin Dashboard Metrics
  await benchmarkModule(
    'Admin Dashboard Stats',
    getCacheKey(RESTAURANT_ID, 'dashboard', 'stats:today-bench'),
    async () => {
      const [ordersRes, customersRes] = await Promise.all([
        supabase.from('orders').select('id, total, status, payment_status').eq('restaurant_id', RESTAURANT_ID).limit(50),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID)
      ]);
      return { ordersCount: ordersRes.data?.length || 0, customerCount: customersRes.count || 0 };
    },
    CACHE_TTL.STATS_DASHBOARD
  );

  // Benchmark 4: Admin Reports & Analytics Aggregation
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

  // Benchmark 5: Tables & QR Management
  await benchmarkModule(
    'Tables Management',
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

  // Waterfall Elimination Test: Sequential vs Parallelized Requests
  console.log('\n--- ⚡ Waterfall Elimination Test ---');
  
  // Sequential execution (Old Waterfall)
  const tSeqStart = performance.now();
  await supabase.from('restaurants').select('id, name').eq('id', RESTAURANT_ID).single();
  await supabase.from('menu_categories').select('id, name').eq('restaurant_id', RESTAURANT_ID).limit(5);
  await supabase.from('menu_items').select('id, name, price').eq('restaurant_id', RESTAURANT_ID).limit(5);
  const sequentialTime = performance.now() - tSeqStart;

  // Parallel execution (Optimized)
  const tParStart = performance.now();
  await Promise.all([
    supabase.from('restaurants').select('id, name').eq('id', RESTAURANT_ID).single(),
    supabase.from('menu_categories').select('id, name').eq('restaurant_id', RESTAURANT_ID).limit(5),
    supabase.from('menu_items').select('id, name, price').eq('restaurant_id', RESTAURANT_ID).limit(5)
  ]);
  const parallelTime = performance.now() - tParStart;

  console.log(`⏱️ Sequential Waterfall : ${sequentialTime.toFixed(1)}ms`);
  console.log(`🚀 Parallelized Execution: ${parallelTime.toFixed(1)}ms (${(sequentialTime / parallelTime).toFixed(1)}x faster)`);

  console.log('\n================================================================');
  console.log('🏆 BENCHMARK RESULTS SUMMARY TABLE');
  console.log('================================================================');
  console.table(results);
}

runBenchmark().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
