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
                setError(err instanceof Error ? err.message : 'Failed to load restaurant')
            } finally {
                setLoading(false)
            }
        }

        fetchWithId()
    }, [restaurantId])

    return { restaurant, loading, error }
}

