'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Bell, Star, Heart, Check, Trash2, Clock, ShoppingCart } from 'lucide-react'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Header() {
    const { restaurant } = useRestaurant()
    const { items, getTotal, getItemCount, tableNumber } = useCartStore()
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore()
    const { openCart } = useUIStore()

    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    const itemCount = getItemCount()
    const cartTotal = getTotal()

    const handleNotificationClick = useCallback((id: string, link?: string) => {
        markAsRead(id)
        if (link) router.push(link)
    }, [markAsRead, router])

    if (!restaurant) return null

    const initial = restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'D'

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Restaurant Logo Monogram + Info */}
                    <div 
                        className="flex items-center gap-3 cursor-pointer select-none group"
                        onClick={() => router.push('/customer/menu')}
                    >
                        {/* Logo Monogram */}
                        <div className="w-10 h-10 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0 overflow-hidden">
                            {restaurant.logo_url ? (
                                <img 
                                    src={restaurant.logo_url} 
                                    alt={restaurant.name} 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <span>{initial}</span>
                            )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight group-hover:text-[#FF5A1F] transition-colors leading-tight">
                                    {restaurant.name || 'Demo Restaurant'}
                                </h1>
                                {tableNumber && (
                                    <span className="hidden sm:inline-flex text-[11px] font-semibold bg-orange-50 text-[#FF5A1F] border border-orange-200/60 px-2 py-0.5 rounded-full">
                                        Table {tableNumber}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5">
                                <span className="flex items-center font-bold text-[#111827] text-xs">
                                    4.8 <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline ml-0.5" />
                                </span>
                                <span>·</span>
                                <span className="flex items-center text-[#6B7280] font-medium text-xs">
                                    <span className="mr-0.5 text-red-500">❤️</span> Most Loved
                                </span>
                                <span>·</span>
                                <span className="flex items-center text-[#6B7280] font-medium text-xs">
                                    <Clock className="w-3 h-3 text-[#6B7280] inline mr-1" />
                                    {restaurant.avg_preparation_time ? `${restaurant.avg_preparation_time}-${restaurant.avg_preparation_time + 10} mins` : '30-40 mins'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Notification, Nav Tabs, Cart Button */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Notifications Popover */}
                        {mounted && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button 
                                        aria-label="Notifications"
                                        className="relative p-2 rounded-full text-[#111827] hover:bg-gray-100 transition-colors"
                                    >
                                        <Bell className="w-5 h-5 text-[#111827]" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                                        )}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 p-0 rounded-2xl border-[#E5E7EB] bg-white shadow-xl">
                                    <div className="flex items-center justify-between p-3.5 border-b border-[#E5E7EB]">
                                        <h4 className="font-bold text-sm text-[#111827]">Notifications</h4>
                                        {notifications.length > 0 && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={markAllAsRead}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={clearNotifications}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <ScrollArea className="h-[260px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                                    <Bell className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <p className="font-semibold text-xs text-[#111827]">No new notifications</p>
                                                <p className="text-[11px] text-[#6B7280]">Your order updates will appear here</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {notifications.map((notification) => (
                                                    <button
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                                                        className={cn(
                                                            "w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-all",
                                                            !notification.read && "bg-orange-50/40"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                            !notification.read ? "bg-[#FF5A1F]" : "bg-gray-300"
                                                        )} />
                                                        <div className="flex-1 space-y-0.5">
                                                            <h5 className={cn("text-xs font-semibold", !notification.read ? "text-[#111827]" : "text-[#6B7280]")}>
                                                                {notification.title}
                                                            </h5>
                                                            <p className="text-[11px] text-[#6B7280] line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        )}

                        {/* Navigation Tabs (Home / Orders) */}
                        <div className="hidden sm:flex items-center gap-1">
                            <button
                                onClick={() => router.push('/customer/menu')}
                                className={cn(
                                    "px-3.5 py-1.5 text-sm font-bold transition-all relative",
                                    pathname === '/customer/menu' || pathname === '/customer'
                                        ? "text-[#FF5A1F]"
                                        : "text-[#6B7280] hover:text-[#111827]"
                                )}
                            >
                                Home
                                {(pathname === '/customer/menu' || pathname === '/customer') && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FF5A1F] rounded-full" />
                                )}
                            </button>
                            <button
                                onClick={() => router.push('/customer/orders')}
                                className={cn(
                                    "px-3.5 py-1.5 text-sm font-semibold transition-all relative",
                                    pathname?.includes('/customer/orders')
                                        ? "text-[#FF5A1F] font-bold"
                                        : "text-[#6B7280] hover:text-[#111827]"
                                )}
                            >
                                Orders
                                {pathname?.includes('/customer/orders') && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FF5A1F] rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* Cart Button (Vibrant Orange Pill) */}
                        <button
                            onClick={openCart}
                            className="flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#e64f19] text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs shadow-[#FF5A1F]/25 transition-all active:scale-95 cursor-pointer"
                        >
                            <ShoppingCart className="w-4 h-4 text-white" />
                            <span>Cart{itemCount > 0 ? ` (${itemCount})` : ''}</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
