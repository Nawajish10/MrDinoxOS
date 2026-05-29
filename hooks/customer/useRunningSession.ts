"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TableSession } from '@/types'
import { useSessionStore } from '@/store/customer/sessionStore'

export function useRunningSession(tableId: string | null) {
    const [session, setSession] = useState<TableSession | null>(null)
    const [loading, setLoading] = useState(true)
    const { startSession, closeSession } = useSessionStore()
    const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID!

    useEffect(() => {
        if (!tableId) {
            setLoading(false)
            return
        }

        const fetchSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('table_sessions')
                    .select('*, orders(bill_id, is_open_bill, payment_status, status)')
                    .eq('table_id', tableId)
                    .eq('status', 'active')
                    .eq('restaurant_id', RESTAURANT_ID)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (error) throw error
                
                if (data && data.orders && data.orders.is_open_bill) {
                    setSession(data as unknown as TableSession)
                    // Sync with global store
                    startSession(data.order_id, data.orders.bill_id, data.id)
                } else {
                    setSession(null)
                    closeSession()
                }
            } catch (err) {
                console.error('Error fetching running session:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchSession()

        // Listen for changes on table_sessions
        const channel = supabase
            .channel(`table-session-${tableId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'table_sessions',
                    filter: `table_id=eq.${tableId}`
                },
                () => {
                    fetchSession()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableId, RESTAURANT_ID, startSession, closeSession])

    return {
        hasActiveSession: !!session,
        session,
        loading,
        canAddMore: !!session && session.status === 'active'
    }
}
