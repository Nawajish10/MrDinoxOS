'use client'

import React, { useState } from 'react'
import { MenuItem } from '@/types'
import { Plus, Minus, Flame } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'
import Image from 'next/image'

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
    const [imageLoaded, setImageLoaded] = useState(false)

    // Match cart item by id
    const cartItem = cartItems.find((ci) => ci.id === item.id)
    const quantity = cartItem ? cartItem.quantity : 0

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!item.is_available) return
        addItem(item, 1, '')
    }

    const handleIncrement = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!item.is_available) return
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

    const displayPrice = item.discounted_price ? item.discounted_price : item.price
    const originalPrice = item.discounted_price ? item.price : null

    return (
        <article
            onClick={() => onItemClick && onItemClick(item)}
            className={cn(
                "group bg-white rounded-2xl border border-[#E5E7EB] hover:border-gray-300 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer",
                !item.is_available && "opacity-60 cursor-not-allowed"
            )}
        >
            {/* Top Image Container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                )}
                <Image
                    src={item.image_url || getDefaultImage(item.id)}
                    alt={item.name}
                    width={400}
                    height={300}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={cn(
                        "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out",
                        imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                />

                {/* Top Badges (Bestseller on top-left, Veg/Non-veg on top-right) */}
                <div className="absolute top-2.5 left-2.5 z-10">
                    {item.is_bestseller ? (
                        <span className="bg-[#111827]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <Flame className="w-2.5 h-2.5 fill-[#FF5A1F] text-[#FF5A1F]" />
                            <span>Bestseller</span>
                        </span>
                    ) : item.is_new ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            New
                        </span>
                    ) : item.is_spicy ? (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-white" />
                            <span>Spicy</span>
                        </span>
                    ) : null}
                </div>

                {/* Veg / Non-Veg Indicator Icon (Top Right) */}
                <div className="absolute top-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-sm shadow-2xs border border-gray-100">
                    <div className={cn(
                        "w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-xs",
                        item.is_veg ? "border-emerald-600" : "border-red-600"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            item.is_veg ? "bg-emerald-600" : "bg-red-600"
                        )} />
                    </div>
                </div>
            </div>

            {/* Bottom Content Container */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                <div>
                    {/* Dish Title */}
                    <h3 className="font-bold text-sm sm:text-base text-[#111827] line-clamp-1 group-hover:text-[#FF5A1F] transition-colors">
                        {item.name}
                    </h3>

                    {/* Short Description */}
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-1 leading-relaxed font-normal">
                        {item.description || 'Delicious freshly prepared recipe with authentic spices.'}
                    </p>
                </div>

                {/* Price & Add Button Row */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2 mt-auto">
                    {/* Price with Optional Strikethrough Discount */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-extrabold text-[#111827]">
                            ₹{displayPrice}
                        </span>
                        {originalPrice && (
                            <span className="text-xs text-[#6B7280] line-through font-medium">
                                ₹{originalPrice}
                            </span>
                        )}
                    </div>

                    {/* Add / Stepper Button */}
                    {!item.is_available ? (
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            Sold Out
                        </span>
                    ) : quantity === 0 ? (
                        <button
                            onClick={handleAdd}
                            className="h-8 px-3.5 sm:px-4 bg-white hover:bg-orange-50 active:scale-95 text-[#FF5A1F] font-bold text-xs sm:text-sm rounded-xl border border-[#FF5A1F]/60 hover:border-[#FF5A1F] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                        </button>
                    ) : (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 px-2 bg-[#FF5A1F] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs shadow-[#FF5A1F]/30"
                        >
                            <button
                                onClick={handleDecrement}
                                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/15 active:scale-90 transition-all cursor-pointer"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <span className="min-w-[14px] text-center">{quantity}</span>
                            <button
                                onClick={handleIncrement}
                                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/15 active:scale-90 transition-all cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    )
}
