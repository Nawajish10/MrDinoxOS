'use client'

import React from 'react'
import { ChevronRight, Sparkles, ChevronDown } from 'lucide-react'
import { MenuCategory } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryScrollerProps {
    categories: MenuCategory[]
    activeCategory: string
    onSelectCategory: (categoryId: string) => void
}

const CATEGORY_ICONS: Record<string, string> = {
    all: '🔥',
    starters: '🥣',
    'main course': '🍲',
    biryani: '🍚',
    pizza: '🍕',
    burgers: '🍔',
    chinese: '🍜',
    desserts: '🍰',
    beverages: '🍹',
    sides: '🍟',
    salads: '🥗',
}

export function CategoryScroller({
    categories,
    activeCategory,
    onSelectCategory,
}: CategoryScrollerProps) {
    const displayCategories = categories || []

    const getIcon = (name: string) => {
        const key = name.toLowerCase().trim()
        return CATEGORY_ICONS[key] || '🍽️'
    }

    return (
        <section className="my-3 sm:my-4">
            {/* Horizontal Categories Row */}
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto hide-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* 1. "Recommended" / "All" Card */}
                <button
                    onClick={() => onSelectCategory('all')}
                    className={cn(
                        "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl min-w-[80px] sm:min-w-[92px] transition-all duration-200 border cursor-pointer shrink-0 shadow-2xs",
                        activeCategory === 'all'
                            ? "bg-orange-50/70 border-[#FF5A1F] text-[#FF5A1F]"
                            : "bg-white border-[#E5E7EB] hover:border-gray-300 text-[#111827]"
                    )}
                >
                    <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow-2xs">🔥</span>
                    <span className={cn(
                        "text-xs font-semibold tracking-tight line-clamp-1",
                        activeCategory === 'all' ? "text-[#FF5A1F] font-bold" : "text-[#111827]"
                    )}>
                        Recommended
                    </span>
                </button>

                {/* Dynamic Category Cards */}
                {displayCategories.map((category) => {
                    const isActive = activeCategory === category.id
                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelectCategory(category.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl min-w-[80px] sm:min-w-[92px] transition-all duration-200 border cursor-pointer shrink-0 shadow-2xs",
                                isActive
                                    ? "bg-orange-50/70 border-[#FF5A1F] text-[#FF5A1F]"
                                    : "bg-white border-[#E5E7EB] hover:border-gray-300 text-[#111827]"
                            )}
                        >
                            <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow-2xs">
                                {getIcon(category.name)}
                            </span>
                            <span className={cn(
                                "text-xs font-semibold tracking-tight line-clamp-1",
                                isActive ? "text-[#FF5A1F] font-bold" : "text-[#111827]"
                            )}>
                                {category.name}
                            </span>
                        </button>
                    )
                })}

                {/* "More" Filter Action */}
                <button
                    onClick={() => {
                        const el = document.getElementById('all-menu-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl min-w-[76px] sm:min-w-[84px] bg-white border border-[#E5E7EB] hover:border-gray-300 text-[#111827] transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                    <span className="text-2xl sm:text-3xl mb-1 text-gray-400">⌄</span>
                    <span className="text-xs font-semibold text-[#6B7280]">
                        More
                    </span>
                </button>
            </div>
        </section>
    )
}
