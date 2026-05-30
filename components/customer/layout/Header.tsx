'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Utensils, Box, MapPin, Bell, Check, Trash2, Clock, Flame } from 'lucide-react'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useNotificationStore } from '@/store/notificationStore'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { OrderType } from '@/types'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import useSound from 'use-sound'

export function Header() {
    const { restaurant } = useRestaurant()
    const { items, tableNumber, orderType, setOrderType } = useCartStore()
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore()

    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    const [playNotification] = useSound('/sounds/notification.mp3')

    // Mount detection only - no scroll shrinking
    useEffect(() => {
        setMounted(true)
    }, [])

    // Sound notification trigger
    useEffect(() => {
        if (unreadCount > 0 && mounted) {
            playNotification()
        }
    }, [unreadCount, mounted, playNotification])

    const handleNotificationClick = useCallback((id: string, link?: string) => {
        markAsRead(id)
        if (link) {
            router.push(link)
        }
    }, [markAsRead, router])

    if (!restaurant) return null

    const orderTypeConfig = {
        dine_in: { label: 'Dine In', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
        take_away: { label: 'Takeaway', icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
        home_delivery: { label: 'Delivery', icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    }

    const currentType = orderType ? orderTypeConfig[orderType as keyof typeof orderTypeConfig] : { label: 'Order Type', icon: ShoppingBag, color: 'text-gray-600', bg: 'bg-gray-50' }
    const TypeIcon = currentType.icon

    return (
        <header
            className="sticky top-0 z-50 bg-obsidian-base/80 backdrop-blur-lg border-b border-border-gray shadow-sm dark:shadow-none flex flex-col w-full px-4 py-1 justify-between transition-all duration-300"
            id="main-header"
        >
            <div className="flex items-center justify-between w-full max-w-screen-xl mx-auto py-2">
                <div 
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => router.push('/customer/menu')}
                >
                    <div className="w-10 h-10 rounded-DEFAULT bg-surface text-on-primary flex items-center justify-center font-bold text-xl overflow-hidden border border-border-gray shrink-0">
                        {restaurant.logo_url ? (
                            <img alt={`${restaurant.name} Logo`} className="w-full h-full object-cover" src={restaurant.logo_url} />
                        ) : (
                            <span className="text-primary-container">{restaurant.name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <h1 className="font-headline-md text-xl md:text-2xl font-bold text-on-surface truncate">
                            {restaurant.name}
                        </h1>
                        <p className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-primary-container text-xs">⭐</span> 4.8 
                            <span className="opacity-50">•</span> 
                            <span className="text-primary-container text-xs">🔥</span> Most Loved 
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    {mounted && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="p-2 rounded-DEFAULT text-on-surface-variant hover:bg-surface-container transition-colors relative btn-scale-down">
                                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-electric-red rounded-full border border-obsidian-base"></span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden border-border-gray bg-surface-container-low shadow-xl">
                                <div className="flex items-center justify-between p-4 border-b border-border-gray bg-surface">
                                    <h4 className="font-bold text-sm text-on-surface">Notifications</h4>
                                    {notifications.length > 0 && (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-success hover:bg-surface-container hover:text-emerald-success" onClick={markAllAsRead}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-electric-red hover:bg-surface-container hover:text-electric-red" onClick={clearNotifications}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <ScrollArea className="h-[300px] bg-surface-container-low">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
                                            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center">
                                                <Bell className="w-6 h-6 text-on-surface-variant" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-on-surface text-sm">Quiet for now</p>
                                                <p className="text-xs text-on-surface-variant">Notifications will appear here.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifications.map((notification) => (
                                                <button
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification.id, notification.link)}
                                                    className={cn(
                                                        "flex items-start gap-3 p-4 text-left hover:bg-surface transition-all border-b border-border-gray last:border-0",
                                                        !notification.read && "bg-surface-bright"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                        !notification.read ? "bg-electric-red shadow-[0_0_8px_rgba(255,59,59,0.6)]" : "bg-on-surface-variant"
                                                    )} />
                                                    <div className="flex-1 space-y-1">
                                                        <h5 className={cn("text-xs font-bold", !notification.read ? "text-on-surface" : "text-on-surface-variant")}>
                                                            {notification.title}
                                                        </h5>
                                                        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
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

                    {/* Desktop Nav Cluster */}
                    <nav className="hidden md:flex items-center gap-6 ml-6 border-l border-border-gray pl-6">
                        <button onClick={() => router.push('/customer/menu')} className="font-label-md text-sm text-primary-container font-bold hover:scale-105 transition-transform">Home</button>
                        <button onClick={() => router.push('/customer/orders')} className="font-label-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Orders</button>
                    </nav>
                </div>
            </div>
        </header>
    )
}
