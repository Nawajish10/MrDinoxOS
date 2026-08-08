'use client'

import React from 'react'
import { Truck, Award, ShieldCheck, Headphones } from 'lucide-react'

export function TrustInfoStrip() {
    const items = [
        {
            icon: Truck,
            title: 'Fast Delivery',
            subtitle: '30-40 mins delivery',
            color: 'text-red-500',
            bg: 'bg-red-50',
            emoji: '🛵',
        },
        {
            icon: Award,
            title: 'Top Rated',
            subtitle: '4.8/5 by customers',
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            emoji: '🎖️',
        },
        {
            icon: ShieldCheck,
            title: 'Safe & Hygienic',
            subtitle: 'Packed with care',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            emoji: '🛡️',
        },
        {
            icon: Headphones,
            title: '24/7 Support',
            subtitle: "We're here to help",
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            emoji: '🎧',
        },
    ]

    return (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6 sm:my-8">
            {items.map((item, idx) => {
                return (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl border border-[#E5E7EB] p-3 sm:p-4 flex items-center gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                    >
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center text-xl shrink-0 shadow-2xs`}>
                            <span>{item.emoji}</span>
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
