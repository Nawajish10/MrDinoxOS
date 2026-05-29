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
                    className="mobile-bottom-dock pointer-events-none"
                >
                    <button
                        onClick={openCart}
                        className="pointer-events-auto relative flex min-h-[68px] w-full items-center justify-between overflow-hidden rounded-[1.75rem] bg-slate-950 p-3 pl-4 text-white shadow-2xl shadow-slate-950/25 transition-all active:scale-[0.985] group"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(248,113,113,0.35),transparent_45%)] opacity-80" />

                        <div className="relative z-10 flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/12 backdrop-blur-sm">
                                <ShoppingBag className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
                                    Current cart
                                </span>
                                <span className="text-lg font-black leading-tight">
                                    {count} {count === 1 ? 'Item' : 'Items'} • ₹{total.toFixed(0)}
                                </span>
                            </div>
                        </div>

                        <div className="relative z-10 flex min-h-11 items-center gap-1 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition-transform group-active:translate-x-0.5">
                            View <ChevronRight className="h-4 w-4" />
                        </div>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
