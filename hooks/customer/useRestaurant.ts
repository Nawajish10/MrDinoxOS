import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Restaurant } from '@/types'

export function useRestaurant(restaurantId?: string | null) {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // If no restaurantId provided, use the default from env
        const fetchWithId = async () => {
            const id = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID
            
            if (!id) {
                setLoading(false)
                setError('Restaurant ID is required')
                return
            }

            try {
                const { data, error } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setRestaurant(data)
            } catch (err) {
                console.warn('Error fetching restaurant:', err)
                
                // Graceful fallback for any error - table not found, network error, etc.
                const fallback: Restaurant = {
                    id: id,
                    name: 'Open Bites',
                    tagline: 'Spicy & Delicious',
                    phone: '0000000000',
                    whatsapp_number: null,
                    email: null,
                    address: '',
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
                    closing_time: ''
                }

                setRestaurant(fallback)
                setError(null) // Clear error since we have a fallback
            } finally {
                setLoading(false)
            }
        }

        fetchWithId()
    }, [restaurantId])

    return { restaurant, loading, error }
}
