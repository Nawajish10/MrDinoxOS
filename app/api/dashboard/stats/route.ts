import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrSetCached, getCacheKey, CACHE_TTL } from '@/lib/cache/cache'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID
        const range = searchParams.get('range') || 'today' // 'today' | 'week' | 'month'

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const cacheKey = getCacheKey(restaurantId, 'dashboard', `stats:${range}`)

        const statsData = await getOrSetCached(
            cacheKey,
            async () => {
                const supabase = getSupabaseAdmin()
                const now = new Date()
                let startDate = startOfDay(now)
                const todayEnd = endOfDay(now)

                if (range === 'week') {
                    startDate = startOfDay(subDays(now, 7))
                } else if (range === 'month') {
                    startDate = startOfDay(subDays(now, 30))
                }

                const todayStartStr = startDate.toISOString()
                const rangeEndStr = todayEnd.toISOString()

                // Parallel aggregated queries
                const [ordersRes, activeSessionsRes, servedWaitingRes, customersRes] = await Promise.all([
                    // Range orders
                    supabase
                        .from('orders')
                        .select('id, total, status, payment_status, created_at, bill_id')
                        .eq('restaurant_id', restaurantId)
                        .gte('created_at', todayStartStr)
                        .lte('created_at', rangeEndStr),

                    // Active open bills / sessions
                    supabase
                        .from('table_sessions')
                        .select('id, status, orders(id, is_open_bill, payment_status)')
                        .eq('restaurant_id', restaurantId)
                        .eq('status', 'active'),

                    // Served orders waiting for payment
                    supabase
                        .from('orders')
                        .select('id')
                        .eq('restaurant_id', restaurantId)
                        .eq('status', 'served')
                        .neq('payment_status', 'paid'),

                    // Total customers
                    supabase
                        .from('customers')
                        .select('id', { count: 'exact' })
                        .eq('restaurant_id', restaurantId)
                ])

                const orders = ordersRes.data || []
                const activeSessions = activeSessionsRes.data || []
                const servedWaiting = servedWaitingRes.data || []
                const totalCustomers = customersRes.count || 0

                // Calculate aggregates
                const paidOrders = orders.filter(o => o.payment_status === 'paid' && o.status !== 'cancelled')
                const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
                const totalOrdersCount = orders.filter(o => o.status !== 'cancelled').length
                const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length
                const openBillsCount = activeSessions.length
                const servedWaitingPaymentCount = servedWaiting.length

                return {
                    totalRevenue,
                    totalOrders: totalOrdersCount,
                    activeOrders: activeOrdersCount,
                    openBills: openBillsCount,
                    servedWaitingPayment: servedWaitingPaymentCount,
                    totalCustomers,
                    recentOrders: orders.slice(0, 10),
                    range,
                    computedAt: new Date().toISOString()
                }
            },
            CACHE_TTL.STATS_DASHBOARD // 60 seconds
        )

        return NextResponse.json({ success: true, stats: statsData })
    } catch (error: unknown) {
        console.error('API /api/dashboard/stats GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' },
            { status: 500 }
        )
    }
}
