'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Minus, X, Trash2, ShoppingBag, Tag, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { validateCoupon } from '@/actions/coupon'
import { toast } from 'sonner'

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

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return

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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[100] shadow-2xl flex flex-col overflow-hidden border-l border-[#E5E7EB]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E7EB] bg-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-50 text-[#FF6B00] p-2.5 rounded-xl border border-orange-200/60">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#111827]">Your Cart</h2>
                                    <p className="text-xs text-[#6B7280]">
                                        {items.length} {items.length === 1 ? 'item' : 'items'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={closeCart} 
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#111827] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-gray-100">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-base font-bold text-[#111827]">Your cart is empty</p>
                                    <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
                                        Explore our delicious dishes and add items to your table order.
                                    </p>
                                    <Button 
                                        onClick={closeCart} 
                                        className="mt-5 bg-[#FF6B00] hover:bg-[#e66000] text-white rounded-full px-6 font-bold text-xs"
                                    >
                                        Explore Menu
                                    </Button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.cartId}
                                        className="pt-3.5 first:pt-0 flex gap-3 sm:gap-4 items-start"
                                    >
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center font-bold text-sm shrink-0">
                                                🍽️
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-sm text-[#111827] truncate">
                                                    {item.name}
                                                </h4>
                                                <span className="font-bold text-sm text-[#111827] whitespace-nowrap">
                                                    ₹{(item.lineTotal).toFixed(0)}
                                                </span>
                                            </div>

                                            {item.instructions && (
                                                <p className="text-[11px] text-[#6B7280] italic truncate mt-0.5">
                                                    Note: {item.instructions}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-2.5">
                                                {/* Stepper */}
                                                <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                                        className="p-1 text-[#111827] hover:bg-white rounded transition-colors"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-xs font-bold w-6 text-center text-[#111827]">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                                        className="p-1 text-[#111827] hover:bg-white rounded transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => removeItem(item.cartId)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Summary & Checkout */}
                        {items.length > 0 && (
                            <div className="p-4 sm:p-5 bg-gray-50/80 border-t border-[#E5E7EB] space-y-3.5">
                                {/* Coupon Input */}
                                {!coupon ? (
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Enter coupon (e.g. WELCOME10)"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#111827] uppercase placeholder:normal-case outline-hidden focus:border-[#FF6B00]"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleApplyCoupon}
                                            disabled={verifying || !couponCode.trim()}
                                            className="bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl px-4 py-2 h-auto"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                            <span>Coupon <strong>{coupon.code}</strong> applied</span>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-emerald-700 hover:text-red-600 font-bold ml-2 underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}

                                {/* Bill Breakdown */}
                                <div className="space-y-1.5 text-xs text-[#6B7280]">
                                    <div className="flex justify-between">
                                        <span>Item Total</span>
                                        <span className="font-semibold text-[#111827]">₹{subtotal.toFixed(2)}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-semibold">
                                            <span>Discount</span>
                                            <span>-₹{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Taxes & Charges (5%)</span>
                                        <span className="font-semibold text-[#111827]">₹{tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm sm:text-base font-extrabold text-[#111827] pt-2 border-t border-gray-200">
                                        <span>To Pay</span>
                                        <span className="text-[#FF6B00]">₹{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <Button
                                    onClick={handleCheckout}
                                    className="w-full bg-[#FF6B00] hover:bg-[#e66000] text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md shadow-[#FF6B00]/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 h-auto"
                                >
                                    <span>Proceed to Checkout</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
