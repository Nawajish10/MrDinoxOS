
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const tableId = searchParams.get('tableId')
    const customerId = searchParams.get('customerId')
    const tableNumber = searchParams.get('tableNumber')

    // Initialize admin client to bypass RLS
    // Fallback to anon key if service role is missing (though RLS bypassing won't work then)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        // Build query - find active order that is NOT paid and NOT closed
        let query = supabaseAdmin
            .from('orders')
            .select('id, bill_id, total, subtotal, status, payment_status, table_id, customer_id, session_id')
            .eq('restaurant_id', restaurantId)
            .neq('payment_status', 'paid')  // Allow additions only if not paid
            .neq('status', 'closed')  // Allow additions only if not closed
            .neq('status', 'cancelled')  // Exclude cancelled orders
            .order('created_at', { ascending: false })
            .limit(1)

        // Priority Logic for finding active order
        if (tableId && tableId !== 'null') {
            query = query.eq('table_id', tableId)
        } else if (tableNumber && tableNumber !== 'null' && !isNaN(parseInt(tableNumber))) {
            query = query.eq('table_number', parseInt(tableNumber))
        } else if (customerId && customerId !== 'null') {
            query = query.eq('customer_id', customerId)
        } else {
            // Not enough info to find active order
            return NextResponse.json({ order: null })
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
            console.error('Supabase query error:', error)
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
        }

        return NextResponse.json({ order: data })

    } catch (error: unknown) {
        console.error('API Handler Error:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
