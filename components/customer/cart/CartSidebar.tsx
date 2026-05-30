'use client'

import React, { useEffect } from 'react'
import { Plus, Minus, X, Trash2, ShoppingBag, Ticket, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { validateCoupon, getAvailableCoupons } from '@/actions/coupon'
import { toast } from 'sonner'
import { useState } from 'react'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export function CartSidebar() {
    const { isCartOpen, closeCart } = useUIStore()
    const {
        items,
        removeItem,
        updateQuantity,
        getTotal,
        getSubtotal,
        getTax,
        clearCart,
        coupon,
        applyCoupon,
        removeCoupon,
        getDiscount
    } = useCartStore()
    const router = useRouter()

    const [couponCode, setCouponCode] = useState('')
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isCartOpen])

    const subtotal = getSubtotal()
    const tax = getTax()
    const discount = getDiscount()
    const total = getTotal()

    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return

        // Check if already used
        if (useCartStore.getState().isCouponUsed(couponCode)) {
            toast.error('This coupon has already been used', {
                description: 'Each coupon can only be used once per customer.'
            })
            setCouponCode('')
            return
        }

        setVerifying(true)
        const result = await validateCoupon(couponCode, useCartStore.getState().getSubtotal())
        setVerifying(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.coupon) {
            useCartStore.getState().applyCoupon(result.coupon)
            toast.success(`Coupon ${result.coupon.code} applied!`)
            setCouponCode('')
        }
    }

    const handleCheckout = () => {
        closeCart()
        router.push('/customer/checkout')
    }

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 inset-x-0 h-[88svh] sm:h-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-obsidian-base z-50 shadow-2xl rounded-t-[2rem] sm:rounded-l-[2rem] sm:rounded-tr-none flex flex-col overflow-hidden border-l border-border-gray"
                    >
                        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-gray bg-surface-container-lowest">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-container/10 p-2 rounded-xl border border-primary-container/20">
                                    <ShoppingBag className="w-6 h-6 text-primary-container" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold leading-none text-on-surface">Your Cart</h2>
                                    <p className="text-xs text-on-surface-variant font-medium mt-1">{items.length} items</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeCart} className="tap-target rounded-full hover:bg-surface-container text-on-surface active:scale-95 transition-transform">
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar momentum-scroll p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-6 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center">
                                        <ShoppingBag className="w-10 h-10 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-on-surface">Your cart is empty</p>
                                        <p className="text-sm">Looks like you haven't added anything yet.</p>
                                    </div>
                                    <Button onClick={closeCart} size="lg" className="rounded-xl px-8 font-bold shadow-lg shadow-primary-container/20 bg-primary-container text-obsidian-base hover:opacity-90">
                                        Browse Menu
                                    </Button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <motion.div
                                        layout
                                        key={item.cartId}
                                        className="bg-surface-container-lowest border border-border-gray flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all group relative overflow-hidden hover:border-primary-container/30 hover:shadow-[0_0_15px_rgba(255,179,172,0.1)]"
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-container to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="h-20 w-20 shrink-0 rounded-xl bg-surface-container object-cover"
                                            />
                                        ) : (
                                            <div className="h-20 w-20 shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                                                <span className="text-xs">No Img</span>
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-base leading-tight truncate pr-4 text-on-surface">{item.name}</h3>
                                                    <span className="font-bold text-base whitespace-nowrap text-primary-container">₹{(item.lineTotal).toFixed(0)}</span>
                                                </div>
                                                {item.instructions && (
                                                    <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-electric-red/10 text-[10px] font-medium text-electric-red border border-electric-red/20 max-w-full truncate">
                                                        Note: {item.instructions}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-2 rounded-DEFAULT border border-primary-container/50 bg-surface p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                                        className="tap-target !min-h-7 !min-w-7 flex items-center justify-center bg-transparent rounded shadow-sm text-on-surface-variant hover:text-primary-container active:scale-90 transition-all"
                                                    >
                                                        <Minus className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                    <span className="text-sm font-bold w-4 text-center text-primary-container">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                                        className="tap-target !min-h-7 !min-w-7 flex items-center justify-center bg-primary-container rounded shadow-sm text-obsidian-base hover:opacity-90 active:scale-90 transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="tap-target text-on-surface-variant hover:text-electric-red hover:bg-electric-red/10 rounded-xl transition-colors"
                                                    onClick={() => removeItem(item.cartId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="safe-bottom p-5 sm:p-6 bg-surface-container-lowest border-t border-border-gray space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-on-surface-variant font-medium">
                                        <span>Subtotal</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between text-on-surface-variant font-medium">
                                        <span>Tax (5%)</span>
                                        <span>₹{tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-black text-xl pt-2 border-t border-dashed border-border-gray mt-2 text-primary-container">
                                        <span>Total</span>
                                        <span>₹{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-15 min-h-[60px] rounded-[1.35rem] text-base font-black shadow-xl shadow-primary-container/20 hover:shadow-primary-container/40 active:scale-[0.98] transition-all bg-primary-container hover:bg-primary-container/90 text-obsidian-base border border-primary-container"
                                    onClick={handleCheckout}
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
