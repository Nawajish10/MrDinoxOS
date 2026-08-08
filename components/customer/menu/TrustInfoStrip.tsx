'use client'

import React from 'react'
import { Clock, Truck, ShieldCheck, CreditCard } from 'lucide-react'

export function TrustInfoStrip() {
    const items = [
        {
            icon: Clock,
            title: '30–40 mins',
            subtitle: 'Delivery Time',
            color: 'text-orange-500',
            bg: 'bg-orange-50',
        },
        {
            icon: Truck,
            title: 'Free Delivery',
            subtitle: 'Above ₹199',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            icon: ShieldCheck,
            title: 'Best Quality',
            subtitle: 'Hygienic Food',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            icon: CreditCard,
            title: 'Secure Payment',
            subtitle: 'Multiple Options',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
    ]

    return (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
            {items.map((item, idx) => {
                const Icon = item.icon
                return (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl border border-[#E5E7EB] p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-xs transition-shadow"
                    >
                        <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-[#111827] truncate">
                                {item.title}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                                {item.subtitle}
                            </p>
                        </div>
                    </div>
                )
            })}
        </section>
    )
}
