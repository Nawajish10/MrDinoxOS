'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MenuCategory, MenuItem, Restaurant } from '@/types'

// Query Keys
export const queryKeys = {
    restaurant: (id: string | null) => ['restaurant', id] as const,
    categories: (restaurantId: string | null) => ['categories', restaurantId] as const,
    menuItems: (restaurantId: string | null, categoryId?: string | null) => 
        ['menu-items', restaurantId, categoryId || 'all'] as const,
    adminStats: (restaurantId: string | null, range: string) => 
        ['admin-stats', restaurantId, range] as const,
}

/**
 * Hook to query restaurant settings & profile via TanStack Query
 */
export function useRestaurantQuery(restaurantId?: string | null) {
    const rId = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''

    return useQuery<Restaurant | null>({
        queryKey: queryKeys.restaurant(rId),
        queryFn: async () => {
            if (!rId) return null
            const res = await fetch(`/api/settings?restaurantId=${rId}`)
            if (!res.ok) throw new Error('Failed to fetch restaurant profile')
            const data = await res.json()
            return data.restaurant || null
        },
        enabled: Boolean(rId),
        staleTime: 1000 * 60 * 10, // 10 minutes fresh
    })
}

/**
 * Hook to query menu categories via TanStack Query
 */
export function useCategoriesQuery(restaurantId?: string | null) {
    const rId = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''

    return useQuery<MenuCategory[]>({
        queryKey: queryKeys.categories(rId),
        queryFn: async () => {
            if (!rId) return []
            const res = await fetch(`/api/menu/categories?restaurantId=${rId}`)
            if (!res.ok) throw new Error('Failed to fetch categories')
            const data = await res.json()
            return data.categories || []
        },
        enabled: Boolean(rId),
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })
}

/**
 * Hook to query menu items via TanStack Query
 */
export function useMenuItemsQuery(restaurantId?: string | null, categoryId?: string | null) {
    const rId = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''

    return useQuery<MenuItem[]>({
        queryKey: queryKeys.menuItems(rId, categoryId),
        queryFn: async () => {
            if (!rId) return []
            const url = categoryId && categoryId !== 'all'
                ? `/api/menu/items?restaurantId=${rId}&categoryId=${categoryId}`
                : `/api/menu/items?restaurantId=${rId}`
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch menu items')
            const data = await res.json()
            return (data.items || []).filter((i: any) => !i.name.startsWith('[DELETED]'))
        },
        enabled: Boolean(rId),
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })
}

/**
 * Prefetching helper for the customer menu
 */
export async function prefetchCustomerMenu(queryClient: any, restaurantId: string) {
    if (!restaurantId) return
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: queryKeys.restaurant(restaurantId),
            queryFn: async () => {
                const res = await fetch(`/api/settings?restaurantId=${restaurantId}`)
                const data = await res.json()
                return data.restaurant || null
            },
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.categories(restaurantId),
            queryFn: async () => {
                const res = await fetch(`/api/menu/categories?restaurantId=${restaurantId}`)
                const data = await res.json()
                return data.categories || []
            },
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.menuItems(restaurantId, 'all'),
            queryFn: async () => {
                const res = await fetch(`/api/menu/items?restaurantId=${restaurantId}`)
                const data = await res.json()
                return data.items || []
            },
        }),
    ])
}
