
"use client"

import { useRealtime } from '@/hooks/useRealtime'
import KitchenHeader from '@/components/kitchen/KitchenHeader'
import { Toaster } from '@/components/ui/sonner'
import { useEffect } from 'react'
import { useKitchenStore } from '@/store/kitchenStore'
import { getActiveOrders } from '@/services/orderService'

export default function KitchenClientLayout({ children }: { children: React.ReactNode }) {
    useRealtime()
    const { setOrders } = useKitchenStore()

    useEffect(() => {
        // Initial fetch
        const fetchOrders = async () => {
            const orders = await getActiveOrders()
            setOrders(orders)
        }
        fetchOrders()
    }, [setOrders])

    return (
        <div className="flex h-svh flex-col overflow-hidden bg-slate-950 text-foreground">
            <KitchenHeader />
            <main className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.16),transparent_32rem),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]">
                {children}
            </main>
            <Toaster />
        </div>
    )
}
