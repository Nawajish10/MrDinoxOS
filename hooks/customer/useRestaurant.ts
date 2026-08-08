import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Restaurant } from '@/types'

export function useRestaurant(restaurantId?: string | null) {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchWithId = async () => {
            const id = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID
            
            if (!id) {
                setLoading(false)
                setError('Restaurant ID is required')
                return
            }

            try {
                // 1. Try fetching via server-side API
                const res = await fetch(`/api/settings?restaurantId=${id}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.restaurant) {
                        setRestaurant(data.restaurant)
                        setError(null)
                        setLoading(false)
                        return
                    }
                }

                // 2. Fallback to Supabase client
                const { data, error: dbErr } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (dbErr) throw dbErr
                setRestaurant(data)
                setError(null)
            } catch (err) {
                console.warn('Error fetching restaurant:', err)
                const fallback: Restaurant = {
                    id: id,
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
                    closing_time: ''
                }
                setRestaurant(fallback)
                setError(null)
            } finally {
                setLoading(false)
            }
        }

        fetchWithId()
    }, [restaurantId])

    return { restaurant, loading, error }
}

