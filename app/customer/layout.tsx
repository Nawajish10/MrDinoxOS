'use client'

import { Header } from '@/components/customer/layout/Header'
import { CustomerBottomNav } from '@/components/customer/layout/CustomerBottomNav'
import { CartSidebar } from '@/components/customer/cart/CartSidebar'
import { FloatingCartButton } from '@/components/customer/cart/FloatingCartButton'
import { Toaster } from '@/components/ui/sonner'

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="dark bg-obsidian-base text-on-background font-body-md antialiased min-h-svh relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-electric-red/10 via-obsidian-base/5 to-transparent" />
            <div className="relative z-10">
                <Header />
            <main className="min-h-svh pb-40 md:pb-10">
                {children}
            </main>
            <CartSidebar />
            <FloatingCartButton />
                <CustomerBottomNav />
                <Toaster position="top-center" richColors />
            </div>
        </div>
    )
}
