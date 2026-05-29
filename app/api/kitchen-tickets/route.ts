import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status') || 'pending'

    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('kitchen_tickets')
            .select(`
                *,
                orders!inner (bill_id, table_id, restaurant_tables(table_number)),
                order_items (*)
            `)
            .eq('orders.restaurant_id', restaurantId)
            .eq('status', status)
            .order('created_at', { ascending: true })

        if (error) throw error
        return NextResponse.json({ tickets: data })
    } catch (error: unknown) {
        console.error('Error fetching kitchen tickets:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const { ticketId, status } = await request.json()

    if (!ticketId) {
        return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('kitchen_tickets')
            .update({ status })
            .eq('id', ticketId)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ ticket: data })
    } catch (error: unknown) {
        console.error('Error updating kitchen ticket:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}