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
                        className="bg-obsidian-base/80 backdrop-blur-[24px] border border-electric-red rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(255,59,59,0.3)] cursor-pointer hover:bg-obsidian-base transition-colors active:scale-95"
                    >
                        <div className="flex flex-col">
                            <span className="bg-electric-red text-obsidian-base font-label-sm text-[10px] px-2 py-1 rounded-sm font-bold tracking-wider mb-1 w-fit">
                                {count} {count === 1 ? 'ITEM' : 'ITEMS'}
                            </span>
                            <span className="font-headline-md text-on-surface font-bold font-['Geist'] leading-none">
                                ₹{total.toFixed(2)}
                            </span>
                        </div>
                        <button 
                            className="bg-electric-red text-obsidian-base font-label-md font-bold px-4 py-2 rounded-DEFAULT flex items-center gap-1 hover:bg-electric-red/90 transition-colors shadow-[0_0_10px_rgba(255,59,59,0.4)] pointer-events-none"
                        >
                            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>Cart
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
