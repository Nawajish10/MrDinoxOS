'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, QrCode } from 'lucide-react'
import { useMenu } from '@/hooks/useMenu'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useRunningSession } from '@/hooks/customer/useRunningSession'
import { CategoryTabs } from '@/components/menu/CategoryTabs'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { FeaturedCarousel } from '@/components/menu/FeaturedCarousel'
import { MenuItemModal } from '@/components/menu/MenuItemModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/types'
import { supabase } from '@/lib/supabase'

function MenuContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tableParam = searchParams.get('table')
    const restaurantParam = searchParams.get('restaurant')

    const { restaurant, loading: loadingRestaurant } = useRestaurant(restaurantParam)
    const { categories, items, loading: loadingMenu } = useMenu(restaurant?.id || null)
    const { setTableInfo, customerPhone, clearCart } = useCartStore()
    const { hasActiveSession, session } = useRunningSession(tableParam)

    const [restaurantError, setRestaurantError] = useState<string | null>(null)
    const [tableError, setTableError] = useState<string | null>(null)

    // Validate restaurant exists (not fallback)
    useEffect(() => {
        if (restaurantParam && restaurant) {
            const isFallback = restaurant.phone === '0000000000'
            if (isFallback) {
                setRestaurantError('Restaurant not found. Please check the QR code and try again.')
            } else {
                setRestaurantError(null)
            }
        }
    }, [restaurantParam, restaurant])

    // Validate table exists
    useEffect(() => {
        if (tableParam && restaurant?.id) {
            const validateTable = async () => {
                try {
                    const { data, error } = await supabase
                        .from('restaurant_tables')
                        .select('id')
                        .eq('id', tableParam)
                        .eq('restaurant_id', restaurant.id)
                        .single()

                    if (error) throw error
                    if (!data) {
                        setTableError('Table not found. Please check the QR code and try again.')
                    } else {
                        setTableError(null)
                    }
                } catch (err) {
                    console.warn('Error validating table:', err)
                    setTableError('Unable to validate table. Please try again.')
                }
            }
            validateTable()
        }
    }, [tableParam, restaurant?.id])

    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Check available dietary types
    const hasVeg = useMemo(() => items?.some(i => i.is_veg), [items])
    const hasNonVeg = useMemo(() => items?.some(i => !i.is_veg), [items])
    const showDietaryToggle = hasVeg && hasNonVeg

    useEffect(() => {
        // Check for "Paid" session to reset
        const checkSessionStatus = async () => {
            if (!customerPhone) return

            const { data } = await supabase
                .from('orders')
                .select('status, payment_status, customers!inner(phone)')
                .eq('customers.phone', customerPhone)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            // ONLY reset if payment is completed (paid status)
            // Don't reset just because order is served/completed - customer might order again
            if (data && data.payment_status === 'paid') {
                // Previous session is paid. Start fresh.
                console.log("Previous session paid. Resetting cart.")
                clearCart()
                sessionStorage.removeItem('restaurantId')
                sessionStorage.removeItem('tableId')
                return true
            }
            return false
        }

        checkSessionStatus()

        // Realtime listener for session reset
        // if (!customerPhone) return - We want to listen even if phone changes? No, phone is key.

        const channel = supabase.channel('menu-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events to catch status changes
                    schema: 'public',
                    table: 'orders'
                },
                async () => {
                    // Re-checking session status is safe and robust.
                    await checkSessionStatus()
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [customerPhone, clearCart])

    // Order Type Selection Removed (Running Bill implies dine_in always)

    useEffect(() => {
        // If tableParam is provided, set tableInfo
        if (tableParam) {
            setTableInfo(parseInt(tableParam), 'qr-scan')
            // Store in session for recovery
            sessionStorage.setItem('restaurantId', restaurantParam || '')
            sessionStorage.setItem('tableId', tableParam || '')
        }
    }, [tableParam, restaurantParam, setTableInfo])

    // Set initial active category
    // Effect removed to allow 'All Items' selection



    const filteredItems = useMemo(() => {
        if (!items) return []
        let result = items

        if (activeCategory !== 'all') {
            result = result.filter(item => item.category_id === activeCategory)
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            )
        }

        if (dietaryFilter === 'veg') {
            result = result.filter(item => item.is_veg)
        } else if (dietaryFilter === 'non-veg') {
            result = result.filter(item => !item.is_veg)
        }

        return result
    }, [items, activeCategory, searchQuery, dietaryFilter])

    const handleItemClick = (item: MenuItem) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    // Show validation errors if restaurant or table are invalid
    if (restaurantError || tableError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background px-4">
                <div className="text-center max-w-md">
                    <QrCode className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid QR Code</h2>
                    <p className="text-muted-foreground mb-4">
                        {restaurantError || tableError}
                    </p>
                    <Button onClick={() => router.push('/customer/menu')} variant="outline">
                        View Menu Without Table
                    </Button>
                </div>
            </div>
        )
    }

    if (loadingRestaurant || loadingMenu) {
        return (
            <div className="app-container flex min-h-[70svh] flex-col justify-center gap-5 py-8">
                <div className="space-y-4">
                    <div className="h-10 w-44 rounded-2xl premium-skeleton" />
                    <div className="h-12 rounded-3xl premium-skeleton" />
                </div>
                {[1, 2, 3].map((item) => (
                    <div key={item} className="touch-card flex gap-3 rounded-[1.35rem] p-3">
                        <div className="h-28 w-28 shrink-0 rounded-2xl premium-skeleton" />
                        <div className="flex flex-1 flex-col justify-between py-2">
                            <div className="space-y-2">
                                <div className="h-4 w-2/3 rounded-full premium-skeleton" />
                                <div className="h-3 w-full rounded-full premium-skeleton" />
                                <div className="h-3 w-4/5 rounded-full premium-skeleton" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-5 w-16 rounded-full premium-skeleton" />
                                <div className="h-10 w-20 rounded-2xl premium-skeleton" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-svh pb-36">
            {/* Active Session Banner */}
            {hasActiveSession && session && (
                <div className="sticky top-[64px] z-40 border-b border-orange-100 bg-orange-50/95 px-4 py-3 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-800">Running Bill Active</span>
                        <span className="truncate text-sm font-semibold text-orange-950">Table {tableParam} • add items any time</span>
                    </div>
                    <Button size="sm" variant="outline" className="tap-target shrink-0 rounded-2xl border-orange-200 bg-white px-4 font-black text-orange-700 hover:bg-orange-100" onClick={() => router.push(`/customer/track/${session.order_id}`)}>
                        View Bill
                    </Button>
                    </div>
                </div>
            )}

            {/* Categories - Sticky Top */}
            <div className={`sticky ${hasActiveSession ? 'top-[125px]' : 'top-[64px]'} z-30 border-b border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-xl transition-all duration-300`}>
                <CategoryTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </div>

            {/* Scrollable Content */}
            <div className="app-container space-y-4 pt-4">

                {/* Featured Carousel (Only show if no search query & active category is 'all' or first one if 'all' isn't used) */}
                {/* Actually, let's show it always at top unless searching */}
                {!searchQuery && (
                    <FeaturedCarousel items={items} onAdd={handleItemClick} />
                )}

                {/* Search Bar - Floating Style */}
                {/* Search Bar - Standard Scrollable */}
                <div className="space-y-3">
                    <div className="touch-card group relative mx-auto max-w-xl overflow-hidden rounded-3xl transition-all duration-300 focus-within:ring-4 focus-within:ring-orange-500/10">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-orange-500" />
                        <Input
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 border-0 bg-transparent pl-11 text-sm font-bold text-slate-900 shadow-none placeholder:text-gray-400 placeholder:font-medium focus-visible:ring-0"
                        />
                    </div>

                    {showDietaryToggle && (
                        <div className="flex justify-center">
                            <div className="touch-card flex gap-1 rounded-full p-1">
                                <button
                                    onClick={() => setDietaryFilter('all')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${dietaryFilter === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setDietaryFilter('veg')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${dietaryFilter === 'veg' ? 'bg-green-100 text-green-700 shadow-inner' : 'text-gray-500 hover:bg-green-50'}`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full border border-green-600 bg-green-600" />
                                    Veg
                                </button>
                                <button
                                    onClick={() => setDietaryFilter('non-veg')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${dietaryFilter === 'non-veg' ? 'bg-red-100 text-red-700 shadow-inner' : 'text-gray-500 hover:bg-red-50'}`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full border border-red-600 bg-red-600" />
                                    Non-Veg
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items Grid */}
                <div className="pb-4">
                    <div className="mb-4 mt-2 flex items-end justify-between">
                        <h2 className="text-2xl font-black tracking-tight text-foreground">
                            {categories.find(c => c.id === activeCategory)?.name || 'Menu'}
                        </h2>
                        <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-black text-muted-foreground">
                            {filteredItems.length} items
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    onAdd={() => handleItemClick(item)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                                <Search className="h-12 w-12 opacity-10" />
                                <p className="font-medium">No items found matching your taste.</p>
                                <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Item Details Modal */}
            <MenuItemModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />


        </div>
    )
}

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-neutral-50">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MenuContent />
        </Suspense>
    )
}
