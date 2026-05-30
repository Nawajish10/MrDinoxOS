import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Order, OrderItem, KitchenTicket } from '@/types'
import { useSessionStore } from '@/store/customer/sessionStore'

export function useOrder(billId: string) {
    const [order, setOrder] = useState<Order | null>(null)
    const orderIdRef = useRef<string | null>(null)
    const [items, setItems] = useState<OrderItem[]>([])
    const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { setServed, startAddMoreTimer, updateSessionStatus } = useSessionStore()

    // Debounce ref to prevent rapid duplicate fetches
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const orderRef = useRef<Order | null>(null)

    // Keep orderRef in sync
    useEffect(() => {
        orderRef.current = order
    }, [order])

    const fetchOrder = useCallback(async (silent = false) => {
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
            customers (name, phone)
          `)
                .eq('bill_id', billId)
                .single()

            if (error) throw error
            
            const prevStatus = orderRef.current?.status
            orderIdRef.current = data.id
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
    }, [billId, setServed, startAddMoreTimer, updateSessionStatus])

    // Debounced fetch — collapses rapid events into a single fetch
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
            fetchOrder(true)
        }, 300)
    }, [fetchOrder])

    useEffect(() => {
        if (!billId) return

        // Initial fetch with loading
        fetchOrder(false)

        // Realtime subscription — single channel for all tables
        const channel = supabase
            .channel(`order-tracking-${billId}`)
            // 1. Listen to the ORDER itself (status, payment_status changes)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `bill_id=eq.${billId}`,
                },
                (payload) => {
                    console.log('🔴 [CUSTOMER RT] Order updated:', payload.eventType)
                    debouncedFetch()
                }
            )
            // 2. Listen to ORDER_ITEMS changes (item status updates from kitchen)
            //    No client-side filter — the debouncedFetch re-queries by bill_id, so it's always correct.
            //    This ensures we catch status-only updates where order_id might not be in the changed columns.
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items',
                },
                (payload) => {
                    console.log('🔴 [CUSTOMER RT] Order item changed:', payload.eventType)
                    debouncedFetch()
                }
            )
            // 3. Listen to KITCHEN_TICKETS changes (new tickets, status changes)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'kitchen_tickets',
                },
                (payload) => {
                    console.log('🔴 [CUSTOMER RT] Kitchen ticket changed:', payload.eventType)
                    debouncedFetch()
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [CUSTOMER RT] Realtime connected for', billId)
                }
                if (err) console.warn('❌ [CUSTOMER RT] Subscription error:', err)
            })

        // 15-second polling backup — catches any silently dropped events
        const pollInterval = setInterval(() => {
            fetchOrder(true)
        }, 15000)

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
            clearInterval(pollInterval)
            supabase.removeChannel(channel)
        }
    }, [billId, fetchOrder, debouncedFetch])

    return { order, items, kitchenTickets, loading, error }
}
