'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ShoppingBag, ShoppingCart } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'

export function FloatingCartButton() {
    const { getTotal, getItemCount } = useCartStore()
    const { openCart, isCartOpen } = useUIStore()
    const [isClient, setIsClient] = React.useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) return null
    if (pathname?.includes('checkout') || pathname?.includes('scan')) return null

    const count = getItemCount()
    const total = getTotal()

    if (count === 0) return null

    return (
        <AnimatePresence>
            {!isCartOpen && (
                <motion.div
                    initial={{ y: 28, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 28, opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96 md:bottom-8"
                >
                    <div 
                        onClick={openCart}
                        className="bg-[#FF5A1F] hover:bg-[#e64f19] text-white rounded-2xl p-3 px-4 flex items-center justify-between shadow-[0_8px_30px_rgba(255,90,31,0.35)] cursor-pointer transition-all active:scale-98"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-white/90">
                                    {count} {count === 1 ? 'item added' : 'items added'}
                                </span>
                                <span className="font-extrabold text-base text-white tracking-tight leading-tight">
                                    ₹{total.toFixed(0)}
                                </span>
                            </div>
                        </div>

                        <button 
                            className="bg-white text-[#FF5A1F] font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition-all pointer-events-none"
                        >
                            <span>View Cart</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
