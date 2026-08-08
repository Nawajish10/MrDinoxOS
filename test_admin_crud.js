const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID;

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING ADMIN PANEL & DATABASE INTEGRATION TESTS');
  console.log('====================================================');
  console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('📍 Restaurant ID:', restaurantId);

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

  try {
    // -----------------------------------------------------------
    // TEST 1: Table CRUD Persistence
    // -----------------------------------------------------------
    console.log('\n--- 1. Testing Physical Dining Table CRUD ---');
    
    // 1a. Create Table
    const { data: createdTable, error: createTableErr } = await supabaseAdmin
      .from('restaurant_tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: 101,
        table_name: 'VIP Skybox 101',
        capacity: 8,
        status: 'available',
        is_active: true,
      })
      .select()
      .single();

    assert(!createTableErr && createdTable?.id, 'Create Table in database: ' + (createTableErr?.message || 'Success'));

    // 1b. Read Table (Persistence check)
    const { data: readTable, error: readTableErr } = await supabaseAdmin
      .from('restaurant_tables')
      .select('*')
      .eq('id', createdTable?.id)
      .single();

    assert(!readTableErr && readTable?.table_number === 101, 'Read persisted Table: VIP Skybox 101 found');

    // 1c. Update Table
    const { data: updatedTable, error: updateTableErr } = await supabaseAdmin
      .from('restaurant_tables')
      .update({ capacity: 12, status: 'occupied' })
      .eq('id', createdTable?.id)
      .select()
      .single();

    assert(!updateTableErr && updatedTable?.capacity === 12 && updatedTable?.status === 'occupied', 'Update Table capacity to 12 & occupied');

    // 1d. Delete Table
    const { error: deleteTableErr } = await supabaseAdmin
      .from('restaurant_tables')
      .delete()
      .eq('id', createdTable?.id);

    assert(!deleteTableErr, 'Delete Table from database');

    const { data: deletedCheck } = await supabaseAdmin
      .from('restaurant_tables')
      .select('*')
      .eq('id', createdTable?.id);

    assert(deletedCheck?.length === 0, 'Verify Table is completely deleted');

    // -----------------------------------------------------------
    // TEST 2: Menu Categories & Items CRUD Persistence
    // -----------------------------------------------------------
    console.log('\n--- 2. Testing Menu Category & Items CRUD ---');

    // 2a. Create Category
    const { data: createdCat, error: catErr } = await supabaseAdmin
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: 'Gourmet Desserts',
        description: 'Artisanal sweet treats',
        sort_order: 99,
        is_active: true,
      })
      .select()
      .single();

    assert(!catErr && createdCat?.id, 'Create Menu Category "Gourmet Desserts"');

    // 2b. Create Menu Item
    const { data: createdItem, error: itemErr } = await supabaseAdmin
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: createdCat?.id,
        name: 'Belgian Lava Cake',
        description: 'Molten dark chocolate cake with vanilla bean gelato',
        price: 280,
        is_veg: true,
        is_bestseller: true,
        is_available: true,
      })
      .select()
      .single();

    assert(!itemErr && createdItem?.id, 'Create Menu Item "Belgian Lava Cake" (₹280)');

    // 2c. Read & Update Menu Item
    const { data: updatedItem, error: updateItemErr } = await supabaseAdmin
      .from('menu_items')
      .update({ price: 299, is_spicy: false })
      .eq('id', createdItem?.id)
      .select()
      .single();

    assert(!updateItemErr && updatedItem?.price == 299, 'Update Menu Item price to ₹299');

    // 2d. Delete Item & Category
    const { error: delItemErr } = await supabaseAdmin.from('menu_items').delete().eq('id', createdItem?.id);
    assert(!delItemErr, 'Delete Menu Item');

    const { error: delCatErr } = await supabaseAdmin.from('menu_categories').delete().eq('id', createdCat?.id);
    assert(!delCatErr, 'Delete Menu Category');

    // -----------------------------------------------------------
    // TEST 3: Coupons CRUD Persistence
    // -----------------------------------------------------------
    console.log('\n--- 3. Testing Coupons CRUD ---');

    const { data: createdCoupon, error: couponErr } = await supabaseAdmin
      .from('coupons')
      .insert({
        restaurant_id: restaurantId,
        code: 'TESTFEST50',
        description: '50% off test discount',
        discount_type: 'percentage',
        discount_value: 50,
        min_order_amount: 100,
        is_active: true,
      })
      .select()
      .single();

    assert(!couponErr && createdCoupon?.id, 'Create Coupon TESTFEST50 (50% off)');

    const { data: updatedCoupon, error: updateCouponErr } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: false })
      .eq('id', createdCoupon?.id)
      .select()
      .single();

    assert(!updateCouponErr && updatedCoupon?.is_active === false, 'Deactivate Coupon TESTFEST50');

    const { error: delCouponErr } = await supabaseAdmin.from('coupons').delete().eq('id', createdCoupon?.id);
    assert(!delCouponErr, 'Delete Coupon TESTFEST50');

    // -----------------------------------------------------------
    // TEST 4: Customers CRUD Persistence
    // -----------------------------------------------------------
    console.log('\n--- 4. Testing Customers CRUD ---');

    const { data: createdCustomer, error: customerErr } = await supabaseAdmin
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        name: 'Alex Johnson',
        phone: '+919876543219',
        email: 'alex.test@example.com',
        address: '123 Test Street, Suite 4',
      })
      .select()
      .single();

    assert(!customerErr && createdCustomer?.id, 'Create Customer "Alex Johnson"');

    const { data: readCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', createdCustomer?.id)
      .single();

    assert(readCustomer?.phone === '+919876543219', 'Read persisted Customer info');

    const { error: delCustomerErr } = await supabaseAdmin.from('customers').delete().eq('id', createdCustomer?.id);
    assert(!delCustomerErr, 'Delete Customer');

    // -----------------------------------------------------------
    // TEST 5: Existing Seed Data Verification
    // -----------------------------------------------------------
    console.log('\n--- 5. Checking Existing Seed Data in Database ---');

    const { data: existingTables } = await supabaseAdmin
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', restaurantId);

    assert(existingTables?.length > 0, `Existing Tables in DB: ${existingTables?.length} tables found`);

    const { data: existingItems } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);

    assert(existingItems?.length > 0, `Existing Menu Items in DB: ${existingItems?.length} items found`);

    console.log('\n====================================================');
    console.log(`📊 FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runEndToEndTests();
