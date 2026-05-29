"use client"

import { Order } from "@/types"
import OrderCard from "./OrderCard"
import { useKitchenStore } from "@/store/kitchenStore"
import { Package, ChefHat, CheckCircle2 } from "lucide-react"

interface OrderColumnProps {
    title: string
    orders: Order[]
    emptyMessage: string
    columnType: 'new' | 'preparing' | 'ready'
}

const columnConfig = {
    new: {
        icon: Package,
        gradient: 'from-blue-500 via-blue-600 to-blue-700',
        accentColor: 'border-blue-500/50',
        bgGlow: 'shadow-blue-500/20'
    },
    preparing: {
        icon: ChefHat,
        gradient: 'from-purple-500 via-purple-600 to-purple-700',
        accentColor: 'border-purple-500/50',
        bgGlow: 'shadow-purple-500/20'
    },
    ready: {
        icon: CheckCircle2,
        gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
        accentColor: 'border-emerald-500/50',
        bgGlow: 'shadow-emerald-500/20'
    }
}

export default function OrderColumn({ title, orders, emptyMessage, columnType }: OrderColumnProps) {
    const { setSelectedOrder } = useKitchenStore()
    const config = columnConfig[columnType]
    const Icon = config.icon

    return (
        <div className="flex h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/8 shadow-2xl shadow-black/20 backdrop-blur-xl flex-col">
            {/* Column Header */}
            <div className={`relative bg-gradient-to-r ${config.gradient} px-5 py-4 shadow-lg`}>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white">
                                {title}
                            </h2>
                            <p className="text-xs font-medium text-white/80">
                                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                            </p>
                        </div>
                    </div>

                    {/* Order Count Badge */}
                    {orders.length > 0 && (
                        <div className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-white/90 px-3 font-mono text-sm font-bold text-gray-900 shadow-lg">
                            {orders.length}
                        </div>
                    )}
                </div>

                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')]" />
                </div>
            </div>

            {/* Orders List */}
            <div className="momentum-scroll flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
                {orders.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-3 rounded-[1.5rem] border border-dashed border-white/15 bg-white/8 p-8 text-center">
                        <div className="rounded-full bg-muted/50 p-4">
                            <Icon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                            {emptyMessage}
                        </p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onViewDetails={() => setSelectedOrder(order)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
