import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const { billId, transactionId, status } = payload

        if (!billId || !transactionId || status !== 'SUCCESS') {
            return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 })
        }

        console.log('💳 [PAYMENT WEBHOOK] Processing verified payment for bill:', billId)

        // 1. Fetch the order to get the session_id and table_id
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, session_id, table_id, payment_status')
            .eq('bill_id', billId)
            .single()

        if (orderError || !order) {
            console.error('❌ [PAYMENT WEBHOOK] Order not found:', billId)
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ success: true, message: 'Already paid' })
        }

        // 2. Mark order as paid
        const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
                payment_status: 'paid',
                payment_method: 'upi',
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

        if (updateOrderError) {
            console.error('❌ [PAYMENT WEBHOOK] Failed to update order:', updateOrderError)
            return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
        }

        console.log('✅ [PAYMENT WEBHOOK] Order marked as paid')

        // 3. Handle table session closure
        if (order.session_id) {
            const { error: sessionError } = await supabase
                .from('table_sessions')
                .update({ 
                    status: 'closed',
                    closed_at: new Date().toISOString() 
                })
                .eq('id', order.session_id)
                
            if (sessionError) console.error('⚠️ Failed to close session:', sessionError)
        }

        // 4. Release the table
        if (order.table_id) {
            const { error: tableError } = await supabase
                .from('restaurant_tables')
                .update({ status: 'available' })
                .eq('id', order.table_id)
                
            if (tableError) console.error('⚠️ Failed to release table:', tableError)
        }

        console.log('✅ [PAYMENT WEBHOOK] Verified flow completed for:', billId)
        return NextResponse.json({ success: true, transactionId })
    } catch (error) {
        console.error('❌ [PAYMENT WEBHOOK] Internal Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
