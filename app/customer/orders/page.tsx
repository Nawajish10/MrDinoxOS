'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingBag, ChevronRight, Utensils, Box, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/customer/cartStore'
import { Badge } from '@/components/ui/badge'

interface Order {
    id: string
    created_at: string
    total: number
    status: string
    order_type: string
    bill_id: string
    quantity_count?: number
    order_items?: { id: string; item_name: string; quantity: number }[]
}

export default function OrderHistoryPage() {
    const router = useRouter()
    const { customerPhone } = useCartStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = React.useCallback(async () => {
        if (!customerPhone) {
            setLoading(false)
            return
        }

        try {
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customerPhone)
                .maybeSingle()

            if (customerError || !customerData) {
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    created_at, 
                    total, 
                    status, 
                    order_type, 
                    bill_id,
                    order_items(id, item_name, quantity)
                `)
                .eq('customer_id', customerData.id)
                .order('created_at', { ascending: false })

            if (!error && data) {
                setOrders(data)
            }
        } catch (err) {
            console.error('Error fetching orders:', err)
        } finally {
            setLoading(false)
        }
    }, [customerPhone])

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null

        const setupRealtime = async () => {
            fetchOrders()

            if (!customerPhone) return

            const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customerPhone)
                .maybeSingle()

            if (!customerData) return

            channel = supabase
                .channel(`customer-orders-${customerData.id}-${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `customer_id=eq.${customerData.id}`
                    },
                    () => {
                        fetchOrders()
                    }
                )
                .subscribe()
        }

        setupRealtime()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [customerPhone, fetchOrders])

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32 text-[#111827]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] p-4 flex items-center gap-4 shadow-xs">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.push('/customer/menu')} 
                    className="rounded-full hover:bg-gray-100 text-[#111827]"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-bold tracking-tight text-[#111827]">Order History</h1>
            </header>

            <div className="p-4 max-w-lg mx-auto space-y-4 pt-6">
                {!customerPhone ? (
                    <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-base text-[#111827]">No phone session</h3>
                        <p className="text-xs text-[#6B7280]">Add items and place an order to see your live order history.</p>
                        <Button 
                            onClick={() => router.push('/customer/menu')} 
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white rounded-full font-bold text-xs px-6"
                        >
                            Browse Menu
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-[#6B7280]">Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-base text-[#111827]">No past orders</h3>
                        <p className="text-xs text-[#6B7280]">Looks like you haven&apos;t ordered yet.</p>
                        <Button 
                            onClick={() => router.push('/customer/menu')} 
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white rounded-full font-bold text-xs px-6"
                        >
                            Order Now
                        </Button>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => router.push(`/customer/track/${order.bill_id}`)}
                            className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-orange-200 transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-gray-100 text-[#111827] px-2 py-0.5 rounded-md">
                                        #{order.bill_id.slice(-6)}
                                    </span>
                                    <Badge 
                                        variant="secondary" 
                                        className={`text-[10px] uppercase font-bold border-0 ${
                                            order.status === 'completed' || order.status === 'served' 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : order.status === 'cancelled' 
                                                ? 'bg-red-50 text-red-700' 
                                                : 'bg-orange-50 text-[#FF6B00]'
                                        }`}
                                    >
                                        {order.status}
                                    </Badge>
                                </div>
                                <span className="text-xs text-[#6B7280] font-medium">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1">
                                        {order.order_type === 'dine_in' ? <Utensils className="w-3.5 h-3.5 text-orange-500" /> :
                                            order.order_type === 'take_away' ? <Box className="w-3.5 h-3.5 text-blue-500" /> : <MapPin className="w-3.5 h-3.5 text-emerald-500" />}
                                        <span className="capitalize">{order.order_type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="font-extrabold text-base text-[#111827]">₹{order.total.toFixed(2)}</p>
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {order.order_items?.slice(0, 3).map((item) => (
                                            <span key={item.id} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-[#111827] font-semibold">
                                                {item.quantity}x {item.item_name}
                                            </span>
                                        ))}
                                        {order.order_items && order.order_items.length > 3 && (
                                            <span className="text-[10px] text-[#6B7280] font-semibold py-0.5">
                                                +{order.order_items.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-gray-100 text-[#111827]">
                                    <ChevronRight className="w-5 h-5 text-[#6B7280]" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
