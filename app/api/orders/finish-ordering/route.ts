import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { orderId, paymentMethod = 'cash' } = await request.json()

    if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    try {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({ 
                payment_status: 'requested',
                payment_method: paymentMethod
            })
            .eq('id', orderId)
            .select()
            .single()

        if (error) {
            console.error('Supabase update error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, order: data })

    } catch (error: unknown) {
        console.error('API Handler Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
