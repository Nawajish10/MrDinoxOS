import { supabase, RESTAURANT_ID } from '@/lib/supabase'

export async function getActiveOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(*), order_items(*, menu_items(*)), restaurant_tables(*), kitchen_tickets(*)')
            .eq('restaurant_id', RESTAURANT_ID)
            .in('status', ['pending', 'confirmed', 'preparing', 'partially_ready', 'ready'])
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching active orders:', error)
        return []
    }
}

export async function getActiveOrderByTable(tableId: string): Promise<any | null> {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(*), order_items(*), restaurant_tables(*), kitchen_tickets(*)')
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('table_id', tableId)
            .neq('payment_status', 'paid')
            .neq('status', 'closed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error fetching active order by table:', error)
        return null
    }
}

export async function getActiveOrderBySession(sessionId: string): Promise<any | null> {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(*), order_items(*), restaurant_tables(*), kitchen_tickets(*)')
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('session_id', sessionId)
            .neq('payment_status', 'paid')
            .neq('status', 'closed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error fetching active order by session:', error)
        return null
    }
}

export async function updateOrderStatus(orderId: string, status: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)

        if (error) throw error

        if (status === 'served') {
            await supabase
                .from('order_items')
                .update({ status: 'served' })
                .eq('order_id', orderId)
                .neq('status', 'served')
        }

        // Trigger Webhook if status is 'served' or 'cancelled'
        if (status === 'served' || status === 'cancelled') {
            const { data: order } = await supabase
                .from('orders')
                .select('*, customers(*), restaurant_tables(table_number), order_items(*)')
                .eq('id', orderId)
                .single()

            if (order) {
                const { triggerPaymentWebhook } = await import('@/lib/webhook')
                await triggerPaymentWebhook({
                    bill_id: order.bill_id,
                    amount: order.total,
                    customer: {
                        name: order.customers?.name || 'Walk-in',
                        phone: order.customers?.phone || 'N/A',
                        address: order.delivery_address || order.customers?.address
                    },
                    order_type: order.order_type,
                    table_number: order.restaurant_tables?.table_number,
                    items: order.order_items?.map((i: any) => ({
                        name: i.item_name,
                        quantity: i.quantity,
                        price: i.price || (i.total / i.quantity),
                        total: i.total
                    })),
                    payment_method: order.payment_method || 'pending',
                    payment_status: order.payment_status,
                    restaurant_id: RESTAURANT_ID,
                    updated_at: new Date().toISOString(),
                    source: status === 'cancelled' ? 'kitchen_cancelled' : 'kitchen_served',
                    trigger_type: status === 'cancelled' ? 'order_cancelled' : 'order_served'
                })
            }
        }

        return true
    } catch (error) {
        console.error('Error updating order status:', error)
        return false
    }
}

export async function updateOrderItemStatus(itemId: string, status: string) {
    try {
        // 1. Update the order_item
        const { error, data: item } = await supabase
            .from('order_items')
            .update({ status })
            .eq('id', itemId)
            .select()
            .single()

        if (error) throw error

        // 2. Fetch all items for the parent order to compute aggregate statuses
        if (item?.order_id) {
            const { data: siblingItems } = await supabase
                .from('order_items')
                .select('status, ticket_id')
                .eq('order_id', item.order_id)

            if (siblingItems && siblingItems.length > 0) {
                // Determine Order Status
                const allStatuses = siblingItems.map(i => i.status)
                const allServed = allStatuses.every(s => s === 'served')
                const allReadyOrServed = allStatuses.every(s => s === 'ready' || s === 'served')
                const anyPreparing = allStatuses.some(s => s === 'preparing')
                const anyReady = allStatuses.some(s => s === 'ready')

                let newOrderStatus = 'pending'
                if (allServed) {
                    newOrderStatus = 'served'
                } else if (allReadyOrServed) {
                    newOrderStatus = 'ready'
                } else if (anyReady && (anyPreparing || allStatuses.some(s => s === 'pending'))) {
                    newOrderStatus = 'partially_ready'
                } else if (anyPreparing) {
                    newOrderStatus = 'preparing'
                } else if (anyReady || allStatuses.some(s => s === 'confirmed')) {
                    newOrderStatus = 'confirmed'
                }

                await supabase
                    .from('orders')
                    .update({ status: newOrderStatus })
                    .eq('id', item.order_id)

                // 3. Determine Ticket Status (if this item belongs to a ticket)
                if (item.ticket_id) {
                    const ticketItems = siblingItems.filter(i => i.ticket_id === item.ticket_id)
                    if (ticketItems.length > 0) {
                        const ticketStatuses = ticketItems.map(i => i.status)
                        const tAllServed = ticketStatuses.every(s => s === 'served')
                        const tAllReadyOrServed = ticketStatuses.every(s => s === 'ready' || s === 'served')
                        const tAnyPreparing = ticketStatuses.some(s => s === 'preparing')
                        const tAnyReady = ticketStatuses.some(s => s === 'ready')

                        let newTicketStatus = 'pending'
                        if (tAllServed) {
                            newTicketStatus = 'served'
                        } else if (tAllReadyOrServed) {
                            newTicketStatus = 'ready'
                        } else if (tAnyReady && (tAnyPreparing || ticketStatuses.some(s => s === 'pending'))) {
                            newTicketStatus = 'preparing' // Tickets don't really use partially_ready, preparing makes sense
                        } else if (tAnyPreparing) {
                            newTicketStatus = 'preparing'
                        }

                        await supabase
                            .from('kitchen_tickets')
                            .update({ status: newTicketStatus })
                            .eq('id', item.ticket_id)
                    }
                }
            }
        }

        return true
    } catch (error) {
        console.error('Error updating order item status:', error)
        return false
    }
}

export async function updateTicketStatus(ticketId: string, status: string) {
    try {
        // 1. Update the ticket itself
        const { error, data: ticket } = await supabase
            .from('kitchen_tickets')
            .update({ status })
            .eq('id', ticketId)
            .select()
            .single()

        if (error) throw error

        // 2. Auto-update order_items if ticket is ready or served
        if (status === 'ready' || status === 'served') {
            await supabase
                .from('order_items')
                .update({ status })
                .eq('ticket_id', ticketId)
                .neq('status', status)
        }

        // 3. Compute and Sync Parent Order Status
        if (ticket?.order_id) {
            const { data: siblingTickets } = await supabase
                .from('kitchen_tickets')
                .select('status')
                .eq('order_id', ticket.order_id)

            if (siblingTickets && siblingTickets.length > 0) {
                let newOrderStatus = 'pending'
                const statuses = siblingTickets.map(t => t.status)

                // Logic:
                // If any ticket is preparing -> order is preparing
                // If all tickets are ready or served -> order is ready (unless all are served)
                // If all tickets are served -> order is served
                
                const allServed = statuses.every(s => s === 'served')
                const allReadyOrServed = statuses.every(s => s === 'ready' || s === 'served')
                const anyPreparing = statuses.some(s => s === 'preparing')
                const anyReady = statuses.some(s => s === 'ready')

                if (allServed) {
                    newOrderStatus = 'served'
                } else if (allReadyOrServed) {
                    newOrderStatus = 'ready'
                } else if (anyPreparing) {
                    newOrderStatus = 'preparing'
                } else if (anyReady || statuses.some(s => s === 'confirmed')) {
                    newOrderStatus = 'confirmed'
                }

                // Update parent order
                await supabase
                    .from('orders')
                    .update({ status: newOrderStatus })
                    .eq('id', ticket.order_id)
            }
        }

        return true
    } catch (error) {
        console.error('Error updating ticket status:', error)
        return false
    }
}

export async function markOrderServed(orderId: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'served',
                served_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (error) throw error

        await supabase
            .from('order_items')
            .update({ status: 'served' })
            .eq('order_id', orderId)
            .neq('status', 'served')

        return true
    } catch (error) {
        console.error('Error marking order served:', error)
        return false
    }
}

export async function markCustomerFinished(orderId: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                payment_status: 'requested' 
            })
            .eq('id', orderId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error marking customer finished:', error)
        return false
    }
}

export async function closeOrderSession(orderId: string, paymentMethod: string = 'upi') {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'closed',
                payment_status: 'paid',
                payment_method: paymentMethod,
                is_open_bill: false
            })
            .eq('id', orderId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error closing order session:', error)
        return false
    }
}
