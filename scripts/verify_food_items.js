const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3';

async function runVerification() {
  console.log('========================================================');
  console.log('🔍 VERIFYING FOOD & MENU ITEMS IN DATABASE');
  console.log('========================================================');
  console.log(`📍 Restaurant ID: ${RESTAURANT_ID}`);

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

  // 1. Verify Restaurant exists
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', RESTAURANT_ID)
    .single();

  assert(restaurant && restaurant.id === RESTAURANT_ID, `Restaurant "${restaurant?.name}" exists`);

  // 2. Verify Categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  assert(categories && categories.length >= 7, `Total active categories for restaurant: ${categories?.length} (Expected >= 7)`);

  const categoryNames = categories.map(c => c.name);
  console.log('  📋 Categories found:', categoryNames.join(', '));

  const expectedCategories = ['Starters', 'Main Course', 'Burgers', 'Pizza', 'Biryani', 'Beverages', 'Desserts'];
  for (const exp of expectedCategories) {
    assert(categoryNames.includes(exp), `Category "${exp}" exists and is active`);
  }

  // 3. Verify All Categories have correct restaurant_id
  const invalidCats = categories.filter(c => c.restaurant_id !== RESTAURANT_ID);
  assert(invalidCats.length === 0, `All categories belong strictly to restaurant ${RESTAURANT_ID}`);

  // 4. Verify Menu Items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name, restaurant_id)')
    .eq('restaurant_id', RESTAURANT_ID)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  assert(menuItems && menuItems.length >= 20, `Total active menu items for restaurant: ${menuItems?.length}`);

  // 5. Verify every menu item has a valid category belonging to the same restaurant
  let categoryMismatches = 0;
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  for (const item of menuItems) {
    const cat = categoryMap.get(item.category_id);
    if (!cat || cat.restaurant_id !== RESTAURANT_ID) {
      console.error(`  ❌ Mismatch for item "${item.name}": category_id ${item.category_id} not found in restaurant categories`);
      categoryMismatches++;
    }
  }

  assert(categoryMismatches === 0, 'Every menu item references a category owned by the same restaurant');

  // 6. Verify existing Demo Salad record is preserved
  const demoSalad = menuItems.find(i => i.name === 'Demo Salad');
  assert(demoSalad && demoSalad.price == 199 && demoSalad.is_veg === true, 'Existing "Demo Salad" is intact and unmodified');

  // 7. Verify Spicy Wings record is preserved
  const spicyWings = menuItems.find(i => i.name === 'Spicy Wings');
  assert(spicyWings && spicyWings.price == 349, 'Existing "Spicy Wings" is intact');

  // 8. Verify default fields
  const invalidDefaults = menuItems.filter(i => i.is_available !== true || (i.is_spicy === false && i.spicy_level !== 0));
  assert(invalidDefaults.length === 0, 'All items have valid default boolean and numeric flags');

  // 9. Test duplicate prevention by running an insertion of an existing item
  const { addFoodItem } = require('./add_food_items');
  const dupResult = await addFoodItem(RESTAURANT_ID, {
    category_name: 'Starters',
    name: 'Paneer Tikka',
    price: 249,
  });

  assert(dupResult.action === 'skipped', 'Duplicate prevention active: inserting existing "Paneer Tikka" skips gracefully without duplicate rows');

  console.log('\n========================================================');
  console.log(`📊 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
