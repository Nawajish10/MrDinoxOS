'use client'

import React from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
import { MenuCategory } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryScrollerProps {
    categories: MenuCategory[]
    activeCategory: string
    onSelectCategory: (categoryId: string) => void
}

const CATEGORY_EMOJIS: Record<string, string> = {
    all: '✨',
    starters: '🥟',
    'main course': '🍛',
    burgers: '🍔',
    pizza: '🍕',
    biryani: '🍲',
    beverages: '🥤',
    desserts: '🍰',
    sides: '🍟',
    salads: '🥗',
}

const CATEGORY_IMAGES: Record<string, string> = {
    all: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&q=80',
    starters: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=160&q=80',
    'main course': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=160&q=80',
    burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&q=80',
    pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&q=80',
    biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=160&q=80',
    beverages: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=160&q=80',
    desserts: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=160&q=80',
}

export function CategoryScroller({
    categories,
    activeCategory,
    onSelectCategory,
}: CategoryScrollerProps) {
    // Filter out categories named "All" if we provide an All pill or include them nicely
    const displayCategories = categories || []

    const getEmoji = (name: string) => {
        const key = name.toLowerCase().trim()
        return CATEGORY_EMOJIS[key] || '🍽️'
    }

    const getImage = (name: string, fallbackUrl?: string | null) => {
        if (fallbackUrl) return fallbackUrl
        const key = name.toLowerCase().trim()
        return CATEGORY_IMAGES[key] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&q=80'
    }

    return (
        <section className="my-5 sm:my-7">
            {/* Header: Title + View all */}
            <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight">
                    Popular Categories
                </h3>
                <button
                    onClick={() => onSelectCategory('all')}
                    className="text-xs sm:text-sm font-semibold text-[#6B7280] hover:text-[#FF6B00] transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Horizontal Scroller */}
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
                {/* "All" Item */}
                <button
                    onClick={() => onSelectCategory('all')}
                    className={cn(
                        "group flex flex-col items-center justify-center p-2 rounded-2xl min-w-[84px] sm:min-w-[96px] transition-all duration-200 border cursor-pointer snap-start shrink-0",
                        activeCategory === 'all'
                            ? "bg-orange-50/70 border-[#FF6B00] ring-2 ring-[#FF6B00]/20 shadow-sm shadow-orange-500/10"
                            : "bg-white border-[#E5E7EB] hover:border-orange-200 hover:shadow-xs"
                    )}
                >
                    <div className={cn(
                        "w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl transition-transform group-hover:scale-105 shadow-2xs",
                        activeCategory === 'all' ? "bg-white border border-orange-200" : "bg-gray-50 border border-gray-100"
                    )}>
                        <img 
                            src={CATEGORY_IMAGES['all']} 
                            alt="All Items" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span className={cn(
                        "text-xs font-semibold mt-1.5 transition-colors line-clamp-1",
                        activeCategory === 'all' ? "text-[#FF6B00] font-bold" : "text-[#111827] group-hover:text-[#FF6B00]"
                    )}>
                        All
                    </span>
                </button>

                {/* Database Categories */}
                {displayCategories.map((cat) => {
                    const isActive = activeCategory === cat.id
                    const imgUrl = getImage(cat.name, cat.image_url)

                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={cn(
                                "group flex flex-col items-center justify-center p-2 rounded-2xl min-w-[84px] sm:min-w-[96px] transition-all duration-200 border cursor-pointer snap-start shrink-0",
                                isActive
                                    ? "bg-orange-50/70 border-[#FF6B00] ring-2 ring-[#FF6B00]/20 shadow-sm shadow-orange-500/10"
                                    : "bg-white border-[#E5E7EB] hover:border-orange-200 hover:shadow-xs"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs",
                                isActive ? "bg-white border border-orange-200" : "bg-gray-50 border border-gray-100"
                            )}>
                                <img 
                                    src={imgUrl} 
                                    alt={cat.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className={cn(
                                "text-xs font-semibold mt-1.5 transition-colors line-clamp-1",
                                isActive ? "text-[#FF6B00] font-bold" : "text-[#111827] group-hover:text-[#FF6B00]"
                            )}>
                                {cat.name}
                            </span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
