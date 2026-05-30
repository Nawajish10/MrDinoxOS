import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { orderId } = await request.json()

    if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    try {
        // Find order
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select('*, customers(*), order_items(*)')
            .eq('id', orderId)
            .single()

        if (error) throw error

        // If you had a webhook to trigger a payment link to the customer via whatsapp, you'd call it here
        // For now we just return the order details so the client can show the payment UI
        return NextResponse.json({ success: true, order })

    } catch (error: unknown) {
        console.error('API Handler Error:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
