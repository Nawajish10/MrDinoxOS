'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Bell, Search, Heart, Check, Trash2, ChevronRight, Star } from 'lucide-react'
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

    const scrollToSearch = () => {
        if (pathname?.includes('/customer/menu')) {
            const searchEl = document.getElementById('search-dishes-input')
            if (searchEl) {
                searchEl.focus()
                searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        } else {
            router.push('/customer/menu')
        }
    }

    if (!restaurant) return null

    const initial = restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'D'

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-2.5">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Restaurant Info */}
                    <div 
                        className="flex items-center gap-3 cursor-pointer select-none group"
                        onClick={() => router.push('/customer/menu')}
                    >
                        {/* Logo Monogram */}
                        <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black text-xl shadow-sm shadow-[#FF6B00]/20 shrink-0 overflow-hidden">
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

                        {/* Title & Ratings */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight group-hover:text-[#FF6B00] transition-colors leading-tight">
                                    {restaurant.name}
                                </h1>
                                {tableNumber && (
                                    <span className="hidden sm:inline-flex text-[11px] font-semibold bg-orange-50 text-[#FF6B00] border border-orange-200/60 px-2 py-0.5 rounded-full">
                                        Table {tableNumber}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                                <span className="flex items-center text-amber-500 font-semibold text-[11px]">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline mr-0.5" /> 4.8
                                </span>
                                <span>·</span>
                                <span>(1.2K+)</span>
                                <span>·</span>
                                <span className="flex items-center text-[#FF6B00] font-medium text-[11px]">
                                    <span className="mr-0.5">❤️</span> Most Loved
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions (Search, Notification, Cart) */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Search Icon button */}
                        <button
                            onClick={scrollToSearch}
                            aria-label="Search food"
                            className="p-2 sm:p-2.5 rounded-full text-[#111827] hover:bg-gray-100 transition-colors"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Notifications Popover */}
                        {mounted && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button 
                                        aria-label="Notifications"
                                        className="relative p-2 sm:p-2.5 rounded-full text-[#111827] hover:bg-gray-100 transition-colors"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
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
                                                            !notification.read ? "bg-[#FF6B00]" : "bg-gray-300"
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

                        {/* Cart Button with Count & Total */}
                        <button
                            onClick={openCart}
                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-sm transition-all active:scale-95"
                        >
                            <div className="relative">
                                <ShoppingBag className="w-4 h-4 text-white" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-[#FF6B00] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-gray-900 leading-none">
                                        {itemCount}
                                    </span>
                                )}
                            </div>
                            <span className="font-bold tracking-tight">
                                ₹{cartTotal > 0 ? cartTotal.toFixed(0) : '0'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Primary Navigation Pills */}
                <nav className="flex items-center gap-2 pt-2.5 pb-0.5 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => router.push('/customer/menu')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
                            pathname === '/customer/menu' || pathname === '/customer'
                                ? "bg-[#FF6B00] text-white shadow-sm shadow-[#FF6B00]/25"
                                : "text-[#6B7280] hover:text-[#111827] hover:bg-gray-100"
                        )}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => {
                            if (pathname?.includes('/customer/menu')) {
                                const el = document.getElementById('all-menu-section')
                                if (el) el.scrollIntoView({ behavior: 'smooth' })
                            } else {
                                router.push('/customer/menu')
                            }
                        }}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-all shrink-0"
                    >
                        Menu
                    </button>
                    <button
                        onClick={() => router.push('/customer/orders')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                            pathname?.includes('/customer/orders')
                                ? "bg-[#FF6B00] text-white shadow-sm shadow-[#FF6B00]/25"
                                : "text-[#6B7280] hover:text-[#111827] hover:bg-gray-100"
                        )}
                    >
                        Orders
                    </button>
                </nav>
            </div>
        </header>
    )
}
