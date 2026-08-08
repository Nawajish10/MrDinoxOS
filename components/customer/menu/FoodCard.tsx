'use client'

import React, { useState } from 'react'
import { MenuItem } from '@/types'
import { Heart, Plus, Minus, Star, Flame } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'

interface FoodCardProps {
    item: MenuItem
    onItemClick?: (item: MenuItem) => void
}

const DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
]

const getDefaultImage = (id: string) => {
    if (!id) return DEFAULT_IMAGES[0]
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return DEFAULT_IMAGES[sum % DEFAULT_IMAGES.length]
}

export function FoodCard({ item, onItemClick }: FoodCardProps) {
    const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore()
    const [isFavorited, setIsFavorited] = useState(false)

    // Match cart item by id
    const cartItem = cartItems.find((ci) => ci.id === item.id)
    const quantity = cartItem ? cartItem.quantity : 0

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation()
        addItem(item, 1, '')
    }

    const handleIncrement = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (cartItem) {
            updateQuantity(cartItem.cartId, quantity + 1)
        } else {
            addItem(item, 1, '')
        }
    }

    const handleDecrement = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (cartItem) {
            if (quantity <= 1) {
                removeItem(cartItem.cartId)
            } else {
                updateQuantity(cartItem.cartId, quantity - 1)
            }
        }
    }

    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsFavorited(!isFavorited)
    }

    const displayPrice = item.discounted_price ? item.discounted_price : item.price
    const originalPrice = item.discounted_price ? item.price : null
    const ratingScore = ((item.name.length % 5) * 0.1 + 4.4).toFixed(1)

    return (
        <article
            onClick={() => onItemClick && onItemClick(item)}
            className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-200 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(255,107,0,0.08)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
            {/* Top Image Container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
                <img
                    src={item.image_url || getDefaultImage(item.id)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                    {item.is_bestseller && (
                        <span className="bg-[#FF6B00] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            Bestseller
                        </span>
                    )}
                    {item.is_spicy && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-white" />
                            <span>Spicy</span>
                        </span>
                    )}
                    {item.is_new && !item.is_bestseller && (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            New
                        </span>
                    )}
                </div>

                {/* Wishlist Heart */}
                <button
                    onClick={toggleFavorite}
                    aria-label="Favorite item"
                    className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-xs text-gray-400 hover:text-red-500 hover:bg-white transition-all active:scale-90 z-10"
                >
                    <Heart
                        className={cn(
                            "w-4 h-4 transition-colors",
                            isFavorited ? "fill-red-500 text-red-500" : "text-gray-500"
                        )}
                    />
                </button>
            </div>

            {/* Content Area */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                    {/* Indicator row: Veg/Non-Veg & Rating */}
                    <div className="flex items-center justify-between mb-1.5">
                        {/* Veg / Non-Veg Indicator Icon */}
                        {item.is_veg ? (
                            <div className="w-4 h-4 rounded-[3px] border-2 border-emerald-600 flex items-center justify-center p-[2px]">
                                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            </div>
                        ) : (
                            <div className="w-4 h-4 rounded-[3px] border-2 border-red-600 flex items-center justify-center p-[2px]">
                                <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-red-600" />
                            </div>
                        )}

                        {/* Rating Badge */}
                        <div className="flex items-center gap-0.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-1.5 py-0.5 rounded text-[11px] font-bold">
                            <span>{ratingScore}</span>
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600 inline" />
                        </div>
                    </div>

                    {/* Food Name */}
                    <h4 className="font-bold text-sm sm:text-[15px] text-[#111827] group-hover:text-[#FF6B00] transition-colors line-clamp-1 leading-snug">
                        {item.name}
                    </h4>

                    {/* Description */}
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-1 leading-relaxed min-h-[32px]">
                        {item.description || 'Prepared with fresh ingredients and chef secret spices.'}
                    </p>
                </div>

                {/* Price & Add to Cart interaction */}
                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-100">
                    <div className="flex flex-col">
                        {originalPrice && (
                            <span className="text-[11px] text-[#6B7280] line-through">
                                ₹{originalPrice}
                            </span>
                        )}
                        <span className="text-base sm:text-lg font-black text-[#111827] tracking-tight">
                            ₹{displayPrice}
                        </span>
                    </div>

                    {/* Action Button: Add or Quantity Stepper */}
                    {quantity === 0 ? (
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center justify-center gap-1.5 bg-orange-50/90 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white border border-[#FF6B00]/40 hover:border-[#FF6B00] px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                            <span>Add</span>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div className="inline-flex items-center bg-[#FF6B00] text-white rounded-xl shadow-sm overflow-hidden">
                            <button
                                onClick={handleDecrement}
                                className="px-2.5 py-1.5 hover:bg-[#e05e00] transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
                                aria-label="Decrease quantity"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-xs sm:text-sm px-2 select-none min-w-[20px] text-center">
                                {quantity}
                            </span>
                            <button
                                onClick={handleIncrement}
                                className="px-2.5 py-1.5 hover:bg-[#e05e00] transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
                                aria-label="Increase quantity"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    )
}
