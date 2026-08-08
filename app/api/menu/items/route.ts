import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrSetCached, getCacheKey, deleteByPattern, CACHE_TTL } from '@/lib/cache/cache'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID
        const categoryId = searchParams.get('categoryId') || 'all'

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const cacheKey = getCacheKey(restaurantId, 'menu', categoryId)

        const items = await getOrSetCached(
            cacheKey,
            async () => {
                const supabase = getSupabaseAdmin()
                let query = supabase
                    .from('menu_items')
                    .select('*, menu_categories(name)')
                    .eq('restaurant_id', restaurantId)
                    .is('deleted_at', null)
                    .order('name', { ascending: true })

                if (categoryId && categoryId !== 'all') {
                    query = query.eq('category_id', categoryId)
                }

                const { data, error } = await query
                if (error) throw error
                return data || []
            },
            CACHE_TTL.MENU // 10 minutes
        )

        return NextResponse.json({ success: true, items })
    } catch (error: unknown) {
        console.error('API /api/menu/items GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch menu items' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const restaurantId = body.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
        }

        if (!body.name || !body.name.trim()) {
            return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
        }

        if (body.price === undefined || body.price === null || isNaN(Number(body.price))) {
            return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
        }

        const itemPayload = {
            restaurant_id: restaurantId,
            category_id: body.category_id || null,
            name: body.name.trim(),
            description: body.description || null,
            price: Number(body.price),
            discounted_price: body.discounted_price ? Number(body.discounted_price) : null,
            image_url: body.image_url || null,
            is_veg: Boolean(body.is_veg),
            is_bestseller: Boolean(body.is_bestseller),
            is_new: Boolean(body.is_new),
            is_spicy: Boolean(body.is_spicy),
            spicy_level: Number(body.spicy_level) || 0,
            is_available: body.is_available !== undefined ? Boolean(body.is_available) : true,
            preparation_time: Number(body.preparation_time) || 10,
            serves: body.serves || '1',
            stock: body.is_infinite_stock ? null : (body.stock !== undefined && body.stock !== '' && body.stock !== null ? Number(body.stock) : null),
            is_infinite_stock: Boolean(body.is_infinite_stock),
            deleted_at: null,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_items')
            .insert(itemPayload)
            .select()
            .single()

        if (error) throw error

        // Invalidate menu cache
        await deleteByPattern(`v1:restaurant:${restaurantId}:menu*`)

        return NextResponse.json({ success: true, item: data }, { status: 201 })
    } catch (error: unknown) {
        console.error('API /api/menu/items POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create menu item' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Item id is required' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (updates.name !== undefined) updatePayload.name = updates.name.trim()
        if (updates.description !== undefined) updatePayload.description = updates.description
        if (updates.price !== undefined) updatePayload.price = Number(updates.price)
        if (updates.discounted_price !== undefined) updatePayload.discounted_price = updates.discounted_price ? Number(updates.discounted_price) : null
        if (updates.image_url !== undefined) updatePayload.image_url = updates.image_url
        if (updates.category_id !== undefined) updatePayload.category_id = updates.category_id
        if (updates.is_veg !== undefined) updatePayload.is_veg = Boolean(updates.is_veg)
        if (updates.is_bestseller !== undefined) updatePayload.is_bestseller = Boolean(updates.is_bestseller)
        if (updates.is_new !== undefined) updatePayload.is_new = Boolean(updates.is_new)
        if (updates.is_spicy !== undefined) updatePayload.is_spicy = Boolean(updates.is_spicy)
        if (updates.spicy_level !== undefined) updatePayload.spicy_level = Number(updates.spicy_level)
        if (updates.is_available !== undefined) updatePayload.is_available = Boolean(updates.is_available)
        if (updates.preparation_time !== undefined) updatePayload.preparation_time = Number(updates.preparation_time)
        if (updates.serves !== undefined) updatePayload.serves = updates.serves
        if (updates.stock !== undefined) updatePayload.stock = updates.is_infinite_stock ? null : (updates.stock !== '' && updates.stock !== null ? Number(updates.stock) : null)
        if (updates.is_infinite_stock !== undefined) updatePayload.is_infinite_stock = Boolean(updates.is_infinite_stock)
        updatePayload.updated_at = new Date().toISOString()

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_items')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        const restaurantId = data?.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (restaurantId) {
            await deleteByPattern(`v1:restaurant:${restaurantId}:menu*`)
        }

        return NextResponse.json({ success: true, item: data })
    } catch (error: unknown) {
        console.error('API /api/menu/items PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update menu item' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Item id is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_items')
            .update({ is_available: false, deleted_at: new Date().toISOString() })
            .eq('id', id)
            .select('restaurant_id')
            .single()

        if (error) throw error

        const restaurantId = data?.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (restaurantId) {
            await deleteByPattern(`v1:restaurant:${restaurantId}:menu*`)
        }

        return NextResponse.json({ success: true, message: 'Menu item deleted' })
    } catch (error: unknown) {
        console.error('API /api/menu/items DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete menu item' },
            { status: 500 }
        )
    }
}
