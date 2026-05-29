'use client'

import { Clock, ReceiptText, Utensils } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

export function CustomerBottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { activeBillId, getItemCount } = useCartStore()
    const hasCart = getItemCount() > 0

    if (pathname?.includes('checkout') || pathname?.includes('scan')) return null

    const items = [
        { label: 'Menu', icon: Utensils, href: '/customer/menu', active: pathname?.includes('/customer/menu') },
        { label: 'Orders', icon: Clock, href: '/customer/orders', active: pathname?.includes('/customer/orders') },
        activeBillId
            ? { label: 'Bill', icon: ReceiptText, href: `/customer/track/${activeBillId}`, active: pathname?.includes('/customer/track') }
            : null,
    ].filter(Boolean) as Array<{ label: string; icon: typeof Utensils; href: string; active: boolean }>

    return (
        <AnimatePresence>
            {!hasCart && (
                <motion.nav
                    initial={{ y: 24, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 24, opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="mobile-bottom-dock md:hidden"
                    aria-label="Customer navigation"
                >
                    <div
                        className="touch-card grid rounded-[1.65rem] p-1.5 shadow-2xl shadow-slate-900/12"
                        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    >
                        {items.map((item) => (
                            <button
                                key={item.href}
                                onClick={() => router.push(item.href)}
                                className={cn(
                                    'tap-target relative flex items-center justify-center gap-2 rounded-[1.25rem] text-xs font-black transition-all',
                                    item.active ? 'text-white' : 'text-slate-500 active:bg-slate-100'
                                )}
                            >
                                {item.active && (
                                    <motion.span
                                        layoutId="customer-bottom-nav-active"
                                        className="absolute inset-0 rounded-[1.25rem] bg-slate-950 shadow-lg shadow-slate-950/20"
                                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    />
                                )}
                                <item.icon className="relative z-10 h-4 w-4" />
                                <span className="relative z-10">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.nav>
            )}
        </AnimatePresence>
    )
}
