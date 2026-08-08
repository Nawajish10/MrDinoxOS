'use client'

import { Clock, ReceiptText, Utensils, Home } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

export function CustomerBottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { activeBillId } = useCartStore()

    if (pathname?.includes('checkout') || pathname?.includes('scan') || pathname?.includes('track')) {
        return null
    }

    const isHome = pathname === '/customer/menu' || pathname === '/customer'
    const isOrders = pathname?.includes('/customer/orders')

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md z-40 border-t border-[#E5E7EB] flex items-center justify-around px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {/* Home Tab */}
            <button 
                onClick={() => router.push('/customer/menu')}
                className={cn(
                    "flex flex-col items-center justify-center py-1 px-3 transition-colors cursor-pointer",
                    isHome ? "text-[#FF6B00] font-bold" : "text-[#6B7280] hover:text-[#111827]"
                )}
            >
                <Home className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Home</span>
            </button>

            {/* Menu Tab */}
            <button 
                onClick={() => {
                    if (pathname?.includes('/customer/menu')) {
                        const el = document.getElementById('all-menu-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                    } else {
                        router.push('/customer/menu')
                    }
                }}
                className="flex flex-col items-center justify-center py-1 px-3 text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
            >
                <Utensils className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Menu</span>
            </button>

            {/* Orders Tab */}
            <button 
                onClick={() => router.push('/customer/orders')}
                className={cn(
                    "flex flex-col items-center justify-center py-1 px-3 transition-colors cursor-pointer",
                    isOrders ? "text-[#FF6B00] font-bold" : "text-[#6B7280] hover:text-[#111827]"
                )}
            >
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Orders</span>
            </button>

            {/* Active Bill Tab (if bill exists) */}
            {activeBillId && (
                <button 
                    onClick={() => router.push(`/customer/track/${activeBillId}`)}
                    className={cn(
                        "flex flex-col items-center justify-center py-1 px-3 transition-colors cursor-pointer",
                        pathname?.includes('/customer/track') ? "text-[#FF6B00] font-bold" : "text-[#6B7280] hover:text-[#111827]"
                    )}
                >
                    <ReceiptText className="w-5 h-5" />
                    <span className="text-[10px] font-semibold mt-1">Bill</span>
                </button>
            )}
        </nav>
    )
}
