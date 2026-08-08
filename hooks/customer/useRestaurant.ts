'use client'

import { useRestaurantQuery } from './useCustomerData'
import { Restaurant } from '@/types'

export function useRestaurant(restaurantId?: string | null) {
    const rId = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || ''
    const { data: restaurantData, isLoading, error: queryError } = useRestaurantQuery(rId)

    const fallback: Restaurant = {
        id: rId || 'da8efec5-6168-4dc7-a2ec-0739c0e691f3',
        name: 'Demo Restaurant',
        tagline: 'Fresh & Tasty',
        phone: '+910000000000',
        whatsapp_number: null,
        email: null,
        address: 'Demo Address',
        city: 'DemoCity',
        logo_url: null,
        banner_url: null,
        upi_id: null,
        upi_qr_url: null,
        is_open: true,
        tax_percentage: 0,
        delivery_charge: 0,
        min_order_amount: 0,
        avg_preparation_time: 15,
        opening_time: '',
        closing_time: '',
    }

    return {
        restaurant: restaurantData || fallback,
        loading: isLoading,
        error: queryError ? (queryError as Error).message : null,
    }
}
