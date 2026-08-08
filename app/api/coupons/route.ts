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
            .from('coupons')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ success: true, coupons: data || [] })
    } catch (error: unknown) {
        console.error('API /api/coupons GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
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

        if (!body.code || !body.code.trim()) {
            return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
        }

        if (body.discount_value === undefined || body.discount_value === null || isNaN(Number(body.discount_value))) {
            return NextResponse.json({ error: 'Valid discount_value is required' }, { status: 400 })
        }

        const couponPayload = {
            restaurant_id: restaurantId,
            code: body.code.trim().toUpperCase(),
            description: body.description || null,
            discount_type: body.discount_type || 'percentage',
            discount_value: Number(body.discount_value),
            min_order_amount: Number(body.min_order_amount) || 0,
            max_discount: body.max_discount ? Number(body.max_discount) : null,
            usage_limit: Number(body.usage_limit) || 0,
            used_count: Number(body.used_count) || 0,
            valid_from: body.valid_from || new Date().toISOString(),
            valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('coupons')
            .insert(couponPayload)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, coupon: data }, { status: 201 })
    } catch (error: unknown) {
        console.error('API /api/coupons POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create coupon' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Coupon id is required' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (updates.code !== undefined) updatePayload.code = updates.code.trim().toUpperCase()
        if (updates.description !== undefined) updatePayload.description = updates.description
        if (updates.discount_type !== undefined) updatePayload.discount_type = updates.discount_type
        if (updates.discount_value !== undefined) updatePayload.discount_value = Number(updates.discount_value)
        if (updates.min_order_amount !== undefined) updatePayload.min_order_amount = Number(updates.min_order_amount)
        if (updates.max_discount !== undefined) updatePayload.max_discount = updates.max_discount ? Number(updates.max_discount) : null
        if (updates.usage_limit !== undefined) updatePayload.usage_limit = Number(updates.usage_limit)
        if (updates.valid_from !== undefined) updatePayload.valid_from = updates.valid_from
        if (updates.valid_until !== undefined) updatePayload.valid_until = new Date(updates.valid_until).toISOString()
        if (updates.is_active !== undefined) updatePayload.is_active = Boolean(updates.is_active)

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('coupons')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, coupon: data })
    } catch (error: unknown) {
        console.error('API /api/coupons PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update coupon' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Coupon id is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Coupon deleted successfully' })
    } catch (error: unknown) {
        console.error('API /api/coupons DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete coupon' },
            { status: 500 }
        )
    }
}
