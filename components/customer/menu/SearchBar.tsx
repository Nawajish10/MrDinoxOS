'use client'

import React, { useState } from 'react'
import { Search, SlidersHorizontal, X, Flame, Star, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dietaryFilter: 'all' | 'veg' | 'non-veg'
    onDietaryFilterChange: (filter: 'all' | 'veg' | 'non-veg') => void
    onlySpicy: boolean
    onToggleSpicy: () => void
    onlyBestseller: boolean
    onToggleBestseller: () => void
}

export function SearchBar({
    searchQuery,
    onSearchChange,
    dietaryFilter,
    onDietaryFilterChange,
    onlySpicy,
    onToggleSpicy,
    onlyBestseller,
    onToggleBestseller,
}: SearchBarProps) {
    const [showFilters, setShowFilters] = useState(false)

    return (
        <section className="my-4 sm:my-5 space-y-3">
            {/* Search Input Bar + Filter Button */}
            <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        id="search-dishes-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search dishes, cuisines, categories..."
                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] hover:border-gray-300 focus:border-[#FF5A1F] focus:bg-white focus:ring-2 focus:ring-[#FF5A1F]/15 rounded-xl pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm text-[#111827] placeholder:text-[#6B7280] outline-hidden transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filters toggle pill */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer shadow-2xs",
                        showFilters || dietaryFilter !== 'all' || onlySpicy || onlyBestseller
                            ? "bg-orange-50 text-[#FF5A1F] border-[#FF5A1F]/30"
                            : "bg-white text-[#111827] border-[#E5E7EB] hover:border-gray-300"
                    )}
                >
                    <SlidersHorizontal className="w-4 h-4 text-[#111827]" />
                    <span className="font-medium text-xs sm:text-sm">Filters</span>
                </button>
            </div>

            {/* Quick Filter Chips (Dropdown/Expandable) */}
            {(showFilters || dietaryFilter !== 'all' || onlySpicy || onlyBestseller) && (
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                        onClick={() => onDietaryFilterChange('all')}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0",
                            dietaryFilter === 'all'
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-gray-300"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => onDietaryFilterChange(dietaryFilter === 'veg' ? 'all' : 'veg')}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0",
                            dietaryFilter === 'veg'
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50/50"
                        )}
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Pure Veg
                    </button>
                    <button
                        onClick={() => onDietaryFilterChange(dietaryFilter === 'non-veg' ? 'all' : 'non-veg')}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0",
                            dietaryFilter === 'non-veg'
                                ? "bg-red-600 text-white border-red-600 shadow-xs"
                                : "bg-white text-red-700 border-red-200 hover:bg-red-50/50"
                        )}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Non-Veg
                    </button>
                    <button
                        onClick={onToggleBestseller}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0",
                            onlyBestseller
                                ? "bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-xs"
                                : "bg-white text-gray-700 border-[#E5E7EB] hover:bg-gray-50"
                        )}
                    >
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        Bestsellers
                    </button>
                    <button
                        onClick={onToggleSpicy}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0",
                            onlySpicy
                                ? "bg-red-500 text-white border-red-500 shadow-xs"
                                : "bg-white text-gray-700 border-[#E5E7EB] hover:bg-gray-50"
                        )}
                    >
                        <Flame className="w-3 h-3 fill-red-500 text-red-500" />
                        Spicy Only
                    </button>
                </div>
            )}
        </section>
    )
}
