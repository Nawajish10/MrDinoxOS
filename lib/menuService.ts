import { SupabaseClient } from '@supabase/supabase-js'

export interface CategoryInput {
    id?: string
    name: string
    description?: string | null
    image_url?: string | null
    sort_order?: number
    is_active?: boolean
}

export interface MenuItemInput {
    id?: string
    category_id?: string
    category_name?: string
    name: string
    description?: string | null
    price: number
    discounted_price?: number | null
    image_url?: string | null
    is_veg?: boolean
    is_bestseller?: boolean
    is_new?: boolean
    is_spicy?: boolean
    spicy_level?: number
    is_available?: boolean
    preparation_time?: number
    serves?: string | null
    stock?: number | null
    is_infinite_stock?: boolean
}

export interface AddItemResult {
    success: boolean
    action: 'created' | 'skipped_duplicate' | 'error'
    item?: any
    category?: any
    error?: string
}

/**
 * Ensures a category exists for a given restaurant.
 * If categoryId is provided, validates that it belongs to the same restaurant.
 * If categoryName is provided, searches by name for the restaurant; if not found, creates it.
 */
export async function getOrCreateCategory(
    supabase: SupabaseClient,
    restaurantId: string,
    categoryNameOrId: { id?: string; name?: string; description?: string; sortOrder?: number }
) {
    if (!restaurantId) {
        throw new Error('restaurant_id is required')
    }

    // 1. If ID is provided, verify it belongs to this restaurant
    if (categoryNameOrId.id) {
        const { data: existing, error } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('id', categoryNameOrId.id)
            .eq('restaurant_id', restaurantId)
            .is('deleted_at', null)
            .maybeSingle()

        if (error) throw error
        if (existing) return existing
    }

    // 2. If name is provided, search for active category by name for this restaurant
    if (categoryNameOrId.name) {
        const trimmedName = categoryNameOrId.name.trim()
        const { data: existingByName, error: searchErr } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .ilike('name', trimmedName)
            .is('deleted_at', null)
            .maybeSingle()

        if (searchErr) throw searchErr
        if (existingByName) return existingByName

        // 3. Create new category with database auto-generated UUID
        const { data: countData } = await supabase
            .from('menu_categories')
            .select('id', { count: 'exact' })
            .eq('restaurant_id', restaurantId)

        const sortOrder = categoryNameOrId.sortOrder !== undefined ? categoryNameOrId.sortOrder : (countData?.length || 0)

        const { data: newCat, error: insertErr } = await supabase
            .from('menu_categories')
            .insert({
                restaurant_id: restaurantId,
                name: trimmedName,
                description: categoryNameOrId.description || null,
                sort_order: sortOrder,
                is_active: true,
                deleted_at: null,
            })
            .select()
            .single()

        if (insertErr) throw insertErr
        return newCat
    }

    throw new Error('Either category ID or name must be provided')
}

/**
 * Reusable function to add a single food item to a restaurant's menu.
 * Verifies category ownership, checks for duplicates, and inserts with proper defaults.
 */
export async function addMenuItem(
    supabase: SupabaseClient,
    restaurantId: string,
    item: MenuItemInput
): Promise<AddItemResult> {
    try {
        if (!restaurantId) {
            return { success: false, action: 'error', error: 'restaurant_id is required' }
        }

        if (!item.name || !item.name.trim()) {
            return { success: false, action: 'error', error: 'Item name is required' }
        }

        if (item.price === undefined || item.price === null || isNaN(Number(item.price))) {
            return { success: false, action: 'error', error: 'Valid price is required' }
        }

        // 1. Resolve & verify category
        let resolvedCategory: any = null
        if (item.category_id) {
            resolvedCategory = await getOrCreateCategory(supabase, restaurantId, { id: item.category_id })
        } else if (item.category_name) {
            resolvedCategory = await getOrCreateCategory(supabase, restaurantId, { name: item.category_name })
        } else {
            return { success: false, action: 'error', error: 'Either category_id or category_name is required' }
        }

        if (!resolvedCategory) {
            return { success: false, action: 'error', error: 'Failed to resolve or create category' }
        }

        const categoryId = resolvedCategory.id

        // 2. Duplicate Check: Check if active item with same name exists for this restaurant and category
        const trimmedName = item.name.trim()
        const { data: existingItem, error: dupCheckErr } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('category_id', categoryId)
            .ilike('name', trimmedName)
            .is('deleted_at', null)
            .maybeSingle()

        if (dupCheckErr) throw dupCheckErr

        if (existingItem) {
            return {
                success: true,
                action: 'skipped_duplicate',
                item: existingItem,
                category: resolvedCategory,
            }
        }

        // 3. Prepare payload with standard defaults
        const hasStock = item.stock !== undefined && item.stock !== null && !isNaN(Number(item.stock))
        const isInfinite = item.is_infinite_stock !== undefined ? Boolean(item.is_infinite_stock) : !hasStock

        const payload: Record<string, any> = {
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
        }

        // 4. Insert into menu_items
        const { data: createdItem, error: insertErr } = await supabase
            .from('menu_items')
            .insert(payload)
            .select()
            .single()

        if (insertErr) throw insertErr

        return {
            success: true,
            action: 'created',
            item: createdItem,
            category: resolvedCategory,
        }
    } catch (error: any) {
        console.error('Error in addMenuItem:', error)
        return {
            success: false,
            action: 'error',
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

/**
 * Reusable batch insertion helper for food items across multiple categories.
 */
export async function addMenuItemsBatch(
    supabase: SupabaseClient,
    restaurantId: string,
    items: MenuItemInput[]
) {
    const results: AddItemResult[] = []

    for (const item of items) {
        const result = await addMenuItem(supabase, restaurantId, item)
        results.push(result)
    }

    const createdCount = results.filter(r => r.action === 'created').length
    const skippedCount = results.filter(r => r.action === 'skipped_duplicate').length
    const errorCount = results.filter(r => r.action === 'error').length

    return {
        total: items.length,
        created: createdCount,
        skipped: skippedCount,
        errors: errorCount,
        results,
    }
}
