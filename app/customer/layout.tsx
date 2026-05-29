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
        <div className="app-shell min-h-svh text-slate-950">
            <Header />
            <main className="min-h-svh pb-40 md:pb-10">
                {children}
            </main>
            <CartSidebar />
            <FloatingCartButton />
            <CustomerBottomNav />
            <Toaster position="top-center" richColors />
        </div>
    )
}
