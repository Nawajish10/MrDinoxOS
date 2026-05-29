'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, ShoppingBag, ArrowLeft, Loader2, PartyPopper, Utensils, ChevronDown, ChevronUp, Plus, MessageCircle, DollarSign, Smartphone } from 'lucide-react'
import { useOrder } from '@/hooks/useOrder'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import useSound from 'use-sound'
import { ORDER_STATUS_SOUND } from '@/constants/sounds'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import { AddMoreReminder } from '@/components/customer/AddMoreReminder'
import { supabase } from '@/lib/supabase'
import { generateWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'

const STATUS_STEPS = [
    { id: 'confirmed', label: 'Order Confirmed', description: 'We\'ve received your order!', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'preparing', label: 'Cooking with Love', description: 'Chefs are working their magic.', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'ready', label: 'Ready to Serve', description: 'Plating up your delicious meal.', icon: Utensils, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'served', label: 'Bon Appétit!', description: 'Enjoy your meal.', icon: PartyPopper, color: 'text-green-500', bg: 'bg-green-500/10' },
]

export default function TrackOrderPage() {
    const params = useParams()
    const router = useRouter()
    const billId = params.billId as string
    const { order, items, loading } = useOrder(billId)
    const { setActiveOrder } = useCartStore()
    const [expandDetail, setExpandDetail] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const [isFinishing, setIsFinishing] = useState(false)
    const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
    const [showPaymentDialog, setShowPaymentDialog] = useState(false)
    const [paymentStep, setPaymentStep] = useState<'select' | 'upi_qr'>('select')

    // Sounds
    const [playConfirmed] = useSound(ORDER_STATUS_SOUND.confirmed)
    const [playPreparing] = useSound(ORDER_STATUS_SOUND.preparing)
    const [playReady] = useSound(ORDER_STATUS_SOUND.ready)
    const [playServed] = useSound(ORDER_STATUS_SOUND.served)
    const [playCancelled] = useSound(ORDER_STATUS_SOUND.cancelled)

    useEffect(() => {
        if (order?.status) {
            switch (order.status) {
                case 'confirmed': playConfirmed(); break;
                case 'preparing': playPreparing(); break;
                case 'ready': playReady(); break;
                case 'served': playServed(); setShowConfetti(true); break;
                case 'cancelled': playCancelled(); break;
            }
        }
    }, [order?.status, playConfirmed, playPreparing, playReady, playServed, playCancelled])

    useEffect(() => {
        const loadWhatsAppLink = async () => {
            if (!order) return

            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('whatsapp_number')
                .eq('id', order.restaurant_id)
                .maybeSingle()

            if (!restaurant?.whatsapp_number) return

            const message = generateWhatsAppMessage({
                billId: order.bill_id,
                tableNumber: order.restaurant_tables?.table_number?.toString() || null,
                customerName: order.customers?.name || 'Guest',
                customerPhone: order.customers?.phone || '',
                items: items.map((item) => ({
                    name: item.item_name,
                    quantity: item.quantity,
                    total: item.total
                })),
                grandTotal: order.total
            })

            setWhatsappLink(getWhatsAppUrl(restaurant.whatsapp_number, message))
        }

        loadWhatsAppLink()
    }, [order, items])

    if (loading || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                </div>
                <p className="text-slate-400 font-medium animate-pulse tracking-wide uppercase text-xs">Loading Order...</p>
            </div>
        )
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center space-y-8">
                <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center animate-bounce duration-1000">
                    <div className="w-24 h-24 bg-red-200 rounded-full flex items-center justify-center">
                        <span className="text-6xl">💔</span>
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-red-900 tracking-tight">Order Cancelled</h1>
                    <p className="text-red-700/80 mt-3 font-medium text-lg">We couldn&apos;t fulfill your order this time.</p>
                </div>
                <Button
                    onClick={() => router.push('/customer/menu')}
                    className="rounded-full px-10 h-14 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 transition-transform active:scale-95"
                >
                    Return to Menu
                </Button>
            </div>
        )
    }

    const currentStepIndex = STATUS_STEPS.findIndex(step =>
        order.status === step.id ||
        (order.status === 'completed' && step.id === 'served') ||
        (order.status === 'served' && step.id === 'ready')
    )

    const activeStep = STATUS_STEPS[currentStepIndex] || STATUS_STEPS[0]
    const isCompleted = order.status === 'completed' || order.status === 'served'

    const handleFinishOrdering = async (method: 'cash' | 'upi') => {
        setIsFinishing(true)
        setShowPaymentDialog(false)
        try {
            const res = await fetch('/api/orders/finish-ordering', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, paymentMethod: method })
            })
            
            if (res.ok) {
                toast.success('Waitstaff notified!', { description: `Please wait, someone will be with you shortly to collect your ${method.toUpperCase()} payment.` })
                // The order status doesn't change to completed here, it waits for admin
                // But we could disable the button if payment_status is requested
            } else {
                toast.error('Failed to notify staff.')
            }
        } catch {
            toast.error('An error occurred.')
        } finally {
            setIsFinishing(false)
        }
    }

    return (
        <div className="min-h-svh pb-40 relative overflow-hidden font-sans">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-50 to-transparent -z-10" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl -z-10" />
            <div className="absolute top-48 -left-24 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl -z-10" />

            {/* Header */}
            <header className="safe-top sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/customer/menu')}
                    className="tap-target rounded-2xl hover:bg-black/5 hover:text-black transition-colors text-slate-600"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Order ID</span>
                    <span className="text-sm font-bold text-slate-900 font-mono tracking-wide">#{billId.slice(-6)}</span>
                </div>
                <div className="w-10 flex justify-center">
                    {order.table_id && (
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200">
                            <span className="text-[10px] font-black text-orange-700">T-{order.restaurant_tables?.table_number || '?'}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
                {/* Hero Status */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="relative"
                    >
                        <div className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center bg-white shadow-2xl relative z-10",
                            activeStep.color
                        )}>
                            <activeStep.icon className="w-16 h-16" strokeWidth={1.5} />
                        </div>
                        {/* Ripple Effect */}
                        {!isCompleted && (
                            <>
                                <div className={cn("absolute inset-0 rounded-full opacity-20 animate-ping duration-[3s]", activeStep.bg.replace('/10', ''))} />
                                <div className={cn("absolute -inset-4 rounded-full opacity-10 animate-pulse", activeStep.bg.replace('/10', ''))} />
                            </>
                        )}

                        {/* Timer Badge */}
                        {!isCompleted && order.status !== 'ready' && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap"
                            >
                                <Clock className="w-3 h-3 text-orange-400" />
                                <span>~{order.estimated_time || 20} mins</span>
                            </motion.div>
                        )}
                    </motion.div>

                    <div className="space-y-2">
                        <motion.h1
                            key={activeStep.label}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-3xl font-black text-slate-900 tracking-tight"
                        >
                            {activeStep.label}
                        </motion.h1>
                        <motion.p
                            key={activeStep.description}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-slate-500 font-medium text-lg"
                        >
                            {activeStep.description}
                        </motion.p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="relative py-4">
                    <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-200/70 rounded-full" />
                    <div className="space-y-8 relative">
                        {STATUS_STEPS.map((step, index) => {
                            const isCurrent = index === currentStepIndex
                            const isPast = index < currentStepIndex || isCompleted

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-6 relative"
                                >
                                    {/* Icon Bubble */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center border-4 relative z-10 transition-all duration-500 shrink-0",
                                        isCurrent ? "bg-orange-500 border-orange-500 shadow-xl scale-110" :
                                            isPast ? "bg-orange-500 border-orange-500 shadow-md" :
                                                "bg-slate-100 border-slate-100"
                                    )}>
                                        {isPast ? (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        ) : (
                                            <step.icon className={cn(
                                                "w-6 h-6 transition-colors",
                                                isCurrent ? "text-white" : "text-slate-400"
                                            )} />
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className={cn(
                                        "flex-1 p-4 rounded-xl transition-all duration-300",
                                        isCurrent ? "" : "opacity-60 grayscale-[0.5]"
                                    )}>
                                        <h3 className={cn(
                                            "font-bold text-sm text-slate-600"
                                        )}>
                                            {step.label}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Order Summary Receipt */}
                <motion.div
                    layout
                    className="touch-card overflow-hidden rounded-[1.75rem]"
                >
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <ShoppingBag className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Your Order</p>
                                <p className="text-xs text-slate-400">{items.length} Items</p>
                            </div>
                        </div>
                        <p className="font-mono font-bold text-lg text-orange-400">₹{order.total.toFixed(2)}</p>
                    </div>

                    <div className="p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        <div className="space-y-4">
                            {/* Summary Preview (First 2 items) */}
                            {!expandDetail && items.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md">{item.quantity}x</span>
                                        <span className="font-medium text-slate-700">{item.item_name}</span>
                                    </div>
                                    <span className="font-mono text-slate-500">₹{item.total.toFixed(0)}</span>
                                </div>
                            ))}

                            <AnimatePresence>
                                {expandDetail && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 pt-1"
                                    >
                                        {/* Full List */}
                                        {items.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md min-w-[32px] text-center">{item.quantity}x</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-700">{item.item_name}</span>
                                                        {item.special_instructions && (
                                                            <span className="text-[10px] text-orange-600 font-medium italic">Note: {item.special_instructions}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="font-mono text-slate-500">₹{item.total.toFixed(0)}</span>
                                            </div>
                                        ))}

                                        <div className="border-t border-dashed border-slate-200 my-4" />

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-mono font-bold">₹{order.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Tax</span>
                                            <span className="font-mono font-bold">₹{order.tax?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            onClick={() => setExpandDetail(!expandDetail)}
                        >
                            {expandDetail ? <span className="flex items-center gap-2">Show Less <ChevronUp className="w-3 h-3" /></span> : <span className="flex items-center gap-2">View Full Receipt <ChevronDown className="w-3 h-3" /></span>}
                        </Button>
                    </div>
                </motion.div>
            </main>

            <div className="mobile-bottom-dock touch-card flex flex-col items-center justify-center gap-2 rounded-[2rem] p-2 shadow-2xl shadow-orange-900/10">
                {whatsappLink && (
                    <Button
                        variant="ghost"
                        className="h-11 w-full rounded-[1.35rem] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black"
                        onClick={() => window.open(whatsappLink, '_blank')}
                    >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp Restaurant
                    </Button>
                )}
                <div className="flex items-center gap-2 w-full">
                    <Button
                        className="flex-1 h-12 rounded-[1.5rem] bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg transition-all active:scale-95"
                        onClick={() => {
                            useCartStore.getState().setActiveOrder(order?.id || '', billId)
                            router.push('/customer/menu')
                        }}
                    >
                        <Plus className="mr-2 w-4 h-4" />
                        Add More Items
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isFinishing || order.payment_status === 'requested' || order.payment_status === 'paid'}
                        className="flex-1 h-12 rounded-[1.5rem] border-orange-200 text-orange-700 font-bold hover:bg-orange-50 transition-all active:scale-95"
                        onClick={() => { setShowPaymentDialog(true); setPaymentStep('select'); }}
                    >
                        {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : ((order.payment_status === 'requested' || order.payment_status === 'paid') ? 'Bill Requested' : 'Request Bill')}
                    </Button>
                </div>
            </div>

            <AddMoreReminder orderId={order.id} billId={billId} />

            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-20">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce flex items-center gap-2">
                        <PartyPopper className="w-5 h-5" /> Order Complete!
                    </div>
                </div>
            )}

            {/* Payment Selection Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-[340px] bg-white rounded-[2rem] p-6 border-none shadow-2xl mx-auto">
                    {paymentStep === 'select' ? (
                        <>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-2xl font-black text-slate-900 text-center">Payment Method</DialogTitle>
                                <DialogDescription className="text-center text-slate-500 font-medium">
                                    How would you like to pay your bill?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    className="h-28 flex flex-col gap-3 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                                    onClick={() => handleFinishOrdering('cash')}
                                >
                                    <div className="p-2 bg-orange-100 rounded-full group-hover:bg-white transition-colors">
                                        <DollarSign className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-orange-700">Cash</span>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="h-28 flex flex-col gap-3 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    onClick={() => setPaymentStep('upi_qr')}
                                >
                                    <div className="p-2 bg-blue-100 rounded-full group-hover:bg-white transition-colors">
                                        <Smartphone className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-blue-700">UPI / Card</span>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-2xl font-black text-slate-900 text-center">Scan to Pay</DialogTitle>
                                <DialogDescription className="text-center text-slate-500 font-medium">
                                    Use any UPI app to scan and pay
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className="p-4 bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                                    <QRCodeSVG 
                                        value={`upi://pay?pa=demo@upi&pn=Restaurant&am=${order.total}&cu=INR`} 
                                        size={200}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-slate-500 mb-1">Amount to pay</p>
                                    <p className="text-3xl font-black text-slate-900">₹{order.total.toFixed(2)}</p>
                                </div>
                                <Button 
                                    className="w-full h-12 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-all"
                                    onClick={() => handleFinishOrdering('upi')}
                                >
                                    I have paid
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-slate-500 font-bold hover:bg-slate-50 h-10"
                                    onClick={() => setPaymentStep('select')}
                                >
                                    Back to options
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
