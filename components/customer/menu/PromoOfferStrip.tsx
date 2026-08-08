'use client'

import React, { useState } from 'react'
import { Tag, ChevronRight, Check } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'

export function PromoOfferStrip() {
    const [copied, setCopied] = useState(false)
    const { coupon } = useCartStore()

    const handleCopy = () => {
        navigator.clipboard.writeText('WELCOME10')
        setCopied(true)
        toast.success('Coupon code "WELCOME10" copied to clipboard!')
        setTimeout(() => setCopied(false), 2500)
    }

    return (
        <div 
            onClick={handleCopy}
            className="my-4 bg-gradient-to-r from-orange-50 via-white to-amber-50/60 border border-orange-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-[0_2px_10px_rgba(255,107,0,0.04)] cursor-pointer hover:border-[#FF6B00] transition-all group"
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-orange-100/80 text-[#FF6B00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Tag className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-[#111827] truncate">
                        Get 10% OFF on your first order
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold bg-white border border-orange-200 text-[#FF6B00] px-2 py-0.5 rounded-md">
                        Use code: <strong className="font-mono font-bold">WELCOME10</strong>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] shrink-0">
                {copied ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copied</span>
                    </span>
                ) : (
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                )}
            </div>
        </div>
    )
}
