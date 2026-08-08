'use client'

import React from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'

interface HeroBannerProps {
    onExploreMenu?: () => void
}

export function HeroBanner({ onExploreMenu }: HeroBannerProps) {
    const handleScrollToMenu = () => {
        if (onExploreMenu) {
            onExploreMenu()
            return
        }
        const menuSection = document.getElementById('all-menu-section') || document.getElementById('recommended-section')
        if (menuSection) {
            menuSection.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-white border border-orange-100/80 shadow-[0_4px_20px_rgba(255,107,0,0.06)] p-5 sm:p-8 md:p-10 my-4 sm:my-6">
            {/* Background subtle geometric accents */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-200/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-amber-200/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Text & CTA */}
                <div className="md:col-span-7 flex flex-col items-start space-y-3 sm:space-y-4">
                    {/* Small Greeting pill */}
                    <div className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-orange-200/80 text-orange-950 px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
                        <span>Good food, great mood!</span>
                        <span>😊</span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                        Delicious meals,<br className="hidden sm:inline" /> delivered to your table
                    </h2>

                    {/* Supporting subtext */}
                    <p className="text-xs sm:text-sm font-medium text-[#6B7280] flex items-center flex-wrap gap-1.5">
                        <span>Fresh ingredients</span>
                        <span>•</span>
                        <span>Expert chefs</span>
                        <span>•</span>
                        <span>Hygienic kitchen</span>
                    </p>

                    {/* Action Button & Carousel Dots */}
                    <div className="pt-2 flex items-center gap-5 flex-wrap">
                        <button
                            onClick={handleScrollToMenu}
                            className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e66000] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm shadow-md shadow-[#FF6B00]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <span>Explore Menu</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Carousel Dots */}
                        <div className="flex items-center gap-1.5 py-2">
                            <span className="w-5 h-1.5 bg-[#FF6B00] rounded-full" />
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Right Food Platter Hero Image */}
                <div className="md:col-span-5 flex justify-center md:justify-end">
                    <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-square rounded-full overflow-hidden shadow-2xl shadow-orange-500/15 border-4 border-white">
                        <img 
                            src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=85" 
                            alt="Delicious Biryani and Tikka Platter" 
                            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Floating Gourmet Badge */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-orange-100">
                            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                            <span className="text-[10px] font-bold text-[#111827]">Chef's Special</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
