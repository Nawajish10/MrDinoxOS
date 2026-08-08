const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3';

/**
 * Ensures a category exists for a restaurant and returns its record.
 */
async function getOrCreateCategory(restaurantId, categoryName, description = null, sortOrder = 0) {
  const trimmed = categoryName.trim();

  // Check if active category with this name exists for this restaurant
  const { data: existing, error: searchErr } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .ilike('name', trimmed)
    .is('deleted_at', null)
    .maybeSingle();

  if (searchErr) throw searchErr;
  if (existing) {
    return existing;
  }

  // Create new category
  const { data: newCat, error: insertErr } = await supabase
    .from('menu_categories')
    .insert({
      restaurant_id: restaurantId,
      name: trimmed,
      description: description,
      sort_order: sortOrder,
      is_active: true,
      deleted_at: null,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  console.log(`  📁 Created category: "${newCat.name}" (ID: ${newCat.id})`);
  return newCat;
}

/**
 * Adds a food item to a restaurant's menu with category verification and duplicate avoidance.
 */
async function addFoodItem(restaurantId, item) {
  try {
    if (!item.name || item.price === undefined) {
      throw new Error('Name and price are required');
    }

    // 1. Resolve category
    let category = null;
    if (item.category_id) {
      const { data: catRecord, error: catErr } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('id', item.category_id)
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (catErr) throw catErr;
      if (!catRecord) {
        throw new Error(`Category ID ${item.category_id} does not belong to restaurant ${restaurantId}`);
      }
      category = catRecord;
    } else if (item.category_name) {
      category = await getOrCreateCategory(restaurantId, item.category_name, item.category_description, item.category_sort_order || 0);
    } else {
      throw new Error('Either category_id or category_name must be provided');
    }

    const categoryId = category.id;

    // 2. Check for duplicate active item with same name in same category
    const trimmedName = item.name.trim();
    const { data: existing, error: dupErr } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('category_id', categoryId)
      .ilike('name', trimmedName)
      .is('deleted_at', null)
      .maybeSingle();

    if (dupErr) throw dupErr;

    if (existing) {
      console.log(`  ⏩ Skipped existing item: "${existing.name}" in [${category.name}]`);
      return { success: true, action: 'skipped', item: existing, category };
    }

    // 3. Prepare payload with required defaults
    const hasStock = item.stock !== undefined && item.stock !== null && !isNaN(Number(item.stock));
    const isInfinite = item.is_infinite_stock !== undefined ? Boolean(item.is_infinite_stock) : !hasStock;

    const payload = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: trimmedName,
      description: item.description || null,
      price: Number(item.price),
      discounted_price: item.discounted_price ? Number(item.discounted_price) : null,
      image_url: item.image_url || null,
      is_veg: item.is_veg !== undefined ? Boolean(item.is_veg) : false,
      is_bestseller: item.is_bestseller !== undefined ? Boolean(item.is_bestseller) : false,
      is_new: item.is_new !== undefined ? Boolean(item.is_new) : false,
      is_spicy: item.is_spicy !== undefined ? Boolean(item.is_spicy) : false,
      spicy_level: item.spicy_level !== undefined ? Number(item.spicy_level) : (item.is_spicy ? 1 : 0),
      is_available: item.is_available !== undefined ? Boolean(item.is_available) : true,
      preparation_time: item.preparation_time !== undefined ? Number(item.preparation_time) : 15,
      serves: item.serves || '1',
      stock: hasStock && !isInfinite ? Number(item.stock) : null,
      is_infinite_stock: isInfinite,
      deleted_at: null,
    };

    // 4. Insert into menu_items
    const { data: created, error: insertErr } = await supabase
      .from('menu_items')
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;

    console.log(`  🍽️ Added item: "${created.name}" (₹${created.price}) in [${category.name}]`);
    return { success: true, action: 'created', item: created, category };
  } catch (error) {
    console.error(`  ❌ Error adding "${item.name}":`, error.message || error);
    return { success: false, action: 'error', error: error.message || String(error) };
  }
}

/**
 * Menu dataset for restaurant seeding and expansion.
 */
const FOOD_CATALOGUE = [
  // 1. STARTERS
  {
    category_name: 'Starters',
    category_sort_order: 1,
    name: 'Paneer Tikka',
    description: 'Fresh cottage cheese cubes marinated in spiced yogurt and grilled in traditional clay tandoor',
    price: 249,
    discounted_price: 229,
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: true,
    spicy_level: 2,
    preparation_time: 15,
    serves: '2',
  },
  {
    category_name: 'Starters',
    category_sort_order: 1,
    name: 'Crispy Sweet Corn',
    description: 'Golden fried sweet corn kernels tossed with crunchy bell peppers and tangy chaat masala',
    price: 189,
    image_url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: true,
    spicy_level: 1,
    preparation_time: 12,
    serves: '1-2',
  },
  {
    category_name: 'Starters',
    category_sort_order: 1,
    name: 'Chicken Malai Tikka',
    description: 'Melt-in-mouth chicken chunks marinated in rich cashew cream, grated cheese, and green cardamom',
    price: 329,
    discounted_price: 299,
    image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 18,
    serves: '2',
  },

  // 2. MAIN COURSE
  {
    category_name: 'Main Course',
    category_sort_order: 2,
    name: 'Butter Chicken',
    description: 'Tender tandoori chicken simmered in silky tomato gravy enriched with butter and dried fenugreek',
    price: 389,
    discounted_price: 349,
    image_url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 1,
    preparation_time: 20,
    serves: '2',
  },
  {
    category_name: 'Main Course',
    category_sort_order: 2,
    name: 'Paneer Butter Masala',
    description: 'Soft paneer cubes cooked in rich cashew and ripe tomato gravy finished with fresh cream',
    price: 299,
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 1,
    preparation_time: 15,
    serves: '2',
  },
  {
    category_name: 'Main Course',
    category_sort_order: 2,
    name: 'Dal Makhani',
    description: 'Whole black lentils slow-cooked overnight on tandoor with churned butter and aromatic spices',
    price: 249,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 15,
    serves: '2',
  },
  {
    category_name: 'Main Course',
    category_sort_order: 2,
    name: 'Kadhai Chicken',
    description: 'Juicy chicken cooked in traditional iron wok with coarsely crushed coriander seeds and bell peppers',
    price: 369,
    image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80',
    is_veg: false,
    is_bestseller: false,
    is_spicy: true,
    spicy_level: 3,
    preparation_time: 20,
    serves: '2',
  },

  // 3. BURGERS
  {
    category_name: 'Burgers',
    category_sort_order: 3,
    name: 'Classic Veggie Burger',
    description: 'Crispy spiced vegetable patty topped with melted cheddar, crisp lettuce, tomato, and house mayo',
    price: 179,
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 12,
    serves: '1',
  },
  {
    category_name: 'Burgers',
    category_sort_order: 3,
    name: 'Crispy Chicken Zinger Burger',
    description: 'Buttermilk soaked fried chicken breast with jalapeño slaw and fiery ghost pepper mayonnaise',
    price: 239,
    discounted_price: 219,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: true,
    spicy_level: 2,
    preparation_time: 15,
    serves: '1',
  },
  {
    category_name: 'Burgers',
    category_sort_order: 3,
    name: 'Double Cheese BBQ Burger',
    description: 'Two grilled meat patties layered with double smoked cheddar, caramelized onions, and Texas BBQ sauce',
    price: 289,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80',
    is_veg: false,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 1,
    preparation_time: 15,
    serves: '1',
  },

  // 4. PIZZA
  {
    category_name: 'Pizza',
    category_sort_order: 4,
    name: 'Margherita Supreme Pizza',
    description: 'Handcrafted sourdough crust with San Marzano tomato sauce, fresh buffalo mozzarella, and basil',
    price: 329,
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 18,
    serves: '2',
  },
  {
    category_name: 'Pizza',
    category_sort_order: 4,
    name: 'Farmhouse Delight Pizza',
    description: 'Loaded with button mushrooms, green capsicum, red onions, golden sweet corn, and Kalamata olives',
    price: 379,
    discounted_price: 349,
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 18,
    serves: '2',
  },
  {
    category_name: 'Pizza',
    category_sort_order: 4,
    name: 'Peri Peri Chicken Pizza',
    description: 'Spicy peri peri glazed chicken pieces, jalapeños, roasted red paprika, and gooey mozzarella cheese',
    price: 449,
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: true,
    spicy_level: 3,
    preparation_time: 20,
    serves: '2',
  },

  // 5. BIRYANI
  {
    category_name: 'Biryani',
    category_sort_order: 5,
    name: 'Hyderabadi Chicken Dum Biryani',
    description: 'Aromatic long-grain basmati rice layered with spiced chicken, saffron milk, fried onions, and mint',
    price: 369,
    discounted_price: 339,
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: true,
    spicy_level: 2,
    preparation_time: 20,
    serves: '1-2',
  },
  {
    category_name: 'Biryani',
    category_sort_order: 5,
    name: 'Royal Mutton Dum Biryani',
    description: 'Tender goat meat slow-cooked in handi with royal Shahi spices, rose water, and aged basmati rice',
    price: 449,
    image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80',
    is_veg: false,
    is_bestseller: true,
    is_spicy: true,
    spicy_level: 2,
    preparation_time: 25,
    serves: '1-2',
  },
  {
    category_name: 'Biryani',
    category_sort_order: 5,
    name: 'Paneer Dum Biryani',
    description: 'Fragrant basmati rice layered with marinated spiced paneer cubes, ghee, and golden caramelized onions',
    price: 289,
    image_url: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 1,
    preparation_time: 18,
    serves: '1-2',
  },

  // 6. BEVERAGES
  {
    category_name: 'Beverages',
    category_sort_order: 6,
    name: 'Mango Lassi',
    description: 'Thick creamy yogurt smoothie whipped with sweet Alphonso mango pulp and cardamom',
    price: 129,
    image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 5,
    serves: '1',
  },
  {
    category_name: 'Beverages',
    category_sort_order: 6,
    name: 'Cold Brew Coffee',
    description: 'Smooth single-origin 18-hour cold steeped coffee served over crystal ice with vanilla foam',
    price: 159,
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 5,
    serves: '1',
  },
  {
    category_name: 'Beverages',
    category_sort_order: 6,
    name: 'Fresh Mint Mojito',
    description: 'Invigorating muddled fresh mint leaves, lime juice, cane sugar, and sparkling club soda',
    price: 139,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 5,
    serves: '1',
  },

  // 7. DESSERTS
  {
    category_name: 'Desserts',
    category_sort_order: 7,
    name: 'Gulab Jamun with Ice Cream',
    description: 'Warm melt-in-mouth milk dumplings soaked in rose cardamom sugar syrup with artisan vanilla ice cream',
    price: 149,
    image_url: 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 8,
    serves: '1',
  },
  {
    category_name: 'Desserts',
    category_sort_order: 7,
    name: 'Belgian Chocolate Brownie',
    description: 'Fudgy warm dark chocolate brownie served with hot chocolate fudge drizzle and toasted almonds',
    price: 189,
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
    is_veg: true,
    is_bestseller: true,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 8,
    serves: '1',
  },
  {
    category_name: 'Desserts',
    category_sort_order: 7,
    name: 'New York Cheesecake',
    description: 'Classic dense and creamy baked cheesecake with buttery graham crust and wild strawberry compote',
    price: 229,
    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80',
    is_veg: true,
    is_bestseller: false,
    is_spicy: false,
    spicy_level: 0,
    preparation_time: 5,
    serves: '1',
  },
];

/**
 * Main execution function
 */
async function main() {
  const targetRestaurantId = process.argv[2] || DEFAULT_RESTAURANT_ID;

  console.log('========================================================');
  console.log('🍽️  ADDING FOOD & MENU ITEMS TO RESTAURANT DATABASE');
  console.log('========================================================');
  console.log(`📍 Target Restaurant ID: ${targetRestaurantId}`);

  // Verify restaurant exists
  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', targetRestaurantId)
    .maybeSingle();

  if (restErr) {
    console.error('❌ Error checking restaurant:', restErr);
    process.exit(1);
  }

  if (!restaurant) {
    console.error(`❌ Restaurant with ID "${targetRestaurantId}" not found in database!`);
    process.exit(1);
  }

  console.log(`🏠 Restaurant: "${restaurant.name}"`);
  console.log('--------------------------------------------------------');

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of FOOD_CATALOGUE) {
    const result = await addFoodItem(targetRestaurantId, item);
    if (result.action === 'created') createdCount++;
    else if (result.action === 'skipped') skippedCount++;
    else errorCount++;
  }

  console.log('========================================================');
  console.log(`📊 SUMMARY: ${createdCount} Created, ${skippedCount} Skipped, ${errorCount} Errors`);
  console.log('========================================================');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error in script:', err);
    process.exit(1);
  });
}

module.exports = {
  addFoodItem,
  getOrCreateCategory,
  FOOD_CATALOGUE,
};
