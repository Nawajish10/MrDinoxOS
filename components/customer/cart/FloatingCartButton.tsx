'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ShoppingBag } from 'lucide-react'
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
                        className="bg-gray-950/95 backdrop-blur-md text-white border border-gray-800 rounded-2xl p-3.5 px-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.18)] cursor-pointer hover:bg-black transition-all active:scale-98"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#FF6B00]/30 shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-300">
                                    {count} {count === 1 ? 'item added' : 'items added'}
                                </span>
                                <span className="font-extrabold text-base text-white tracking-tight leading-tight">
                                    ₹{total.toFixed(0)}
                                </span>
                            </div>
                        </div>

                        <button 
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm shadow-[#FF6B00]/25 transition-all pointer-events-none"
                        >
                            <span>View Cart</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
