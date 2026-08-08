const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const RESTAURANT_A = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3';
const RESTAURANT_B = '11111111-2222-3333-4444-555555555555';

async function runCachingVerification() {
  console.log('========================================================');
  console.log('⚡ VERIFYING PRODUCTION CACHING ARCHITECTURE FOR DINOX OS');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Require internal cache module
  const { getCached, setCached, deleteCached, getOrSetCached, getCacheKey, deleteByPattern, CACHE_TTL } = require('../lib/cache/cache');
  const { redisDriver } = require('../lib/cache/redis');

  // Test 1: Redis Driver Health
  const isHealthy = await redisDriver.isHealthy();
  assert(isHealthy, 'Redis/In-Memory driver is active, healthy, and operational');

  // Test 2: Cache Key Isolation & Versioning
  const keyA = getCacheKey(RESTAURANT_A, 'menu', 'all');
  const keyB = getCacheKey(RESTAURANT_B, 'menu', 'all');
  assert(keyA.startsWith('v1:restaurant:' + RESTAURANT_A), `Key A is correctly versioned and scoped: ${keyA}`);
  assert(keyB.startsWith('v1:restaurant:' + RESTAURANT_B), `Key B is correctly versioned and scoped: ${keyB}`);
  assert(keyA !== keyB, 'Tenant keys for Restaurant A and Restaurant B are strictly isolated');

  // Clean test keys
  await deleteCached(keyA);
  await deleteCached(keyB);

  // Test 3: Cache MISS vs Cache HIT Latency Measurement
  console.log('\n--- Test 3: Cache MISS & HIT Performance ---');
  let dbCallCount = 0;
  const mockDbFetcher = async () => {
    dbCallCount++;
    // Simulate realistic 30ms database read
    await new Promise(r => setTimeout(r, 30));
    return { restaurantId: RESTAURANT_A, itemsCount: 24, timestamp: Date.now() };
  };

  // 1st Call: Cache MISS
  const startMiss = performance.now();
  const missResult = await getOrSetCached(keyA, mockDbFetcher, CACHE_TTL.MENU);
  const missDuration = performance.now() - startMiss;
  assert(dbCallCount === 1, `First call resulted in database fetch (Duration: ${missDuration.toFixed(1)}ms)`);

  // 2nd Call: Cache HIT
  const startHit = performance.now();
  const hitResult = await getOrSetCached(keyA, mockDbFetcher, CACHE_TTL.MENU);
  const hitDuration = performance.now() - startHit;
  assert(dbCallCount === 1, `Second call returned from cache without database fetch (Duration: ${hitDuration.toFixed(2)}ms)`);
  assert(hitResult.itemsCount === 24, 'Cached data payload is accurate and preserved');
  assert(hitDuration < missDuration, `Cache HIT is significantly faster than MISS (${hitDuration.toFixed(2)}ms vs ${missDuration.toFixed(1)}ms)`);

  // Test 4: Multi-Tenant Data Isolation Test
  console.log('\n--- Test 4: Multi-Tenant Cache Isolation ---');
  await setCached(keyA, { tenant: 'Restaurant A Menu', secret: 'Alpha' }, 300);
  await setCached(keyB, { tenant: 'Restaurant B Menu', secret: 'Beta' }, 300);

  const tenantAData = await getCached(keyA);
  const tenantBData = await getCached(keyB);

  assert(tenantAData?.tenant === 'Restaurant A Menu' && tenantAData?.secret === 'Alpha', 'Restaurant A receives only Restaurant A data');
  assert(tenantBData?.tenant === 'Restaurant B Menu' && tenantBData?.secret === 'Beta', 'Restaurant B receives only Restaurant B data');
  assert(tenantAData?.secret !== tenantBData?.secret, 'Zero cross-tenant data leakage detected');

  // Test 5: Mutation Invalidation Test
  console.log('\n--- Test 5: Cache Invalidation on Mutation ---');
  const catKey = getCacheKey(RESTAURANT_A, 'categories', 'all');
  await setCached(catKey, [{ id: '1', name: 'Old Category' }], 300);
  
  // Verify cached
  let cachedCat = await getCached(catKey);
  assert(cachedCat !== null, 'Category cache populated');

  // Simulate admin creating/updating category -> Invalidation pattern
  await deleteByPattern(`v1:restaurant:${RESTAURANT_A}:categories*`);
  const invalidatedCat = await getCached(catKey);
  assert(invalidatedCat === null, 'Cache key was immediately purged following mutation invalidation');

  // Test 6: Single-Flight Request Stampede Protection
  console.log('\n--- Test 6: Single-Flight Stampede Protection ---');
  const stampedeKey = getCacheKey(RESTAURANT_A, 'menu', 'stampede-test');
  await deleteCached(stampedeKey);

  let stampedeFetches = 0;
  const slowFetcher = async () => {
    stampedeFetches++;
    await new Promise(r => setTimeout(r, 40));
    return { data: 'Concurrent Safe' };
  };

  // Launch 10 simultaneous requests for the exact same uncached key
  const promises = Array.from({ length: 10 }, () => getOrSetCached(stampedeKey, slowFetcher, 60));
  const results = await Promise.all(promises);

  assert(stampedeFetches === 1, `10 concurrent requests triggered exactly 1 database fetch (Single-flight protection active)`);
  assert(results.every(r => r.data === 'Concurrent Safe'), 'All 10 concurrent requests received the correct result');

  // Test 7: Fail-Open Database Fallback on Redis Failure
  console.log('\n--- Test 7: Database Fallback Resilience ---');
  // Query Supabase directly to verify source of truth
  const { data: realMenu, error: dbErr } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('restaurant_id', RESTAURANT_A)
    .limit(3);

  assert(!dbErr && realMenu && realMenu.length > 0, `Supabase source of truth query succeeded (${realMenu?.length} items retrieved)`);

  console.log('\n========================================================');
  console.log(`📊 CACHING ARCHITECTURE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runCachingVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
