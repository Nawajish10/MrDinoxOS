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

    if (pathname?.includes('checkout') || pathname?.includes('scan') || pathname?.includes('track')) return null

    const items = [
        { label: 'Menu', icon: Utensils, href: '/customer/menu', active: pathname?.includes('/customer/menu') },
        { label: 'Orders', icon: Clock, href: '/customer/orders', active: pathname?.includes('/customer/orders') },
        activeBillId
            ? { label: 'Bill', icon: ReceiptText, href: `/customer/track/${activeBillId}`, active: pathname?.includes('/customer/track') }
            : null,
    ].filter(Boolean) as Array<{ label: string; icon: typeof Utensils; href: string; active: boolean }>

    return (
        <nav className="md:hidden fixed bottom-0 w-full flex justify-around items-center h-16 px-6 pb-safe bg-obsidian-base/80 backdrop-blur-lg z-50 border-t border-border-gray shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
            <button 
                onClick={() => router.push('/customer/menu')}
                className={cn(
                    "flex flex-col items-center justify-center transition-colors p-2 btn-scale-down",
                    pathname?.includes('/customer/menu') ? "text-primary-container font-bold" : "text-on-surface-variant hover:text-primary-container"
                )}
            >
                <span className="material-symbols-outlined text-[20px]" style={pathname?.includes('/customer/menu') ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
                <span className="font-label-sm text-[10px] mt-1">Home</span>
            </button>
            <button 
                onClick={() => router.push('/customer/orders')}
                className={cn(
                    "flex flex-col items-center justify-center transition-colors p-2 btn-scale-down",
                    pathname?.includes('/customer/orders') ? "text-primary-container font-bold" : "text-on-surface-variant hover:text-primary-container"
                )}
            >
                <span className="material-symbols-outlined text-[20px]" style={pathname?.includes('/customer/orders') ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
                <span className="font-label-sm text-[10px] mt-1">Orders</span>
            </button>
            {activeBillId && (
                <button 
                    onClick={() => router.push(`/customer/track/${activeBillId}`)}
                    className={cn(
                        "flex flex-col items-center justify-center transition-colors p-2 btn-scale-down",
                        pathname?.includes('/customer/track') ? "text-primary-container font-bold" : "text-on-surface-variant hover:text-primary-container"
                    )}
                >
                    <span className="material-symbols-outlined text-[20px]" style={pathname?.includes('/customer/track') ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt</span>
                    <span className="font-label-sm text-[10px] mt-1">Bill</span>
                </button>
            )}
        </nav>
    )
}
