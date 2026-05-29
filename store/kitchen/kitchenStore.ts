import { create } from 'zustand'
import { Order, OrderStatus, OrderType, KitchenTicket } from '@/types'
import { updateOrderStatus } from '@/services/orderService'

interface KitchenStore {
    orders: Order[]
    selectedOrder: Order | null
    kitchenTickets: KitchenTicket[]
    orderTypeFilter: 'all' | OrderType
    refreshInterval: number
    prepTimeThreshold: number
    isSoundEnabled: boolean
    isConnected: boolean
    lastUpdated: Date | null

    setOrders: (orders: Order[]) => void
    addOrder: (order: Order) => void
    updateOrder: (orderId: string, updates: Partial<Order>) => void
    removeOrder: (orderId: string) => void
    setKitchenTickets: (tickets: KitchenTicket[]) => void
    addKitchenTicket: (ticket: KitchenTicket) => void
    updateTicket: (ticketId: string, updates: Partial<KitchenTicket>) => void
    updateTicketOptimistic: (ticketId: string, updates: Partial<KitchenTicket>) => void
    updateItemOptimistic: (orderId: string, itemId: string, status: string) => void
    setSelectedOrder: (order: Order | null) => void
    setOrderTypeFilter: (filter: 'all' | OrderType) => void
    setRefreshInterval: (interval: number) => void
    setPrepTimeThreshold: (threshold: number) => void
    toggleSound: () => void
    setConnectionStatus: (status: boolean) => void
    getNewOrders: () => Order[]
    getPreparingOrders: () => Order[]
    getReadyOrders: () => Order[]
    getOrdersByType: (type: string) => Order[]
    getPendingTickets: () => KitchenTicket[]
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
    orders: [],
    selectedOrder: null,
    kitchenTickets: [],
    orderTypeFilter: 'all',
    refreshInterval: 30,
    prepTimeThreshold: 20,
    isSoundEnabled: true,
    isConnected: true,
    lastUpdated: null,

    setOrders: (orders) => set({ orders: orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), lastUpdated: new Date() }),

    addOrder: (order) => set((state) => ({
        orders: [...state.orders, order].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        lastUpdated: new Date()
    })),

    updateOrder: (orderId, updates) => {
        if (updates.status) {
            updateOrderStatus(orderId, updates.status as OrderStatus)
        }
        set((state) => ({
            orders: state.orders.map((o) => o.id === orderId ? { ...o, ...updates } : o),
            lastUpdated: new Date()
        }))
    },

    removeOrder: (orderId) => set((state) => ({
        orders: state.orders.filter((o) => o.id !== orderId)
    })),

    setKitchenTickets: (tickets) => set({ kitchenTickets: tickets, lastUpdated: new Date() }),
    addKitchenTicket: (ticket) => set((state) => ({
        kitchenTickets: [...state.kitchenTickets, ticket].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        lastUpdated: new Date()
    })),
    updateTicket: (ticketId, updates) => {
        set((state) => ({
            kitchenTickets: state.kitchenTickets.map((t) => t.id === ticketId ? { ...t, ...updates } : t),
            lastUpdated: new Date()
        }))
    },
    updateTicketOptimistic: (ticketId, updates) => {
        set((state) => {
            // First update the tickets list if we are using it
            const newTickets = state.kitchenTickets.map((t) => t.id === ticketId ? { ...t, ...updates } : t)
            
            // Second, deeply update the nested ticket inside the parent order
            // This ensures app/kitchen/page.tsx sees the updated ticket instantly!
            const newOrders = state.orders.map(order => {
                if (!order.kitchen_tickets) return order;
                const hasTicket = order.kitchen_tickets.some(t => t.id === ticketId);
                if (!hasTicket) return order;

                return {
                    ...order,
                    kitchen_tickets: order.kitchen_tickets.map(t => 
                        t.id === ticketId ? { ...t, ...updates } : t
                    )
                }
            })

            return {
                kitchenTickets: newTickets,
                orders: newOrders,
                lastUpdated: new Date()
            }
        })
    },
    updateItemOptimistic: (orderId, itemId, status) => {
        set((state) => {
            const newOrders = state.orders.map(order => {
                if (order.id !== orderId || !order.order_items) return order;

                // Update the item status
                const newItems = order.order_items.map(item => 
                    item.id === itemId ? { ...item, status: status as any } : item
                );

                return {
                    ...order,
                    order_items: newItems
                }
            })

            return {
                orders: newOrders,
                lastUpdated: new Date()
            }
        })
    },

    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setOrderTypeFilter: (filter) => set({ orderTypeFilter: filter }),
    setRefreshInterval: (interval) => set({ refreshInterval: interval }),
    setPrepTimeThreshold: (threshold) => set({ prepTimeThreshold: threshold }),
    toggleSound: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
    setConnectionStatus: (status) => set({ isConnected: status }),

    getNewOrders: () => {
        const { orders, orderTypeFilter } = get()
        let filtered = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getPreparingOrders: () => {
        const { orders, orderTypeFilter } = get()
        let filtered = orders.filter(o => o.status === 'preparing')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getReadyOrders: () => {
        const { orders, orderTypeFilter } = get()
        let filtered = orders.filter(o => o.status === 'ready')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getOrdersByType: (type) => {
        const { orders } = get()
        if (type === 'all') return orders
        return orders.filter(o => o.order_type === type)
    },

    getPendingTickets: () => {
        const { kitchenTickets } = get()
        return kitchenTickets.filter(t => t.status === 'pending')
    }
}))
