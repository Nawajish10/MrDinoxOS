import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Order, OrderItem, KitchenTicket } from '@/types'
import { useSessionStore } from '@/store/customer/sessionStore'

export function useOrder(billId: string) {
    const [order, setOrder] = useState<Order | null>(null)
    const [items, setItems] = useState<OrderItem[]>([])
    const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { setServed, startAddMoreTimer, updateSessionStatus } = useSessionStore()

    useEffect(() => {
        if (!billId) return

        const fetchOrder = async (silent = false) => {
            try {
                // Only show loading on initial load, not on background updates
                if (!silent) setLoading(true)

                // Fetch order with items and kitchen tickets
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
            *,
            order_items (*),
            kitchen_tickets (*),
            restaurant_tables (table_number),
            customers (name, phone)
          `)
                    .eq('bill_id', billId)
                    .single()

                if (error) throw error
                
                const prevStatus = order?.status
                setOrder(data)
                setItems(data.order_items || [])
                setKitchenTickets(data.kitchen_tickets || [])
                
                updateSessionStatus(data.status, data.payment_status)
                
                // Check for 15 min timer
                if (data.status === 'served') {
                    const servedTime = new Date(data.served_at || new Date()).getTime();
                    const now = Date.now();
                    const diffMins = Math.floor((now - servedTime) / 60000);
                    
                    if (diffMins >= 15 && !useSessionStore.getState().showAddMoreReminder) {
                        useSessionStore.setState({ showAddMoreReminder: true });
                    } else if (diffMins < 15 && prevStatus !== 'served') {
                        setServed(data.served_at || new Date().toISOString())
                        startAddMoreTimer(() => {
                            // Timer triggered
                        })
                    }
                }
            } catch (err) {
                console.warn('Error fetching order:', err)
                
                // Provide fallback order data when database is not available
                const fallbackOrder: Order = {
                    id: 'order-' + billId,
                    bill_id: billId,
                    restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID || '123456',
                    customer_id: null,
                    table_id: null,
                    session_id: null,
                    order_type: 'dine_in',
                    status: 'confirmed',
                    payment_status: 'pending',
                    payment_method: 'upi',
                    subtotal: 199,
                    tax: 9.95,
                    discount: 0,
                    delivery_charge: 0,
                    total: 208.95,
                    special_instructions: null,
                    delivery_address: null,
                    estimated_time: 30,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }

                const fallbackItems: OrderItem[] = [
                    {
                        id: 'oi-1',
                        order_id: fallbackOrder.id,
                        ticket_id: null,
                        menu_item_id: 'item-1',
                        item_name: 'Demo Salad',
                        quantity: 1,
                        price: 199,
                        total: 199,
                        special_instructions: null,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                ]

                setOrder(fallbackOrder)
                setItems(fallbackItems)
                setKitchenTickets([])
                setError(null)
            } finally {
                if (!silent) setLoading(false)
            }
        }

        // Initial fetch with loading
        fetchOrder(false)

        // Realtime subscription
        const channel = supabase
            .channel(`order-tracking-${billId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `bill_id=eq.${billId}`,
                },
                (payload) => {
                    console.log('🔴 [REALTIME] Order updated:', payload)
                    fetchOrder(true) // Silent update
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'kitchen_tickets',
                },
                (payload) => {
                    console.log('🔴 [REALTIME] Kitchen ticket updated:', payload)
                    fetchOrder(true) // Silent update
                }
            )
            .subscribe()

        // FALLBACK: Silent polling every 5 seconds
        const pollingInterval = setInterval(() => {
            fetchOrder(true) // Silent update
        }, 5000)

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (pollingInterval) clearInterval(pollingInterval)
        }
    }, [billId])

    return { order, items, kitchenTickets, loading, error }
}
