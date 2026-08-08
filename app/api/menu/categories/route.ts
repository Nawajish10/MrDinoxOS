import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, categories: data || [] })
    } catch (error: unknown) {
        console.error('API /api/menu/categories GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
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
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        const categoryPayload = {
            restaurant_id: restaurantId,
            name: body.name.trim(),
            description: body.description || null,
            sort_order: Number(body.sort_order) || 0,
            is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_categories')
            .insert(categoryPayload)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, category: data }, { status: 201 })
    } catch (error: unknown) {
        console.error('API /api/menu/categories POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create category' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Category id is required' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (updates.name !== undefined) updatePayload.name = updates.name.trim()
        if (updates.description !== undefined) updatePayload.description = updates.description
        if (updates.sort_order !== undefined) updatePayload.sort_order = Number(updates.sort_order)
        if (updates.is_active !== undefined) updatePayload.is_active = Boolean(updates.is_active)

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('menu_categories')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, category: data })
    } catch (error: unknown) {
        console.error('API /api/menu/categories PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update category' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Category id is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from('menu_categories')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Category deleted successfully' })
    } catch (error: unknown) {
        console.error('API /api/menu/categories DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete category' },
            { status: 500 }
        )
    }
}
