import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { TableSession } from '@/types'

export async function createTableSession(tableId: string, orderId: string, customerName?: string, customerPhone?: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('table_sessions')
            .insert({
                table_id: tableId,
                restaurant_id: RESTAURANT_ID,
                order_id: orderId,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                status: 'active'
            })
            .select()
            .single()

        if (error) throw error
        return data.id
    } catch (error) {
        console.error('Error creating table session:', error)
        return null
    }
}

export async function getActiveSession(tableId: string): Promise<TableSession | null> {
    try {
        const { data, error } = await supabase
            .from('table_sessions')
            .select('*')
            .eq('table_id', tableId)
            .eq('status', 'active')
            .eq('restaurant_id', RESTAURANT_ID)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data as TableSession
    } catch (error) {
        console.error('Error fetching active session:', error)
        return null
    }
}

export async function closeSession(sessionId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('table_sessions')
            .update({ 
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error closing session:', error)
        return false
    }
}

export async function getActiveSessionsForAdmin(): Promise<TableSession[]> {
    try {
        const { data, error } = await supabase
            .from('table_sessions')
            .select('*, restaurant_tables(table_number), orders(bill_id, total, is_open_bill, payment_status)')
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('status', 'active')
            .order('started_at', { ascending: false })

        if (error) throw error
        return data as TableSession[]
    } catch (error) {
        console.error('Error fetching active sessions for admin:', error)
        return []
    }
}
