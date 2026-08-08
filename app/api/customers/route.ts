import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrSetCached, getCacheKey, deleteByPattern, CACHE_TTL } from '@/lib/cache/cache'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const cacheKey = getCacheKey(restaurantId, 'customers', 'all')

        const customersWithStats = await getOrSetCached(
            cacheKey,
            async () => {
                const supabase = getSupabaseAdmin()

                // 1. Fetch customers and orders in parallel (Eliminates N+1 queries)
                const [customersRes, ordersRes] = await Promise.all([
                    supabase
                        .from('customers')
                        .select('id, restaurant_id, name, phone, email, address, created_at')
                        .eq('restaurant_id', restaurantId)
                        .order('created_at', { ascending: false }),

                    supabase
                        .from('orders')
                        .select('customer_id, total, created_at, status')
                        .eq('restaurant_id', restaurantId)
                ])

                if (customersRes.error) throw customersRes.error

                const customers = customersRes.data || []
                const orders = ordersRes.data || []

                // 2. Group order stats by customer_id in O(N) memory
                const customerStatsMap = new Map<string, { total_orders: number; total_spent: number; last_order_at: string | null }>()

                for (const order of orders) {
                    if (!order.customer_id) continue
                    const existing = customerStatsMap.get(order.customer_id) || { total_orders: 0, total_spent: 0, last_order_at: null }
                    existing.total_orders += 1
                    existing.total_spent += Number(order.total) || 0
                    if (!existing.last_order_at || new Date(order.created_at) > new Date(existing.last_order_at)) {
                        existing.last_order_at = order.created_at
                    }
                    customerStatsMap.set(order.customer_id, existing)
                }

                // 3. Attach pre-aggregated stats
                return customers.map(c => {
                    const stats = customerStatsMap.get(c.id) || { total_orders: 0, total_spent: 0, last_order_at: null }
                    return {
                        ...c,
                        total_orders: stats.total_orders,
                        total_spent: stats.total_spent,
                        last_order_at: stats.last_order_at
                    }
                })
            },
            CACHE_TTL.SHORT_ANALYTICS // 30 seconds
        )

        return NextResponse.json({ success: true, customers: customersWithStats })
    } catch (error: unknown) {
        console.error('API /api/customers GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch customers' },
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

        if (!body.phone || !body.phone.trim()) {
            return NextResponse.json({ error: 'Customer phone is required' }, { status: 400 })
        }

        const customerPayload = {
            restaurant_id: restaurantId,
            name: body.name ? body.name.trim() : null,
            phone: body.phone.trim(),
            email: body.email ? body.email.trim() : null,
            address: body.address ? body.address.trim() : null,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('customers')
            .insert(customerPayload)
            .select()
            .single()

        if (error) throw error

        // Invalidate customers cache
        await deleteByPattern(`v1:restaurant:${restaurantId}:customers*`)

        return NextResponse.json({ success: true, customer: data }, { status: 201 })
    } catch (error: unknown) {
        console.error('API /api/customers POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create customer' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Customer id is required' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (updates.name !== undefined) updatePayload.name = updates.name ? updates.name.trim() : null
        if (updates.phone !== undefined) updatePayload.phone = updates.phone.trim()
        if (updates.email !== undefined) updatePayload.email = updates.email ? updates.email.trim() : null
        if (updates.address !== undefined) updatePayload.address = updates.address ? updates.address.trim() : null

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('customers')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        const restaurantId = data?.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (restaurantId) {
            await deleteByPattern(`v1:restaurant:${restaurantId}:customers*`)
        }

        return NextResponse.json({ success: true, customer: data })
    } catch (error: unknown) {
        console.error('API /api/customers PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update customer' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Customer id is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .select('restaurant_id')
            .single()

        if (error) throw error

        const restaurantId = data?.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (restaurantId) {
            await deleteByPattern(`v1:restaurant:${restaurantId}:customers*`)
        }

        return NextResponse.json({ success: true, message: 'Customer deleted successfully' })
    } catch (error: unknown) {
        console.error('API /api/customers DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete customer' },
            { status: 500 }
        )
    }
}
