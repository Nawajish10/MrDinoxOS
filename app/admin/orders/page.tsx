'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Download, Eye, Printer, ShoppingBag, Truck, Utensils, Clock, MapPin, DollarSign, XCircle, CheckCircle2 } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { triggerPaymentWebhook } from '@/lib/webhook'
import { OrdersTableSkeleton } from '@/components/ui/skeleton-loaders'

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all')
    const [activeTab, setActiveTab] = useState('active')
    const [processingPayment, setProcessingPayment] = useState(false)
    const selectedOrderRef = useRef<any>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        selectedOrderRef.current = selectedOrder
    }, [selectedOrder])

    const fetchOrders = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    bill_id,
                    restaurant_id,
                    total,
                    subtotal,
                    tax,
                    discount,
                    status,
                    order_type,
                    payment_status,
                    payment_method,
                    table_number,
                    created_at,
                    is_open_bill,
                    customers (id, name, phone, email, address),
                    order_items (id, menu_item_id, item_name, quantity, price, total, special_instructions, status)
                `)
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setOrders((data || []) as Order[])
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const debouncedFetchOrders = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchOrders(false)
            if (selectedOrderRef.current) {
                handleViewOrder(selectedOrderRef.current.id)
            }
        }, 300)
    }, [fetchOrders])

    useEffect(() => {
        fetchOrders()

        const channel = supabase.channel('admin-orders-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${RESTAURANT_ID}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    toast.success('New Order Received! 🔔')
                }
                debouncedFetchOrders()
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'order_items'
            }, () => {
                debouncedFetchOrders()
            })
            .subscribe()

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            supabase.removeChannel(channel)
        }
    }, [fetchOrders, debouncedFetchOrders])

    const filteredOrders = useMemo(() => {
        let list = [...orders]

        if (activeTab === 'active') {
            list = list.filter((o) =>
                ['pending', 'confirmed', 'preparing', 'partially_ready', 'ready', 'served'].includes(o.status)
            )
        } else if (activeTab === 'completed') {
            list = list.filter((o) => o.status === 'completed')
        } else if (activeTab === 'cancelled') {
            list = list.filter((o) => o.status === 'cancelled')
        }

        if (orderTypeFilter !== 'all') {
            list = list.filter((o) => o.order_type === orderTypeFilter)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            list = list.filter((o: any) =>
                o.bill_id?.toLowerCase().includes(term) ||
                (o.customers?.phone || o.customer?.phone)?.includes(term) ||
                (o.customers?.name || o.customer?.name)?.toLowerCase().includes(term)
            )
        }

        return list
    }, [orders, activeTab, orderTypeFilter, searchTerm])

    async function handleViewOrder(orderId: string) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    bill_id,
                    restaurant_id,
                    total,
                    subtotal,
                    tax,
                    discount,
                    status,
                    order_type,
                    payment_status,
                    payment_method,
                    table_number,
                    created_at,
                    is_open_bill,
                    customers (id, name, phone, email, address),
                    order_items (id, menu_item_id, item_name, quantity, price, total, special_instructions, status)
                `)
                .eq('id', orderId)
                .single()

            if (error) throw error
            setSelectedOrder(data)
        } catch (error) {
            console.error('Error fetching order details:', error)
        }
    }

    async function updateOrderStatus(orderId: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId)

            if (error) throw error
            toast.success(`Order marked as ${newStatus}`)
            fetchOrders(false)
            if (selectedOrder?.id === orderId) {
                setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }))
            }
        } catch (error) {
            console.error('Error updating order:', error)
            toast.error('Failed to update order status')
        }
    }

    async function markOrderAsPaid(orderId: string) {
        try {
            setProcessingPayment(true)
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', orderId)

            if (error) throw error

            await triggerPaymentWebhook({
                bill_id: selectedOrder?.bill_id || orderId,
                amount: selectedOrder?.total || 0,
                customer: {
                    name: selectedOrder?.customers?.name || selectedOrder?.customer?.name || 'Guest',
                    phone: selectedOrder?.customers?.phone || selectedOrder?.customer?.phone || '',
                    address: selectedOrder?.customers?.address || selectedOrder?.customer?.address || null,
                },
                order_type: selectedOrder?.order_type || 'dine_in',
                table_number: selectedOrder?.table_number || null,
                items: selectedOrder?.order_items?.map((item: any) => ({
                    name: item.item_name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                })) || [],
                payment_method: selectedOrder?.payment_method || 'cash',
                restaurant_id: RESTAURANT_ID,
            })

            toast.success('Payment confirmed! Order completed.')
            fetchOrders(false)
            setSelectedOrder(null)
        } catch (err) {
            console.error('Error marking order paid:', err)
            toast.error('Failed to mark order as paid')
        } finally {
            setProcessingPayment(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Orders Management"
                description="Manage active orders, kitchen tickets, and payment settlements in real time."
            >
                <div className="flex items-center gap-3">
                    <Button onClick={() => fetchOrders(true)} variant="outline" className="bg-white">
                        Refresh
                    </Button>
                </div>
            </PageHeader>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="bg-gray-100 p-1 rounded-xl">
                        <TabsTrigger value="active" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#FF6B00]">
                            Active Orders ({orders.filter(o => ['pending', 'confirmed', 'preparing', 'partially_ready', 'ready', 'served'].includes(o.status)).length})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#111827]">
                            Completed
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-red-600">
                            Cancelled
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search bill ID, customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-gray-50 border-gray-200 text-xs rounded-xl"
                        />
                    </div>
                    <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                        <SelectTrigger className="w-[130px] bg-gray-50 border-gray-200 text-xs rounded-xl">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="dine_in">Dine In</SelectItem>
                            <SelectItem value="take_away">Takeaway</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Orders Feed */}
            {loading ? (
                <OrdersTableSkeleton />
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-bold text-base text-[#111827]">No orders found</h3>
                    <p className="text-xs text-gray-500">There are no {activeTab} orders matching your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => (
                        <Card
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-white border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden hover:border-orange-200"
                        >
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-100 rounded-md text-[#111827]">
                                                #{order.bill_id?.slice(-6) || order.id.slice(-6)}
                                            </span>
                                            <Badge
                                                className={`text-[10px] font-bold uppercase border-0 ${
                                                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                    order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                                    'bg-orange-50 text-[#FF6B00]'
                                                }`}
                                            >
                                                {order.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-bold text-[#111827] mt-2">
                                            {(order as any).customers?.name || (order as any).customer?.name || 'Guest Customer'}
                                        </p>
                                    </div>
                                    <span className="font-extrabold text-base text-[#111827]">
                                        ₹{order.total?.toFixed(2)}
                                    </span>
                                </div>

                                <div className="text-xs text-gray-500 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{format(new Date(order.created_at), 'hh:mm a, dd MMM')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 capitalize">
                                        {order.order_type === 'dine_in' ? <Utensils className="w-3.5 h-3.5 text-orange-500" /> : <Truck className="w-3.5 h-3.5 text-blue-500" />}
                                        <span>{order.order_type.replace('_', ' ')} {order.table_number ? `• Table ${order.table_number}` : ''}</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${order.payment_status === 'paid' ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50' : 'border-amber-200 text-amber-700 bg-amber-50/50'}`}>
                                        {order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                                    </Badge>
                                    <Button size="sm" variant="ghost" className="text-xs text-[#FF6B00] font-bold h-7 px-2">
                                        View Details →
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Order Details Dialog */}
            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827] flex items-center justify-between">
                            <span>Order Details #{selectedOrder?.bill_id?.slice(-6) || selectedOrder?.id.slice(-6)}</span>
                            <Badge className="bg-orange-50 text-[#FF6B00] border-0 text-xs font-bold uppercase">
                                {selectedOrder?.status}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4 py-2 text-sm text-[#111827]">
                            <div className="bg-gray-50 p-3.5 rounded-xl space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Customer:</span>
                                    <span className="font-bold">{selectedOrder.customers?.name || selectedOrder.customer?.name || 'Walk-in Guest'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Phone:</span>
                                    <span className="font-bold">{selectedOrder.customers?.phone || selectedOrder.customer?.phone || 'N/A'}</span>
                                </div>
                                {selectedOrder.table_number && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Table:</span>
                                        <span className="font-bold">Table {selectedOrder.table_number}</span>
                                    </div>
                                )}
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ordered Items</span>
                                <div className="divide-y divide-gray-100">
                                    {selectedOrder.order_items?.map((item: any) => (
                                        <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold">{item.quantity}x {item.item_name}</p>
                                                {item.special_instructions && (
                                                    <p className="text-[11px] text-gray-400 italic">Note: {item.special_instructions}</p>
                                                )}
                                            </div>
                                            <span className="font-extrabold">₹{item.total?.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total Breakdown */}
                            <div className="pt-3 border-t border-gray-100 space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span>₹{selectedOrder.subtotal?.toFixed(2) || selectedOrder.total?.toFixed(2)}</span>
                                </div>
                                {selectedOrder.tax > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tax:</span>
                                        <span>₹{selectedOrder.tax.toFixed(2)}</span>
                                    </div>
                                )}
                                {selectedOrder.discount > 0 && (
                                    <div className="flex justify-between text-emerald-600 font-bold">
                                        <span>Discount:</span>
                                        <span>-₹{selectedOrder.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-100">
                                    <span>Total:</span>
                                    <span className="text-[#FF6B00]">₹{selectedOrder.total?.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-col gap-2">
                                {selectedOrder.payment_status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                                    <Button
                                        onClick={() => markOrderAsPaid(selectedOrder.id)}
                                        disabled={processingPayment}
                                        className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl h-11"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Confirm Payment & Complete Order
                                    </Button>
                                )}
                                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                                            className="text-xs font-bold rounded-xl"
                                        >
                                            Set Preparing
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => updateOrderStatus(selectedOrder.id, 'served')}
                                            className="text-xs font-bold rounded-xl"
                                        >
                                            Set Served
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
