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
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Calculate stats for each customer from orders
        const customersWithStats = await Promise.all(
            (customers || []).map(async (customer) => {
                const { data: allOrders } = await supabase
                    .from('orders')
                    .select('total, created_at, status')
                    .eq('customer_id', customer.id)
                    .order('created_at', { ascending: false })

                const total_orders = allOrders?.length || 0
                const total_spent = allOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
                const last_order_at = allOrders?.[0]?.created_at || null

                return {
                    ...customer,
                    total_orders,
                    total_spent,
                    last_order_at
                }
            })
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
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
        }

        const customerPayload = {
            restaurant_id: restaurantId,
            phone: body.phone.trim(),
            name: body.name?.trim() || null,
            email: body.email?.trim() || null,
            address: body.address || null,
            total_orders: Number(body.total_orders) || 0,
            total_spent: Number(body.total_spent) || 0,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('customers')
            .insert(customerPayload)
            .select()
            .single()

        if (error) throw error

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
        if (updates.name !== undefined) updatePayload.name = updates.name.trim()
        if (updates.phone !== undefined) updatePayload.phone = updates.phone.trim()
        if (updates.email !== undefined) updatePayload.email = updates.email ? updates.email.trim() : null
        if (updates.address !== undefined) updatePayload.address = updates.address

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('customers')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

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
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Customer deleted successfully' })
    } catch (error: unknown) {
        console.error('API /api/customers DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete customer' },
            { status: 500 }
        )
    }
}
