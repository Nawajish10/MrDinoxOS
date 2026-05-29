import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { KitchenTicket } from '@/types'

export async function createKitchenTicket(orderId: string): Promise<string | null> {
    try {
        const { data: tickets, error: countError } = await supabase
            .from('kitchen_tickets')
            .select('ticket_number')
            .eq('order_id', orderId)

        if (countError) throw countError

        const ticketCount = tickets?.length || 0
        const ticketNumber = `KT-${ticketCount + 1}`

        const { data, error } = await supabase
            .from('kitchen_tickets')
            .insert({
                order_id: orderId,
                ticket_number: ticketNumber,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error
        return data.id
    } catch (error) {
        console.error('Error creating kitchen ticket:', error)
        return null
    }
}

export async function getKitchenTicketsByOrder(orderId: string): Promise<KitchenTicket[]> {
    try {
        const { data, error } = await supabase
            .from('kitchen_tickets')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching kitchen tickets:', error)
        return []
    }
}

export async function getPendingKitchenTickets(): Promise<KitchenTicket[]> {
    try {
        const { data, error } = await supabase
            .from('kitchen_tickets')
            .select('*, orders!inner(*)')
            .eq('orders.restaurant_id', RESTAURANT_ID)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching pending kitchen tickets:', error)
        return []
    }
}

export async function updateKitchenTicketStatus(ticketId: string, status: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('kitchen_tickets')
            .update({ status })
            .eq('id', ticketId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error updating kitchen ticket status:', error)
        return false
    }
}

export async function getOrderWithTickets(billId: string): Promise<any> {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                kitchen_tickets (
                    *,
                    order_items (*)
                ),
                order_items (*),
                restaurant_tables (table_number)
            `)
            .eq('bill_id', billId)
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error fetching order with tickets:', error)
        return null
    }
}

export async function getTicketsByOrderWithItems(orderId: string): Promise<KitchenTicket[]> {
    try {
        const { data, error } = await supabase
            .from('kitchen_tickets')
            .select(`
                *,
                order_items (*)
            `)
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching kitchen tickets with items:', error)
        return []
    }
}