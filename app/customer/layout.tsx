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
        <div className="bg-[#F8FAFC] text-[#111827] font-sans antialiased min-h-screen relative selection:bg-orange-100 selection:text-orange-900">
            <Header />
            <main className="min-h-screen pb-28 md:pb-12">
                {children}
            </main>
            <CartSidebar />
            <FloatingCartButton />
            <CustomerBottomNav />
            <Toaster position="top-center" richColors />
        </div>
    )
}
