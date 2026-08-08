'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowUpRight } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReportsCardSkeleton } from '@/components/ui/skeleton-loaders'

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState('7')
    const queryClient = useQueryClient()

    const { data: reportResponse, isLoading } = useQuery({
        queryKey: ['admin-reports', RESTAURANT_ID, dateRange],
        queryFn: async () => {
            const res = await fetch(`/api/admin/reports?restaurantId=${RESTAURANT_ID}&range=${dateRange}`)
            if (!res.ok) throw new Error('Failed to fetch reports')
            const data = await res.json()
            return data.reports
        },
        staleTime: 1000 * 60, // 1 minute fresh
    })

    const stats = reportResponse?.stats || {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        totalCustomers: 0,
        revenueChange: 0,
        ordersChange: 0,
    }
    const topItems = reportResponse?.topItems || []
    const revenueByType = reportResponse?.revenueByType || []

    useEffect(() => {
        const ch = supabase.channel('reports-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                queryClient.invalidateQueries({ queryKey: ['admin-reports', RESTAURANT_ID] })
            })
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [queryClient])

    function exportToCSV() {
        const headers = 'Item Name,Quantity Sold,Revenue\n'
        const rows = topItems.map((item: any) => `"${item.name}",${item.quantity},${item.revenue}`).join('\n')
        const blob = new Blob([headers + rows], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
        a.click()
        toast.success('Report downloaded successfully')
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Reports & Analytics"
                description="View your restaurant's performance, sales metrics, and customer trends."
            >
                <div className="flex items-center gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200">
                            <SelectValue placeholder="Select Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportToCSV} variant="outline" className="gap-2 bg-white">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>
            </PageHeader>

            {isLoading ? (
                <ReportsCardSkeleton />
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</span>
                                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                                        <DollarSign className="w-4 h-4 text-[#FF6B00]" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="text-2xl font-black text-[#111827]">₹{stats.totalRevenue.toFixed(2)}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        {stats.revenueChange >= 0 ? (
                                            <div className="flex items-center text-xs font-bold text-emerald-600">
                                                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                                                +{stats.revenueChange.toFixed(1)}%
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs font-bold text-red-500">
                                                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                                                {stats.revenueChange.toFixed(1)}%
                                            </div>
                                        )}
                                        <span className="text-[11px] text-gray-400">vs previous period</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</span>
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="text-2xl font-black text-[#111827]">{stats.totalOrders}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        {stats.ordersChange >= 0 ? (
                                            <div className="flex items-center text-xs font-bold text-emerald-600">
                                                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                                                +{stats.ordersChange.toFixed(1)}%
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs font-bold text-red-500">
                                                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                                                {stats.ordersChange.toFixed(1)}%
                                            </div>
                                        )}
                                        <span className="text-[11px] text-gray-400">vs previous period</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Order Value</span>
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                        <Package className="w-4 h-4 text-purple-600" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="text-2xl font-black text-[#111827]">₹{stats.avgOrderValue.toFixed(2)}</h3>
                                    <p className="text-[11px] text-gray-400 mt-1.5">Average revenue per ticket</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Customers</span>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="text-2xl font-black text-[#111827]">{stats.totalCustomers}</h3>
                                    <p className="text-[11px] text-gray-400 mt-1.5">Registered guests in system</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Selling Dishes */}
                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardHeader className="pb-3 border-b border-gray-50">
                                <CardTitle className="text-base font-bold text-[#111827]">Top Selling Dishes</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {topItems.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-sm">No sales recorded for this period</div>
                                ) : (
                                    <div className="space-y-4">
                                        {topItems.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-sm text-[#111827]">{item.name}</p>
                                                        <p className="text-xs text-gray-400">{item.quantity} orders</p>
                                                    </div>
                                                </div>
                                                <span className="font-extrabold text-sm text-[#111827]">₹{item.revenue.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Revenue by Order Type */}
                        <Card className="bg-white border-gray-100 shadow-xs">
                            <CardHeader className="pb-3 border-b border-gray-50">
                                <CardTitle className="text-base font-bold text-[#111827]">Revenue by Channel</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {revenueByType.map((channel: any, idx: number) => {
                                        const percent = stats.totalRevenue > 0 ? (channel.revenue / stats.totalRevenue) * 100 : 0
                                        return (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-[#111827]">{channel.type}</span>
                                                    <span className="font-bold text-[#111827]">₹{channel.revenue.toFixed(2)} ({percent.toFixed(0)}%)</span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            idx === 0 ? "bg-[#FF6B00]" : idx === 1 ? "bg-blue-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}
