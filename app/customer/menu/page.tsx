'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QrCode, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { useMenu } from '@/hooks/useMenu'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useRunningSession } from '@/hooks/customer/useRunningSession'
import { MenuItemModal } from '@/components/customer/menu/MenuItemModal'
import { HeroBanner } from '@/components/customer/menu/HeroBanner'
import { CategoryScroller } from '@/components/customer/menu/CategoryScroller'
import { FoodCard } from '@/components/customer/menu/FoodCard'
import { TrustInfoStrip } from '@/components/customer/menu/TrustInfoStrip'
import { SearchBar } from '@/components/customer/menu/SearchBar'
import { PromoOfferStrip } from '@/components/customer/menu/PromoOfferStrip'
import { MenuItem } from '@/types'
import { supabase } from '@/lib/supabase'

function MenuContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tableParam = searchParams.get('table')
    const restaurantParam = searchParams.get('restaurant')

    const { restaurant, loading: loadingRestaurant } = useRestaurant(restaurantParam)
    const { categories, items: menuItems, loading: loadingMenu } = useMenu(restaurant?.id || null)
    
    // Zustand Cart Store
    const { setTableInfo, customerPhone, clearCart } = useCartStore()
    const { hasActiveSession, session } = useRunningSession(tableParam)

    const [restaurantError, setRestaurantError] = useState<string | null>(null)
    const [tableError, setTableError] = useState<string | null>(null)

    // Validate restaurant
    useEffect(() => {
        if (restaurant) {
            setRestaurantError(null)
        }
    }, [restaurant])

    // Validate table seamlessly
    useEffect(() => {
        if (tableParam && restaurant?.id) {
            const validateTable = async () => {
                try {
                    // Try fetching from server API first
                    const res = await fetch(`/api/tables?restaurantId=${restaurant.id}`)
                    if (res.ok) {
                        const data = await res.json()
                        const tables = data.tables || []
                        const found = tables.find((t: any) => 
                            t.id === tableParam || 
                            t.table_number === Number(tableParam) || 
                            String(t.table_number) === tableParam
                        )

                        if (found) {
                            setTableError(null)
                            setTableInfo(found.table_number, found.id)
                            sessionStorage.setItem('restaurantId', restaurant.id)
                            sessionStorage.setItem('tableId', found.id)
                            return
                        }
                    }

                    // Fallback to Supabase
                    let query = supabase
                        .from('restaurant_tables')
                        .select('id, table_number')
                        .eq('restaurant_id', restaurant.id)

                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableParam)
                    if (isUUID) {
                        query = query.eq('id', tableParam)
                    } else if (!isNaN(Number(tableParam))) {
                        query = query.eq('table_number', Number(tableParam))
                    }

                    const { data: dbData } = await query.maybeSingle()

                    if (dbData) {
                        setTableError(null)
                        setTableInfo(dbData.table_number, dbData.id)
                        sessionStorage.setItem('restaurantId', restaurant.id)
                        sessionStorage.setItem('tableId', dbData.id)
                    } else {
                        const num = Number(tableParam)
                        if (!isNaN(num) && num > 0) {
                            setTableError(null)
                            setTableInfo(num, tableParam)
                            sessionStorage.setItem('restaurantId', restaurant.id)
                            sessionStorage.setItem('tableId', tableParam)
                        }
                    }
                } catch (err) {
                    console.warn('Table validation note:', err)
                    setTableError(null)
                }
            }
            validateTable()
        }
    }, [tableParam, restaurant?.id, setTableInfo])

    // Search and filter states
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [onlySpicy, setOnlySpicy] = useState(false)
    const [onlyBestseller, setOnlyBestseller] = useState(false)

    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Realtime session & order clearing when paid
    useEffect(() => {
        const checkSessionStatus = async () => {
            if (!customerPhone) return
            const { data } = await supabase
                .from('orders')
                .select('status, payment_status, customers!inner(phone)')
                .eq('customers.phone', customerPhone)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (data && data.payment_status === 'paid') {
                clearCart()
                sessionStorage.removeItem('restaurantId')
                sessionStorage.removeItem('tableId')
                return true
            }
            return false
        }
        checkSessionStatus()

        const channel = supabase.channel('menu-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                async () => { await checkSessionStatus() }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [customerPhone, clearCart])

    // Filter items
    const filteredItems = useMemo(() => {
        if (!menuItems) return []
        let result = menuItems

        if (activeCategory !== 'all') {
            result = result.filter(item => item.category_id === activeCategory)
        }

        if (searchQuery.trim()) {
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

        if (onlySpicy) {
            result = result.filter(item => item.is_spicy || (item.spicy_level && item.spicy_level > 0))
        }

        if (onlyBestseller) {
            result = result.filter(item => item.is_bestseller)
        }

        return result
    }, [menuItems, activeCategory, searchQuery, dietaryFilter, onlySpicy, onlyBestseller])

    const handleItemClick = (item: MenuItem) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    if (restaurantError && !restaurant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                    <QrCode className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-[#111827]">Restaurant Not Found</h2>
                <p className="text-xs text-[#6B7280] max-w-sm">{restaurantError}</p>
                <button 
                    onClick={() => router.push('/customer/menu')} 
                    className="px-5 py-2 bg-[#FF6B00] text-white rounded-full text-xs font-bold shadow-sm"
                >
                    View Menu
                </button>
            </div>
        )
    }

    if (loadingRestaurant || loadingMenu) {
        return (
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="h-44 w-full bg-gray-100 rounded-3xl animate-pulse" />
                <div className="flex gap-3 overflow-hidden">
                    <div className="h-16 w-20 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-16 w-20 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-16 w-20 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-16 w-20 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
            </div>
        )
    }

    // Recommended Items: prioritize bestsellers or first 4
    const recommendedItems = menuItems
        ? [...menuItems].sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0)).slice(0, 4)
        : []

    // Group items by category for the full categorized view
    const groupedByCategory = categories?.map((cat) => {
        const catItems = filteredItems.filter((i) => i.category_id === cat.id)
        return {
            category: cat,
            items: catItems,
        }
    }).filter((group) => group.items.length > 0) || []

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 sm:py-5">
            {/* Active Running Bill Session Banner */}
            {hasActiveSession && session && (
                <div className="mb-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-pulse" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-[#FF6B00]">Running Bill Active</p>
                            <p className="text-xs font-bold text-[#111827]">Table {tableParam || session.table_id || '1'} • Add dishes anytime</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/customer/track/${session.order_id}`)}
                        className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                        View Bill
                    </button>
                </div>
            )}

            {/* 1. Hero Promotional Banner */}
            <HeroBanner />

            {/* 2. Popular Categories Horizontal Scroller */}
            <CategoryScroller
                categories={categories || []}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
            />

            {/* 3. Recommended for you Section */}
            {recommendedItems.length > 0 && activeCategory === 'all' && !searchQuery && (
                <section id="recommended-section" className="my-7">
                    <div className="flex items-center justify-between mb-4 px-0.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-extrabold text-[#111827] tracking-tight flex items-center gap-1.5">
                                <span>Recommended for you</span>
                                <span className="text-[#FF6B00]">🔥</span>
                            </h3>
                        </div>
                        <button
                            onClick={() => {
                                const el = document.getElementById('all-menu-section')
                                if (el) el.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className="text-xs sm:text-sm font-semibold text-[#6B7280] hover:text-[#FF6B00] transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>See all</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* 4-column responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {recommendedItems.map((item) => (
                            <FoodCard
                                key={item.id}
                                item={item}
                                onItemClick={handleItemClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 4. Trust / Information Strip */}
            <TrustInfoStrip />

            {/* 5. Search Bar & Filter Chips */}
            <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                dietaryFilter={dietaryFilter}
                onDietaryFilterChange={setDietaryFilter}
                onlySpicy={onlySpicy}
                onToggleSpicy={() => setOnlySpicy(!onlySpicy)}
                onlyBestseller={onlyBestseller}
                onToggleBestseller={() => setOnlyBestseller(!onlyBestseller)}
            />

            {/* 6. Promotional Offer Banner */}
            <PromoOfferStrip />

            {/* 7. Menu Dishes Section */}
            <section id="all-menu-section" className="my-7 pt-2">
                {/* When Search or Filter is active */}
                {(searchQuery || activeCategory !== 'all' || dietaryFilter !== 'all' || onlySpicy || onlyBestseller) ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg sm:text-xl font-bold text-[#111827]">
                                {activeCategory !== 'all'
                                    ? categories?.find(c => c.id === activeCategory)?.name || 'Category Items'
                                    : 'Dishes'}
                                <span className="text-xs font-normal text-[#6B7280] ml-2">
                                    ({filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'})
                                </span>
                            </h3>

                            {/* Reset filter */}
                            <button
                                onClick={() => {
                                    setActiveCategory('all')
                                    setSearchQuery('')
                                    setDietaryFilter('all')
                                    setOnlySpicy(false)
                                    setOnlyBestseller(false)
                                }}
                                className="text-xs font-semibold text-[#FF6B00] hover:underline cursor-pointer"
                            >
                                Clear filters
                            </button>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center flex flex-col items-center justify-center my-6">
                                <span className="text-3xl mb-2">🍽️</span>
                                <h4 className="font-bold text-sm text-[#111827]">No dishes match your search</h4>
                                <p className="text-xs text-[#6B7280] mt-1">Try searching for something else or clearing filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                                {filteredItems.map((item) => (
                                    <FoodCard
                                        key={item.id}
                                        item={item}
                                        onItemClick={handleItemClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Categorized Sections */
                    <div className="space-y-10">
                        {groupedByCategory.map(({ category, items }) => (
                            <div key={category.id} id={`category-${category.id}`} className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                                    <h3 className="text-lg sm:text-xl font-bold text-[#111827] flex items-center gap-2">
                                        <span>{category.name}</span>
                                        <span className="text-xs font-semibold bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
                                            {items.length}
                                        </span>
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                                    {items.map((item) => (
                                        <FoodCard
                                            key={item.id}
                                            item={item}
                                            onItemClick={handleItemClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Dish Detail Modal */}
            <MenuItemModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedItem(null)
                }}
            />
        </div>
    )
}

export default function CustomerMenuPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
                <p className="text-xs font-medium text-[#6B7280]">Loading delicious dishes...</p>
            </div>
        }>
            <MenuContent />
        </Suspense>
    )
}
