'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCategoriesQuery, useMenuItemsQuery, queryKeys } from './useCustomerData'
import { supabase } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'

export function useMenu(restaurantId: string | null) {
    const rId = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''
    const queryClient = useQueryClient()

    const { 
        data: categoriesData, 
        isLoading: loadingCategories, 
        error: catError 
    } = useCategoriesQuery(rId)

    const { 
        data: itemsData, 
        isLoading: loadingItems, 
        error: itemError 
    } = useMenuItemsQuery(rId, 'all')

    // Realtime invalidation synchronization
    useEffect(() => {
        if (!rId) return

        const channel = supabase.channel(`menu-realtime-${rId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${rId}` },
                () => {
                    console.log('⚡ [Realtime] menu_items changed, invalidating TanStack Query cache')
                    queryClient.invalidateQueries({ queryKey: ['menu-items', rId] })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'menu_categories', filter: `restaurant_id=eq.${rId}` },
                () => {
                    console.log('⚡ [Realtime] menu_categories changed, invalidating TanStack Query cache')
                    queryClient.invalidateQueries({ queryKey: queryKeys.categories(rId) })
                    queryClient.invalidateQueries({ queryKey: ['menu-items', rId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [rId, queryClient])

    return {
        categories: (categoriesData || []) as MenuCategory[],
        items: (itemsData || []) as MenuItem[],
        loading: loadingCategories || loadingItems,
        error: catError ? (catError as Error).message : (itemError ? (itemError as Error).message : null),
    }
}
