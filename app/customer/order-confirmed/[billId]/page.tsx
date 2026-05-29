'use client'

import React, { useEffect } from 'react'
import { CheckCircle, Clock, ShoppingBag, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp'

export default function OrderConfirmedPage() {
    const router = useRouter()
    const params = useParams()
    const billId = params.billId as string
    const searchParams = useSearchParams()
    const isRunningOrder = searchParams.get('mode') === 'append'
    const { setActiveOrder } = useCartStore()

    const [whatsappLink, setWhatsappLink] = React.useState<string | null>(null)
    const [orderId, setOrderId] = React.useState<string | null>(null)

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const { data: order, error } = await supabase
                    .from('orders')
                    .select('*, restaurant_tables(table_number), order_items(*), customers(name, phone)')
                    .eq('bill_id', billId)
                    .single()

                if (error) throw error

                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('whatsapp_number')
                    .eq('id', process.env.NEXT_PUBLIC_RESTAURANT_ID)
                    .single()

                if (order) {
                    setOrderId(order.id)
                }

                if (order && restaurant?.whatsapp_number) {
                    const message = generateWhatsAppMessage({
                        billId: order.bill_id,
                        tableNumber: order.restaurant_tables?.table_number?.toString() || null,
                        customerName: order.customers?.name || 'Guest',
                        customerPhone: order.customers?.phone || '',
                        items: order.order_items.map((i: { item_name: string; quantity: number; total: number }) => ({
                            name: i.item_name,
                            quantity: i.quantity,
                            total: i.total
                        })),
                        grandTotal: order.total
                    })
                    setWhatsappLink(getWhatsAppUrl(restaurant.whatsapp_number, message))
                }
            } catch (err) {
                console.error('Failed to load order details for whatsapp:', err)
            }
        }
        fetchOrderDetails()
    }, [billId])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-green-50 to-background text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 pattern-grid-lg opacity-[0.02]" />

            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            >
                <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-8 shadow-2xl shadow-green-500/30 ring-4 ring-green-100">
                    <CheckCircle className="w-20 h-20 text-white" />
                </div>
            </motion.div>

            <div className="space-y-4 relative z-10">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-800"
                >
                    Order Confirmed!
                </motion.h1>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur border border-green-100 rounded-2xl p-4 shadow-sm inline-block"
                >
                    <p className="text-sm text-green-800 font-medium mb-1">Order ID</p>
                    <p className="text-2xl font-mono font-bold text-green-950 tracking-wider">#{billId}</p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-xs mx-auto text-muted-foreground text-sm leading-relaxed"
                >
                    <p>We&apos;ve received your order and the kitchen is firing up! You can track the status live.</p>
                </motion.div>
            </div>

            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-xs space-y-4 z-10"
            >
                <Button
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-green-200 hover:shadow-green-300 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                    onClick={() => router.push(`/customer/track/${billId}`)}
                >
                    Track Order <Clock className="ml-2 w-5 h-5" />
                </Button>

                {isRunningOrder && (
                    <Button
                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 bg-gradient-to-r from-orange-600 to-red-600 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                        onClick={() => {
                            if (orderId) {
                                setActiveOrder(orderId, billId)
                                router.push('/customer/menu')
                            }
                        }}
                    >
                        Add More Items <Plus className="ml-2 w-5 h-5" />
                    </Button>
                )}

                <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => router.push('/customer/menu')}
                >
                    {isRunningOrder ? 'Continue Ordering' : 'Home'} <ShoppingBag className="ml-2 w-4 h-4" />
                </Button>

                {whatsappLink && (
                    <Button
                        variant="default"
                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-green-200 hover:shadow-green-300 bg-[#25D366] hover:bg-[#128C7E] text-white hover:scale-[1.02] transition-transform active:scale-[0.98]"
                        onClick={() => window.open(whatsappLink, '_blank')}
                    >
                        Go to WhatsApp <MessageCircle className="ml-2 w-5 h-5 fill-white" />
                    </Button>
                )}
            </motion.div>
        </div>
    )
}
