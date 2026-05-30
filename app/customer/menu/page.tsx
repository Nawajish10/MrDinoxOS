'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, QrCode } from 'lucide-react'
import { useMenu } from '@/hooks/useMenu'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useRunningSession } from '@/hooks/customer/useRunningSession'
import { MenuItemModal } from '@/components/menu/MenuItemModal'
import { MenuItem } from '@/types'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80', // Healthy bowl
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', // Pizza
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80', // Pasta
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80', // Meat
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=500&q=80', // Dish
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=500&q=80'  // Pasta/Salad
];

const getDefaultImage = (id: string) => {
    if (!id) return DEFAULT_IMAGES[0];
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DEFAULT_IMAGES[sum % DEFAULT_IMAGES.length];
};

function MenuContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tableParam = searchParams.get('table')
    const restaurantParam = searchParams.get('restaurant')

    const { restaurant, loading: loadingRestaurant } = useRestaurant(restaurantParam)
    const { categories, items: menuItems, loading: loadingMenu } = useMenu(restaurant?.id || null)
    
    // Zustand Cart Store
    const { items: cartItems, addItem, updateQuantity, removeItem, setTableInfo, customerPhone, clearCart } = useCartStore()
    const { hasActiveSession, session } = useRunningSession(tableParam)

    const [restaurantError, setRestaurantError] = useState<string | null>(null)
    const [tableError, setTableError] = useState<string | null>(null)

    // Validate restaurant
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

    // Validate table
    useEffect(() => {
        if (tableParam && restaurant?.id) {
            const validateTable = async () => {
                try {
                    const { data, error } = await supabase
                        .from('restaurant_tables')
                        .select('id, table_number')
                        .eq('id', tableParam)
                        .eq('restaurant_id', restaurant.id)
                        .single()

                    if (error) throw error
                    if (!data) {
                        setTableError('Table not found. Please check the QR code and try again.')
                    } else {
                        setTableError(null)
                        setTableInfo(data.table_number, data.id)
                        sessionStorage.setItem('restaurantId', restaurant.id)
                        sessionStorage.setItem('tableId', data.id)
                    }
                } catch (err) {
                    console.warn('Error validating table:', err)
                    setTableError('Unable to validate table. Please try again.')
                }
            }
            validateTable()
        }
    }, [tableParam, restaurant?.id, setTableInfo])

    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

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

    const filteredItems = useMemo(() => {
        if (!menuItems) return []
        let result = menuItems

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
    }, [menuItems, activeCategory, searchQuery, dietaryFilter])

    const handleItemClick = (item: MenuItem) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    // Helper for finding item in cart to manage quantity inline
    const getCartItemQuantity = (itemId: string) => {
        const item = cartItems.find(i => i.id === itemId)
        return item ? item.quantity : 0
    }

    const handleUpdateQuantity = (item: MenuItem, change: number) => {
        const existingCartItem = cartItems.find(i => i.id === item.id)
        if (existingCartItem) {
            const newQty = existingCartItem.quantity + change
            if (newQty <= 0) {
                removeItem(existingCartItem.cartId)
            } else {
                updateQuantity(existingCartItem.cartId, newQty)
            }
        } else if (change > 0) {
            addItem(item, 1, '')
        }
    }

    if (restaurantError || tableError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-obsidian-base px-4">
                <div className="text-center max-w-md">
                    <QrCode className="h-16 w-16 text-electric-red mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-electric-red mb-2">Invalid QR Code</h2>
                    <p className="text-on-surface-variant mb-4">{restaurantError || tableError}</p>
                    <button onClick={() => router.push('/customer/menu')} className="px-4 py-2 border border-border-gray rounded text-on-surface hover:bg-surface-container transition-colors">
                        View Menu Without Table
                    </button>
                </div>
            </div>
        )
    }

    if (loadingRestaurant || loadingMenu) {
        return (
            <div className="max-w-screen-xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
                <div className="h-12 w-full bg-surface-container rounded premium-skeleton" />
                <div className="flex gap-4 overflow-hidden">
                    <div className="h-8 w-24 bg-surface-container rounded-full premium-skeleton" />
                    <div className="h-8 w-24 bg-surface-container rounded-full premium-skeleton" />
                    <div className="h-8 w-24 bg-surface-container rounded-full premium-skeleton" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-48 bg-surface-container rounded premium-skeleton" />
                    <div className="h-48 bg-surface-container rounded premium-skeleton" />
                    <div className="h-48 bg-surface-container rounded premium-skeleton" />
                </div>
            </div>
        )
    }

    const recommendedItems = menuItems?.slice(0, 4) || []
    const otherItems = filteredItems

    return (
        <>
            <main className="max-w-screen-xl mx-auto w-full px-4 md:px-0 py-8 flex flex-col gap-8">
                {/* Active Session Banner */}
                {hasActiveSession && session && (
                    <div className="bg-primary-container/10 border border-primary-container/30 rounded-lg p-4 flex items-center justify-between animate-fade-in-up shadow-[0_0_15px_rgba(255,179,172,0.05)]">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-container mb-1">Running Bill Active</span>
                            <span className="text-sm font-bold text-on-surface">Table {tableParam} • Add items anytime</span>
                        </div>
                        <button 
                            onClick={() => router.push(`/customer/track/${session.order_id}`)}
                            className="bg-primary-container text-obsidian-base font-bold text-xs px-4 py-2 rounded-DEFAULT hover:opacity-90 transition-opacity btn-scale-down"
                        >
                            View Bill
                        </button>
                    </div>
                )}

                {/* Section 1: Recommended For You */}
                {recommendedItems.length > 0 && (
                    <section className="animate-fade-in-up">
                        <h3 className="font-headline-md text-xl md:text-2xl flex items-center gap-2 mb-4 text-on-surface font-bold">
                            <span className="text-primary-container">✨</span> Recommended food today
                        </h3>
                        <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 -mx-4 px-4 snap-x snap-mandatory">
                            {recommendedItems.map(item => {
                                const qty = getCartItemQuantity(item.id)
                                return (
                                    <article key={item.id} className="min-w-[240px] md:min-w-[280px] snap-center bg-surface-container-lowest rounded-DEFAULT overflow-hidden shadow-sm border border-border-gray flex flex-col group transition-all duration-300">
                                        <div 
                                            className="relative w-full aspect-square overflow-hidden bg-surface-container cursor-pointer"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <img alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" src={item.image_url || getDefaultImage(item.id)} />
                                            {item.is_bestseller && (
                                                <span className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface-variant font-label-sm text-xs px-2 py-1 rounded-DEFAULT flex items-center gap-1 shadow-sm border border-border-gray">
                                                    <span className="material-symbols-outlined text-[12px] text-primary-container">local_fire_department</span> Bestseller
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-grow justify-between">
                                            <div className="cursor-pointer" onClick={() => handleItemClick(item)}>
                                                <h4 className="font-label-md font-bold text-base mb-1 line-clamp-1 text-on-surface">{item.name}</h4>
                                                <p className="font-label-sm text-sm text-on-surface-variant mb-4">
                                                    ₹{item.discounted_price || item.price}
                                                </p>
                                            </div>
                                            <div className="w-full">
                                                {qty === 0 ? (
                                                    <button 
                                                        onClick={() => handleUpdateQuantity(item, 1)}
                                                        className="w-full bg-surface border border-primary-container text-primary-container font-label-md text-sm py-2 rounded-DEFAULT hover:bg-primary-container hover:text-obsidian-base transition-colors flex items-center justify-center gap-1 btn-scale-down"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">add</span> Add
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-surface border border-primary-container/50 rounded-DEFAULT w-full py-1 px-1">
                                                        <button className="w-8 h-8 flex items-center justify-center text-on-surface-variant rounded-DEFAULT hover:bg-surface-container hover:text-primary-container btn-scale-down" onClick={() => handleUpdateQuantity(item, -1)}>
                                                            <span className="material-symbols-outlined text-[16px]">remove</span>
                                                        </button>
                                                        <span className="font-body-md font-bold text-primary-container w-6 text-center inline-block">{qty}</span>
                                                        <button className="w-8 h-8 flex items-center justify-center bg-primary-container text-obsidian-base rounded-DEFAULT hover:opacity-90 btn-scale-down" onClick={() => handleUpdateQuantity(item, 1)}>
                                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Section 2: Search Bar */}
                <div className="w-full relative animate-fade-in-up mt-2">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input 
                        className="w-full bg-surface border border-border-gray rounded-DEFAULT py-4 pl-12 pr-6 font-body-md text-base text-on-background placeholder:text-on-surface-variant/50 focus:border-primary-container outline-none transition-shadow" 
                        placeholder="Search dishes, categories..." 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Section 3: Veg & Non-Veg Filters */}
                <div className="flex gap-4 animate-fade-in-up">
                    <button 
                        onClick={() => setDietaryFilter(dietaryFilter === 'veg' ? 'all' : 'veg')}
                        className={cn(
                            "px-4 py-2 rounded-DEFAULT font-label-md text-sm flex items-center gap-2 transition-all",
                            dietaryFilter === 'veg' ? "bg-emerald-success/10 border border-emerald-success text-emerald-success" : "bg-surface border border-border-gray text-on-surface-variant"
                        )}
                    >
                        <span className="w-3 h-3 border-2 border-emerald-success rounded-full flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-emerald-success rounded-full"></span>
                        </span> Veg
                    </button>
                    <button 
                        onClick={() => setDietaryFilter(dietaryFilter === 'non-veg' ? 'all' : 'non-veg')}
                        className={cn(
                            "px-4 py-2 rounded-DEFAULT font-label-md text-sm flex items-center gap-2 transition-all",
                            dietaryFilter === 'non-veg' ? "bg-electric-red/10 border border-electric-red text-electric-red" : "bg-surface border border-border-gray text-on-surface-variant"
                        )}
                    >
                        <span className="w-3 h-3 border-2 border-electric-red rounded-full flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-electric-red rounded-full"></span>
                        </span> Non-Veg
                    </button>
                </div>

                {/* Section 4: Category Navigation */}
                <nav className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 snap-x snap-mandatory animate-fade-in-up border-b border-border-gray/10">
                    <button 
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                            "snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-label-md text-sm font-bold chip-transition shadow-sm transition-all",
                            activeCategory === 'all' 
                                ? "bg-primary-container text-obsidian-base shadow-[0_4px_12px_rgba(255,179,172,0.2)]" 
                                : "bg-surface-container-lowest border border-border-gray text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        )}
                    >
                        All
                    </button>
                    {categories.map((category) => (
                        <button 
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={cn(
                                "snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-label-md text-sm font-bold chip-transition shadow-sm transition-all",
                                activeCategory === category.id 
                                    ? "bg-primary-container text-obsidian-base shadow-[0_4px_12px_rgba(255,179,172,0.2)]" 
                                    : "bg-surface-container-lowest border border-border-gray text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                            )}
                        >
                            {category.name}
                        </button>
                    ))}
                </nav>

                {/* Section 5: Filtered Items (2 Rows, Horizontal Scroll) */}
                <section className="animate-fade-in-up mt-2">
                    <h3 className="font-headline-md text-xl md:text-2xl flex items-center gap-2 mb-4 text-on-surface font-bold">
                        <span className="text-primary-container">{searchQuery ? '🔍' : '👑'}</span> {searchQuery ? 'Search Results' : 'Special Dishes'}
                    </h3>
                    
                    {otherItems.length === 0 ? (
                        <div className="py-10 text-center text-on-surface-variant flex flex-col items-center gap-4">
                            <Search className="h-10 w-10 opacity-20" />
                            <p className="font-medium">No items found.</p>
                        </div>
                    ) : (
                        <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-6 -mx-4 px-4 snap-x snap-mandatory">
                            {otherItems.map((item) => {
                                const qty = getCartItemQuantity(item.id)
                                return (
                                    <article key={item.id} className="min-w-[85%] md:min-w-[40%] snap-center bg-surface-container-lowest rounded-DEFAULT overflow-hidden shadow-sm border border-border-gray flex flex-row h-36 group transition-all duration-300">
                                        <div 
                                            className="relative w-2/5 h-full bg-surface-container overflow-hidden cursor-pointer shrink-0"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <img alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={item.image_url || getDefaultImage(item.id)} />
                                            {item.is_veg ? (
                                                <span className="absolute top-2 left-2 w-4 h-4 bg-white/90 backdrop-blur rounded shadow flex items-center justify-center p-0.5 border border-emerald-success">
                                                    <span className="w-2 h-2 bg-emerald-success rounded-full"></span>
                                                </span>
                                            ) : (
                                                <span className="absolute top-2 left-2 w-4 h-4 bg-white/90 backdrop-blur rounded shadow flex items-center justify-center p-0.5 border border-electric-red">
                                                    <span className="w-2 h-2 bg-electric-red rounded-full"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col justify-between flex-grow bg-surface-container-lowest w-3/5">
                                            <div className="cursor-pointer" onClick={() => handleItemClick(item)}>
                                                <h4 className="font-headline-md text-base font-bold mb-1 text-on-surface line-clamp-1">{item.name}</h4>
                                                <p className="font-body-md text-xs text-on-surface-variant mb-2 line-clamp-2">{item.description}</p>
                                                <p className="font-bold text-primary-container text-sm">₹{item.discounted_price || item.price}</p>
                                            </div>
                                            <div className="w-full mt-auto flex justify-end">
                                                {qty === 0 ? (
                                                    <button 
                                                        onClick={() => handleUpdateQuantity(item, 1)}
                                                        className="px-4 py-1.5 bg-surface border border-primary-container text-primary-container font-label-md text-xs rounded-DEFAULT hover:bg-primary-container hover:text-obsidian-base transition-colors flex items-center justify-center gap-1 btn-scale-down"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">add</span> Add
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-surface border border-primary-container/50 rounded-DEFAULT py-1 px-1 min-w-[100px]">
                                                        <button className="w-7 h-7 flex items-center justify-center text-on-surface-variant rounded-DEFAULT hover:bg-surface-container hover:text-primary-container btn-scale-down" onClick={() => handleUpdateQuantity(item, -1)}>
                                                            <span className="material-symbols-outlined text-[16px]">remove</span>
                                                        </button>
                                                        <span className="font-body-md font-bold text-primary-container text-sm">{qty}</span>
                                                        <button className="w-7 h-7 flex items-center justify-center bg-primary-container text-obsidian-base rounded-DEFAULT hover:opacity-90 btn-scale-down" onClick={() => handleUpdateQuantity(item, 1)}>
                                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Section 6: Cook's Choice */}
                {menuItems && menuItems.length > 4 && !searchQuery && activeCategory === 'all' && (
                    <section className="animate-fade-in-up mt-4">
                        <h3 className="font-headline-md text-xl flex items-center gap-2 mb-4 text-on-surface font-bold">
                            <span className="text-primary-container">👨‍🍳</span> Cook's Choice
                        </h3>
                        <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-6 -mx-4 px-4 snap-x snap-mandatory">
                            {menuItems.slice().reverse().slice(0, 5).map(item => {
                                const qty = getCartItemQuantity(item.id)
                                return (
                                    <article key={`cooks-${item.id}`} className="min-w-[200px] snap-center bg-surface-container-lowest rounded-DEFAULT overflow-hidden shadow-sm border border-border-gray flex flex-col group transition-all duration-300">
                                        <div 
                                            className="relative w-full aspect-square overflow-hidden bg-surface-container cursor-pointer"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <img alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" src={item.image_url || getDefaultImage(item.id)} />
                                        </div>
                                        <div className="p-3 flex flex-col flex-grow justify-between">
                                            <div className="cursor-pointer mb-3" onClick={() => handleItemClick(item)}>
                                                <h4 className="font-label-md font-bold text-sm mb-1 line-clamp-1 text-on-surface">{item.name}</h4>
                                                <p className="font-bold text-primary-container text-xs">₹{item.discounted_price || item.price}</p>
                                            </div>
                                            <div className="w-full mt-auto">
                                                {qty === 0 ? (
                                                    <button 
                                                        onClick={() => handleUpdateQuantity(item, 1)}
                                                        className="w-full bg-surface border border-primary-container text-primary-container font-label-md text-xs py-1.5 rounded-DEFAULT hover:bg-primary-container hover:text-obsidian-base transition-colors flex items-center justify-center gap-1 btn-scale-down"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">add</span> Add
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-surface border border-primary-container/50 rounded-DEFAULT w-full py-1 px-1">
                                                        <button className="w-6 h-6 flex items-center justify-center text-on-surface-variant rounded-DEFAULT hover:bg-surface-container hover:text-primary-container btn-scale-down" onClick={() => handleUpdateQuantity(item, -1)}>
                                                            <span className="material-symbols-outlined text-[14px]">remove</span>
                                                        </button>
                                                        <span className="font-body-md font-bold text-primary-container text-xs w-4 text-center inline-block">{qty}</span>
                                                        <button className="w-6 h-6 flex items-center justify-center bg-primary-container text-obsidian-base rounded-DEFAULT hover:opacity-90 btn-scale-down" onClick={() => handleUpdateQuantity(item, 1)}>
                                                            <span className="material-symbols-outlined text-[14px]">add</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </section>
                )}
            </main>

            {/* Item Details Modal */}
            <MenuItemModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-obsidian-base">
                <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MenuContent />
        </Suspense>
    )
}
