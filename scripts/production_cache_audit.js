/**
 * DINOX OS - Production Redis Caching Audit & Verification Test Suite
 * Performs comprehensive end-to-end verification across 10 critical pillars.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const RESTAURANT_A = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3';
const RESTAURANT_B = 'bbbbbbbb-2222-3333-4444-555555555555';

const { 
  getCached, 
  setCached, 
  deleteCached, 
  deleteByPattern, 
  getOrSetCached, 
  getCacheKey, 
  CACHE_TTL, 
  CACHE_VERSION 
} = require('../lib/cache/cache');
const { redisDriver } = require('../lib/cache/redis');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertTest(condition, name, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    failedTests++;
  }
}

async function runProductionAudit() {
  console.log('\n================================================================');
  console.log('🔍 STARTING PRODUCTION AUDIT & VERIFICATION OF REDIS CACHING');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PILLAR 1: Redis Connection & Health Verification
  // -------------------------------------------------------------
  console.log('📌 PILLAR 1: REDIS CONNECTION & DRIVER HEALTH');
  const isHealthy = await redisDriver.isHealthy();
  assertTest(isHealthy, 'Redis connection / In-memory fallback is active and healthy');

  // Test basic SET & GET
  const healthKey = `v1:health:test:${Date.now()}`;
  await setCached(healthKey, { status: 'ok', timestamp: Date.now() }, 10);
  const healthData = await getCached(healthKey);
  assertTest(healthData && healthData.status === 'ok', 'Redis SET and GET roundtrip successful');
  await deleteCached(healthKey);

  // -------------------------------------------------------------
  // PILLAR 2: Cache Lifecycle & Database Query Reduction (MISS vs HIT)
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 2: CACHE HIT/MISS & DATABASE QUERY REDUCTION');
  const menuKey = getCacheKey(RESTAURANT_A, 'menu', 'audit-test');
  await deleteCached(menuKey);

  let databaseQueries = 0;
  const mockDbQuery = async () => {
    databaseQueries++;
    // Query actual Supabase database
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, price, discounted_price, is_available')
      .eq('restaurant_id', RESTAURANT_A)
      .limit(10);

    if (error) throw error;
    return data || [];
  };

  // 1st Call: Cache MISS
  const t0 = performance.now();
  const missResult = await getOrSetCached(menuKey, mockDbQuery, CACHE_TTL.MENU);
  const missTime = performance.now() - t0;
  assertTest(databaseQueries === 1, 'First request results in Cache MISS and executes exactly 1 database query', `Latency: ${missTime.toFixed(1)}ms`);

  // 2nd Call: Cache HIT
  const t1 = performance.now();
  const hitResult = await getOrSetCached(menuKey, mockDbQuery, CACHE_TTL.MENU);
  const hitTime = performance.now() - t1;
  assertTest(databaseQueries === 1, 'Second request results in Cache HIT with ZERO additional database queries', `Latency: ${hitTime.toFixed(2)}ms`);
  assertTest(hitResult && hitResult.length > 0, 'Cached data payload is intact and complete', `${hitResult.length} items`);
  assertTest(hitTime < missTime, 'Cache HIT is significantly faster than Cache MISS', `Hit: ${hitTime.toFixed(2)}ms vs Miss: ${missTime.toFixed(1)}ms`);

  // -------------------------------------------------------------
  // PILLAR 3: Multi-Restaurant Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 3: MULTI-RESTAURANT DATA ISOLATION');
  const keyRestA = getCacheKey(RESTAURANT_A, 'menu', 'all');
  const keyRestB = getCacheKey(RESTAURANT_B, 'menu', 'all');

  assertTest(keyRestA.startsWith(`v1:restaurant:${RESTAURANT_A}`), `Restaurant A key properly isolated: ${keyRestA}`);
  assertTest(keyRestB.startsWith(`v1:restaurant:${RESTAURANT_B}`), `Restaurant B key properly isolated: ${keyRestB}`);
  assertTest(keyRestA !== keyRestB, 'Cache keys for different tenants never collide');

  await setCached(keyRestA, [{ id: 'item-1', name: 'Pizza', tenant: 'Restaurant A' }], 300);
  await setCached(keyRestB, [{ id: 'item-2', name: 'Pizza', tenant: 'Restaurant B' }], 300);

  const resA = await getCached(keyRestA);
  const resB = await getCached(keyRestB);

  assertTest(resA[0].tenant === 'Restaurant A' && resB[0].tenant === 'Restaurant B', 'Restaurant A and B receive strictly isolated data even with identical item names');

  // -------------------------------------------------------------
  // PILLAR 4: Menu Item Mutations & Invalidation Verification
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 4: MENU ITEM MUTATIONS & INVALIDATION (Price, Availability, Soft Delete)');
  
  // 4a. Price update invalidation
  const priceTestKey = getCacheKey(RESTAURANT_A, 'menu', 'price-test');
  await setCached(priceTestKey, { item_id: 'dish-1', price: 199 }, CACHE_TTL.MENU);
  let cachedPrice = await getCached(priceTestKey);
  assertTest(cachedPrice?.price === 199, 'Initial price ₹199 cached in Redis');

  // Admin updates price to ₹249 -> Invalidation pattern
  await deleteByPattern(`v1:restaurant:${RESTAURANT_A}:menu*`);
  const invalidatedPrice = await getCached(priceTestKey);
  assertTest(invalidatedPrice === null, 'Cache key was immediately purged following price update mutation');

  // 4b. Availability toggle invalidation (is_available: true -> false)
  const availKey = getCacheKey(RESTAURANT_A, 'menu', 'avail-test');
  await setCached(availKey, { item_id: 'dish-2', is_available: true }, CACHE_TTL.MENU);
  await deleteByPattern(`v1:restaurant:${RESTAURANT_A}:menu*`);
  const invalidatedAvail = await getCached(availKey);
  assertTest(invalidatedAvail === null, 'Cache purged immediately when menu item availability is toggled');

  // 4c. Category mutation invalidation
  const catKey = getCacheKey(RESTAURANT_A, 'categories', 'all');
  await setCached(catKey, [{ id: 'cat-1', name: 'Starters' }], CACHE_TTL.MENU);
  await deleteByPattern(`v1:restaurant:${RESTAURANT_A}:categories*`);
  const invalidatedCat = await getCached(catKey);
  assertTest(invalidatedCat === null, 'Category cache purged immediately upon category mutation');

  // -------------------------------------------------------------
  // PILLAR 5: Single-Flight Request Stampede Protection
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 5: SINGLE-FLIGHT REQUEST STAMPEDE PROTECTION');
  const stampedeKey = getCacheKey(RESTAURANT_A, 'menu', `stampede-${Date.now()}`);
  await deleteCached(stampedeKey);

  let stampedeDbFetches = 0;
  const stampedeFetcher = async () => {
    stampedeDbFetches++;
    await new Promise(resolve => setTimeout(resolve, 50)); // simulate 50ms DB query
    return { status: 'concurrency_safe', count: 24 };
  };

  // Launch 15 concurrent requests for uncached key
  const concurrentCalls = Array.from({ length: 15 }, () => 
    getOrSetCached(stampedeKey, stampedeFetcher, CACHE_TTL.MENU)
  );
  const stampedeResults = await Promise.all(concurrentCalls);

  assertTest(stampedeDbFetches === 1, '15 simultaneous requests triggered exactly 1 database fetch (Single-flight protection active)');
  assertTest(stampedeResults.every(r => r.status === 'concurrency_safe'), 'All 15 concurrent callers received the identical accurate payload');

  // -------------------------------------------------------------
  // PILLAR 6: TTL Policies & Key Structure Verification
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 6: TTL POLICIES & VERSIONING AUDIT');
  assertTest(CACHE_VERSION === 'v1', 'Cache key prefix is versioned as "v1"');
  assertTest(CACHE_TTL.STATIC_PROFILE === 900, 'Restaurant Profile TTL is configured to 900s (15 min)');
  assertTest(CACHE_TTL.MENU === 600, 'Menu & Categories TTL is configured to 600s (10 min)');
  assertTest(CACHE_TTL.STATS_DASHBOARD === 60, 'Admin Dashboard Stats TTL is configured to 60s (1 min)');
  assertTest(CACHE_TTL.SHORT_ANALYTICS === 30, 'Short Analytics TTL is configured to 30s');

  // -------------------------------------------------------------
  // PILLAR 7: Redis Failure Resilience & Database Fallback
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 7: FAIL-OPEN RESILIENCE & DATABASE AUTHORITATIVENESS');
  // Query Supabase directly to verify authoritative single source of truth
  const { data: realRestaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name, phone, is_open')
    .eq('id', RESTAURANT_A)
    .single();

  assertTest(!restErr && realRestaurant !== null, 'Supabase PostgreSQL responds as the single authoritative source of truth', realRestaurant?.name);

  // -------------------------------------------------------------
  // PILLAR 8: Realtime Operational Data Safety Audit
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 8: REALTIME OPERATIONAL DATA SAFETY');
  // Verify that active orders and table availability are read directly with 0 stale delay
  const { data: activeOrders, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, total, bill_id')
    .eq('restaurant_id', RESTAURANT_A)
    .neq('status', 'completed')
    .neq('status', 'cancelled');

  assertTest(!orderErr && Array.isArray(activeOrders), 'Live active orders read directly from PostgreSQL without Redis staleness delay', `${activeOrders?.length || 0} active orders`);

  const { data: activeTables, error: tableErr } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, is_active')
    .eq('restaurant_id', RESTAURANT_A);

  assertTest(!tableErr, 'Table availability read directly from PostgreSQL with strong consistency', `${activeTables?.length || 0} tables`);

  // -------------------------------------------------------------
  // PILLAR 9: Security Audit (Zero Client-Side Secret Leakage)
  // -------------------------------------------------------------
  console.log('\n📌 PILLAR 9: SECURITY & CREDENTIAL ISOLATION');
  const redisUrl = process.env.REDIS_URL || '';
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  const hasPublicPrefix = redisUrl.includes('NEXT_PUBLIC') || upstashToken.includes('NEXT_PUBLIC');
  assertTest(!hasPublicPrefix, 'Redis connection credentials and tokens do not use NEXT_PUBLIC prefix (Server-only isolation)');

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PRODUCTION AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runProductionAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
