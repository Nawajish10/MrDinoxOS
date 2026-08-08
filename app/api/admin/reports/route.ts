import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrSetCached, getCacheKey, CACHE_TTL } from '@/lib/cache/cache'
import { subDays } from 'date-fns'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID
        const dateRange = searchParams.get('range') || '7' // '7' | '30' | '90'

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const cacheKey = getCacheKey(restaurantId, 'dashboard', `reports:${dateRange}`)

        const reportData = await getOrSetCached(
            cacheKey,
            async () => {
                const supabase = getSupabaseAdmin()
                const days = parseInt(dateRange) || 7
                const startDate = subDays(new Date(), days).toISOString()
                const prevStartDate = subDays(new Date(), days * 2).toISOString()

                // Parallel database execution
                const [currentOrdersRes, prevOrdersRes, customerCountRes] = await Promise.all([
                    // Current period completed orders
                    supabase
                        .from('orders')
                        .select('id, total, order_type, created_at, status')
                        .eq('restaurant_id', restaurantId)
                        .gte('created_at', startDate)
                        .eq('status', 'completed'),

                    // Previous period for growth comparison
                    supabase
                        .from('orders')
                        .select('total')
                        .eq('restaurant_id', restaurantId)
                        .gte('created_at', prevStartDate)
                        .lt('created_at', startDate)
                        .eq('status', 'completed'),

                    // Total customers
                    supabase
                        .from('customers')
                        .select('id', { count: 'exact', head: true })
                        .eq('restaurant_id', restaurantId)
                ])

                const orders = currentOrdersRes.data || []
                const prevOrders = prevOrdersRes.data || []
                const totalCustomers = customerCountRes.count || 0

                const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
                const totalOrders = orders.length
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

                const prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
                const prevOrderCount = prevOrders.length

                const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
                const ordersChange = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : 0

                // Fetch top items only if orders exist
                let topItems: { name: string; quantity: number; revenue: number }[] = []
                if (orders.length > 0) {
                    const orderIds = orders.slice(0, 100).map(o => o.id)
                    const { data: orderItems } = await supabase
                        .from('order_items')
                        .select('item_name, quantity, total')
                        .in('order_id', orderIds)

                    const itemSales = (orderItems || []).reduce((acc: Record<string, { name: string; quantity: number; revenue: number }>, item) => {
                        if (!acc[item.item_name]) {
                            acc[item.item_name] = { name: item.item_name, quantity: 0, revenue: 0 }
                        }
                        acc[item.item_name].quantity += Number(item.quantity) || 0
                        acc[item.item_name].revenue += Number(item.total) || 0
                        return acc
                    }, {})

                    topItems = Object.values(itemSales)
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 5)
                }

                // Revenue by order type
                const revenueByType = [
                    {
                        type: 'Dine In',
                        revenue: orders.filter(o => o.order_type === 'dine_in').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
                        count: orders.filter(o => o.order_type === 'dine_in').length,
                    },
                    {
                        type: 'Takeaway',
                        revenue: orders.filter(o => o.order_type === 'take_away').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
                        count: orders.filter(o => o.order_type === 'take_away').length,
                    },
                    {
                        type: 'Delivery',
                        revenue: orders.filter(o => o.order_type === 'delivery').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
                        count: orders.filter(o => o.order_type === 'delivery').length,
                    },
                ]

                return {
                    stats: {
                        totalRevenue,
                        totalOrders,
                        avgOrderValue,
                        totalCustomers,
                        revenueChange,
                        ordersChange,
                    },
                    topItems,
                    revenueByType,
                    computedAt: new Date().toISOString(),
                }
            },
            CACHE_TTL.STATS_DASHBOARD // 60 seconds
        )

        return NextResponse.json({ success: true, reports: reportData })
    } catch (error: unknown) {
        console.error('API /api/admin/reports GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch reports' },
            { status: 500 }
        )
    }
}
