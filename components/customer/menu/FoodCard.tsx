'use client'

import React, { useState } from 'react'
import { MenuItem } from '@/types'
import { Heart, Plus, Minus, Star, Flame } from 'lucide-react'
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
    const [isFavorited, setIsFavorited] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

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
                        "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out",
                        imageLoaded ? "opacity-100" : "opacity-0"
                    )}
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

                {/* Favorite Heart Button */}
                <button
                    onClick={toggleFavorite}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors shadow-xs z-10"
                    aria-label="Save dish"
                >
                    <Heart className={cn("w-3.5 h-3.5", isFavorited ? "fill-red-500 text-red-500" : "")} />
                </button>
            </div>

            {/* Bottom Content Container */}
            <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                <div>
                    {/* Veg Indicator & Rating Row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                            {/* Veg / Non-veg indicator icon */}
                            <div className={cn(
                                "w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-xs",
                                item.is_veg ? "border-emerald-600" : "border-red-600"
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    item.is_veg ? "bg-emerald-600" : "bg-red-600"
                                )} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">
                                {item.is_veg ? 'Pure Veg' : 'Non-Veg'}
                            </span>
                        </div>

                        {/* Rating Pill */}
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                            <span>{ratingScore}</span>
                        </div>
                    </div>

                    {/* Dish Title */}
                    <h3 className="font-bold text-sm text-[#111827] line-clamp-1 group-hover:text-[#FF6B00] transition-colors">
                        {item.name}
                    </h3>

                    {/* Short Description */}
                    {item.description && (
                        <p className="text-xs text-[#6B7280] line-clamp-2 mt-0.5 leading-relaxed font-normal">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Price & Quantity Add/Stepper Row */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
                    {/* Price with Optional Discount */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-[#111827]">
                            ₹{displayPrice}
                        </span>
                        {originalPrice && (
                            <span className="text-xs text-gray-400 line-through font-medium">
                                ₹{originalPrice}
                            </span>
                        )}
                    </div>

                    {/* Add / Stepper Button */}
                    {quantity === 0 ? (
                        <button
                            onClick={handleAdd}
                            className="h-8 px-4 bg-[#FF6B00] hover:bg-[#e66000] active:scale-95 text-white font-bold text-xs rounded-full shadow-[0_2px_8px_rgba(255,107,0,0.25)] transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <span>Add</span>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 px-2 bg-[#FF6B00] text-white font-extrabold text-xs rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(255,107,0,0.25)]"
                        >
                            <button
                                onClick={handleDecrement}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition-all cursor-pointer"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <span className="min-w-[14px] text-center">{quantity}</span>
                            <button
                                onClick={handleIncrement}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition-all cursor-pointer"
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
