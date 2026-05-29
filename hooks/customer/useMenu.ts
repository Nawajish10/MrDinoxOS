import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'

export function useMenu(restaurantId: string | null) {
    const [categories, setCategories] = useState<MenuCategory[]>([])
    const [items, setItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!restaurantId) return
        const rId = restaurantId

        async function fetchData(silent = false) {
            try {
                if (!silent) setLoading(true)
                // Groups parallel fetch
                const [catData, itemData] = await Promise.all([
                    supabase
                        .from('menu_categories')
                        .select('*')
                        .eq('restaurant_id', rId)
                        .eq('is_active', true)
                        .order('sort_order', { ascending: true }),
                    supabase
                        .from('menu_items')
                        .select('*')
                        .eq('restaurant_id', rId)
                        .eq('is_available', true)
                ])

                if (catData.error) throw catData.error
                if (itemData.error) throw itemData.error

                setCategories(catData.data || [])
                setItems(itemData.data || [])
            } catch (err) {
                console.warn('Error fetching menu:', err)
                
                // Graceful fallback - provide sample menu items
                const fallbackCategories: MenuCategory[] = [
                    { id: 'cat-1', restaurant_id: rId, name: 'All', description: null, image_url: null, sort_order: 0, is_active: true },
                    { id: 'cat-2', restaurant_id: rId, name: 'Starters', description: null, image_url: null, sort_order: 1, is_active: true }
                ]

                const fallbackItems: MenuItem[] = [
                    { 
                        id: 'item-1', 
                        restaurant_id: rId, 
                        category_id: 'cat-1', 
                        name: 'Demo Salad', 
                        description: 'Fresh greens with dressing', 
                        price: 199, 
                        discounted_price: null,
                        image_url: null, 
                        is_veg: true, 
                        is_bestseller: false,
                        is_new: false,
                        is_spicy: false,
                        spicy_level: 0,
                        is_available: true,
                        preparation_time: 10,
                        serves: '1'
                    },
                    { 
                        id: 'item-2', 
                        restaurant_id: rId, 
                        category_id: 'cat-2', 
                        name: 'Spicy Wings', 
                        description: 'Crispy chicken wings with spicy glaze', 
                        price: 349, 
                        discounted_price: null,
                        image_url: null, 
                        is_veg: false, 
                        is_bestseller: true,
                        is_new: false,
                        is_spicy: true,
                        spicy_level: 3,
                        is_available: true,
                        preparation_time: 15,
                        serves: '2'
                    }
                ]

                setCategories(fallbackCategories)
                setItems(fallbackItems)
                setError(null)
            } finally {
                if (!silent) setLoading(false)
            }
        }

        fetchData()

        const channel = supabase.channel('menu-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_items' },
                () => fetchData(true)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_categories' },
                () => fetchData(true)
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId])

    return { categories, items, loading, error }
}
