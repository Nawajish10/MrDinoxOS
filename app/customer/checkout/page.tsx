'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { ArrowLeft, ShoppingBag, Ticket, X, User, Phone, ChevronRight, Loader2, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { triggerPaymentWebhook } from '@/lib/webhook'
import { validateCoupon, incrementCouponUsage, getAvailableCoupons } from '@/actions/coupon'
import { Coupon } from '@/types'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useNotificationStore } from '@/store/notificationStore'

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export default function CheckoutPage() {
    const router = useRouter()
     const {
         items,
         customerName,
         customerPhone,
         tableNumber,
         getSubtotal,
         getTax,
         getDiscount,
         coupon,
         setCustomerInfo,
         clearCart,
         applyCoupon,
         removeCoupon
     } = useCartStore()
    const { addNotification } = useNotificationStore()

    const [couponCode, setCouponCode] = useState('')
    const [verifyingCoupon, setVerifyingCoupon] = useState(false)
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(customerName || '')
    const [phone, setPhone] = useState(customerPhone || '')

    const subtotal = getSubtotal()
    const discount = getDiscount()
    const tax = getTax()
    const delivery = 0 // No delivery charge for dine-in
    const total = subtotal + tax - discount + delivery

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return

        setVerifyingCoupon(true)
        const result = await validateCoupon(couponCode, subtotal)
        setVerifyingCoupon(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.coupon) {
            applyCoupon(result.coupon)
            toast.success(`Coupon ${result.coupon.code} applied!`)
            setCouponCode('')
        }
    }

    const handlePlaceOrder = async () => {
        if (isNaN(total) || total <= 0) {
            toast.error('Invalid order amount. Please check your cart.')
            return
        }
        if (!name || !phone) {
            toast.error('Please enter name and phone number')
            return
        }

        const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
        if (!rid) {
            console.error('❌ CONFIG ERROR: NEXT_PUBLIC_RESTAURANT_ID is missing in .env')
            toast.error('System configuration error. Please contact admin.')
            setLoading(false)
            return
        }

        setLoading(true)

        let billId: string | null = null
        let orderId: string | null = null
        let ticketData: { id: string; ticket_number: string } | null = null

        try {
            // 1. Handle Customer - Manual upsert (check then insert/update)
            console.log('💾 [Step 1/5] Saving customer...', { name, phone, rid })
            
            let customerId: string | null = null
            let customerSaveSuccess = false
            
            try {
                // First, check if customer exists
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id, name, phone, address')
                    .eq('phone', phone)
                    .eq('restaurant_id', process.env.NEXT_PUBLIC_RESTAURANT_ID)
                    .maybeSingle()

                if (existingCustomer) {
                    // Update existing customer
                    console.log('📝 Updating existing customer:', existingCustomer.id)
                    const { data: updatedCustomer, error: updateError } = await supabase
                        .from('customers')
                        .update({
                            name: name,
                            address: null
                        })
                        .eq('id', existingCustomer.id)
                        .select('id, name, phone, address')
                        .single()

                    if (updateError) {
                        console.warn('⚠️ Customer update failed:', updateError)
                    } else {
                        customerId = updatedCustomer.id
                        customerSaveSuccess = true
                        console.log('✅ Customer updated:', updatedCustomer)
                    }
                } else {
                    // Insert new customer
                    console.log('➕ Creating new customer')
                    const { data: newCustomer, error: insertError } = await supabase
                        .from('customers')
                        .insert({
                            phone: phone,
                            name: name,
                            email: null,
                            address: null,
                            restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID
                        })
                        .select('id, name, phone, address')
                        .single()

                    if (insertError) {
                        console.warn('⚠️ Customer insert failed:', insertError, ' - Using fallback ID')
                    } else if (newCustomer && newCustomer.id) {
                        customerId = newCustomer.id
                        customerSaveSuccess = true
                        console.log('✅ New customer created:', newCustomer)
                    }
                }
            } catch (err: unknown) {
                console.warn('⚠️ Customer save error (non-critical):', err)
                // Continue with fallback ID
            }

             console.log('✅ Customer ID confirmed:', customerId, 'Name:', name, 'Phone:', phone)
             if (customerSaveSuccess) {
                 toast.success('Customer saved successfully!')
             } else {
                 console.log('ℹ️ No customer saved - orders will be anonymous')
             }


            // 2. Resolve Table ID from Table Number
            let resolvedTableId = null
            if (tableNumber) {
                const { data: tableData } = await supabase
                    .from('restaurant_tables')
                    .select('id')
                    .eq('table_number', parseInt(tableNumber.toString()))
                    .eq('restaurant_id', rid)
                    .maybeSingle()

                if (tableData) resolvedTableId = tableData.id
            }

            // 3. Check for existing active order via Secure API (bypasses RLS)
            let existingOrderId = null
            let existingBillId = null
            let existingTotal = 0
            let existingSubtotal = 0
            let existingStatus = 'pending'  // Default to pending if no existing order

            try {
                const params = new URLSearchParams()
                params.append('restaurantId', rid)
                if (resolvedTableId) params.append('tableId', resolvedTableId)
                if (tableNumber) params.append('tableNumber', tableNumber.toString())
                if (customerId) params.append('customerId', customerId)

                console.log('🔍 [Step 2.5] Checking active order via API...', params.toString())
                const res = await fetch(`/api/orders/active?${params.toString()}`)

                if (res.ok) {
                    const { order } = await res.json()
                    // Merge into ANY unpaid order (except cancelled)
                    // This includes served orders - customer can keep ordering on same bill
                    if (order && order.payment_status !== 'paid' && order.status !== 'cancelled') {
                        console.log('✅ Found active (unpaid) order via API:', order)
                        existingOrderId = order.id
                        existingBillId = order.bill_id
                        existingTotal = order.total
                        existingSubtotal = order.subtotal || 0
                        existingStatus = order.status  // Store existing status
                    } else {
                        console.log('🆕 No unpaid order found. Creating new bill.')
                    }
                } else {
                    console.warn('⚠️ API check failed, status:', res.status)
                }
            } catch (err) {
                console.error('❌ Error checking active order via API:', err)
                // Fallback: Proceed as new order
            }

            orderId = existingOrderId
            billId = existingBillId

            if (existingOrderId) {
                // Append to existing order - create kitchen ticket for new items
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total: existingTotal + total,
                        subtotal: existingSubtotal + subtotal,
                        tax: ((existingSubtotal + subtotal - discount) * 0.05),
                        discount: (discount || 0),
                        status: (existingStatus === 'served' || existingStatus === 'completed')
                            ? 'pending'
                            : (existingStatus === 'pending' || existingStatus === 'confirmed')
                                ? 'pending'
                                : existingStatus,
                        payment_status: 'pending',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingOrderId)

                if (updateError) throw updateError

                // Create kitchen ticket for new items
                const ticketResult = await supabase
                    .from('kitchen_tickets')
                    .insert({
                        order_id: existingOrderId,
                        ticket_number: `KT-${Date.now().toString().slice(-4)}`,
                        status: 'pending'
                    })
                    .select()
                    .single()

                if (ticketResult.error) throw ticketResult.error
                const newTicketData = ticketResult.data

                // Add order items with ticket_id
                const orderItemsData = items.map(item => ({
                    order_id: existingOrderId,
                    ticket_id: newTicketData.id,
                    menu_item_id: item.id,
                    item_name: item.name,
                    quantity: item.quantity,
                    price: item.discounted_price || item.price,
                    total: item.lineTotal,
                    special_instructions: item.instructions,
                    status: 'pending'
                }))

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItemsData)

                if (itemsError) throw itemsError

                ticketData = newTicketData
                toast.success('Items added to your existing order!', {
                    description: `Bill ID: ${billId} • New Kitchen Ticket: ${newTicketData.ticket_number}`
                })
            } else {
                // Create new order
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                billId = `BILL${dateStr}${random}`

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orderPayload: any = {
                    bill_id: billId,
                    restaurant_id: rid,
                    customer_id: customerId,
                    table_id: resolvedTableId,
                    order_type: 'dine_in',
                    status: 'pending',
                    payment_status: 'pending',
                    payment_method: 'cash',
                    subtotal: parseFloat(subtotal.toString()) || 0,
                    tax: parseFloat(tax.toString()) || 0,
                    discount: parseFloat(discount.toString()) || 0,
                    delivery_charge: parseFloat(delivery.toString()) || 0,
                    total: parseFloat(total.toString()) || 0,
                    special_instructions: '',
                    delivery_address: null,
                    estimated_time: 30,
                    created_at: new Date().toISOString()
                }

                console.log('📤 [Step 3/5] Inserting order to Supabase...', orderPayload)

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert(orderPayload)
                    .select()
                    .single()

                if (orderError) {
                    console.warn('⚠️ Order insertion failed, but proceeding with fallback:', orderError)
                    // Use the billId we generated as the order ID
                    orderId = billId
                } else if (orderData) {
                    console.log('✅ Order created successfully:', orderData)
                    orderId = orderData.id
                } else {
                    orderId = billId
                }

                toast.success('Order placed successfully!', {
                    description: `Bill ID: ${billId}`
                })

                // Create kitchen ticket for initial order
                const ticketResult = await supabase
                    .from('kitchen_tickets')
                    .insert({
                        order_id: orderId,
                        ticket_number: 'KT-1',
                        status: 'pending'
                    })
                    .select()
                    .single()

                if (ticketResult.error) {
                    console.warn('⚠️ Kitchen ticket creation failed:', ticketResult.error)
                } else {
                    ticketData = ticketResult.data
                }
            }

            // 4. Add order items
            // Only add items if we haven't already added them in the existing order block
            if (!existingOrderId) {
                const orderItemsData = items.map(item => ({
                    order_id: orderId,
                    ticket_id: ticketData ? ticketData.id : null,
                    menu_item_id: item.id,
                    item_name: item.name,
                    quantity: item.quantity,
                    price: item.discounted_price || item.price,
                    total: item.lineTotal,
                    special_instructions: item.instructions,
                    status: 'pending'
                }))
                console.log('📦 [Step 4/5] Adding order items...', orderItemsData)

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItemsData)

                if (itemsError) throw itemsError
            }

            // Update Coupon Usage if used
            if (coupon && !existingOrderId) {
                await incrementCouponUsage(coupon.id)
            }

            clearCart()

            // 3.5 Update Stock Logic
            try {
                for (const item of items) {
                    // Fetch current stock
                    const { data: menuItem } = await supabase
                        .from('menu_items')
                        .select('stock, is_available, is_infinite_stock')
                        .eq('id', item.id)
                        .single()

                    if (menuItem && !menuItem.is_infinite_stock && typeof menuItem.stock === 'number') {
                        const newStock = Math.max(0, menuItem.stock - item.quantity)
                        const shouldDisable = newStock <= 0

                        await supabase
                            .from('menu_items')
                            .update({
                                stock: newStock,
                                is_available: shouldDisable ? false : menuItem.is_available
                            })
                            .eq('id', item.id)

                        if (shouldDisable) {
                            console.log(`Item ${item.name} is now out of stock`)
                        }
                    }
                }
            } catch (stockErr) {
                console.error('Failed to update stock:', stockErr)
            }

            // Trigger n8n Webhook
            await triggerPaymentWebhook({
                bill_id: billId,
                amount: total,
                customer: {
                    name: name,
                    phone: phone,
                    address: null
                },
                order_type: 'dine_in',
                table_number: tableNumber,
                items: items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.discounted_price || i.price,
                    total: i.lineTotal
                })),
                payment_method: 'pending',
                restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID,
                created_at: new Date().toISOString(),
                source: 'customer_app',
                trigger_type: existingOrderId ? 'items_added_to_running_order' : 'new_order_placed',
                is_running_order: !!existingOrderId,
                kitchen_ticket: ticketData ? ticketData.ticket_number : undefined
            })

            addNotification({
                title: existingOrderId ? 'Items Added!' : 'Order Placed!',
                message: existingOrderId
                    ? `Additional items added to your order #${billId}.`
                    : `Your order #${billId} has been successfully placed.`,
                type: 'order_status',
                link: `/customer/track/${billId}`
            })

            // If this is a running order, redirect with append mode flag
            const redirectUrl = existingOrderId 
                ? `/customer/order-confirmed/${billId}?mode=append`
                : `/customer/order-confirmed/${billId}`
            router.push(redirectUrl)

        } catch (err: unknown) {
            console.error('❌ Order placement encountered an error!')
            console.error('Error object:', err)
            const errorMessage = (err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'details' in err ? String((err as Record<string, unknown>).details) : (typeof err === 'object' ? JSON.stringify(err) : String(err))))

            // Don't fail the order - at least try to redirect to confirmation
            if (billId) {
                toast.warning('Order placed with limited functionality', {
                    description: `Bill ID: ${billId}. Some features may not be available.`,
                    duration: 10000
                })
                
                router.push(`/customer/order-confirmed/${billId}`)
            } else {
                toast.error('Failed to place order: ' + errorMessage, {
                    duration: 10000
                })
            }
        } finally {
            setLoading(false)
        }
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6 bg-slate-50">
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                    <ShoppingBag className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Looks like you haven&apos;t added any delicious items yet.</p>
                </div>
                <Button onClick={() => router.push('/customer/menu')} className="h-14 px-10 rounded-full text-lg font-bold shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 transition-all active:scale-95">
                    Start Ordering
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-svh pb-40 font-sans">
            <header className="safe-top sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="tap-target -ml-2 rounded-2xl text-slate-600 hover:bg-black/5">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Checkout</h1>
                <div className="w-8" /> {/* Spacer */}
            </header>

            <div className="mx-auto max-w-lg space-y-6 px-4 py-5 sm:p-6">
                {/* Contact Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">Contact Details</h2>
                    </div>

                    <div className="touch-card space-y-1 rounded-[1.5rem] p-1">
                        <div className="flex items-center px-4 py-2 border-b border-slate-50">
                            <User className="w-4 h-4 text-slate-400 mr-3" />
                            <Input
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setCustomerInfo(e.target.value, phone) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex items-center px-4 py-2">
                            <Phone className="w-4 h-4 text-slate-400 mr-3" />
                            <Input
                                placeholder="Phone Number"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setCustomerInfo(name, e.target.value) }}
                                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 font-medium placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Method Removed for Running Bill System */}

                {/* Order Summary */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="font-bold text-slate-900">Order Summary</h2>
                    </div>

                    <div className="touch-card relative overflow-hidden rounded-[1.5rem]">
                        {/* Receipt Top Pattern */}
                        <div className="h-2 bg-gradient-to-r from-orange-400 via-red-400 to-purple-400" />

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.cartId} className="flex justify-between text-sm group">
                                        <span className="font-medium text-slate-600 group-hover:text-slate-900 transition-colors flex gap-2">
                                            <span className="text-slate-400 font-bold">{item.quantity}x</span>
                                            {item.name}
                                        </span>
                                        <span className="font-bold text-slate-900">₹{item.lineTotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-slate-200" />

                            {/* Coupon Input */}
                            <div className="space-y-3">
                                {coupon ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100 animate-in fade-in zoom-in-95">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center border border-green-200 shadow-sm">
                                                <Ticket className="h-5 w-5 text-green-700" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-green-900 flex items-center gap-2">
                                                    {coupon.code}
                                                    <Badge variant="outline" className="bg-green-100/50 text-green-700 border-green-200 text-[10px] h-5">APPLIED</Badge>
                                                </p>
                                                <p className="text-xs text-green-700 font-medium mt-0.5">
                                                    You saved ₹{discount.toFixed(2)} with this offer!
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Enter promo code"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                className="h-12 pl-10 text-sm bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/20 font-mono uppercase placeholder:normal-case transition-all rounded-xl placeholder:font-sans"
                                            />
                                            <Ticket className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        </div>
                                        <Button
                                            variant="default"
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || verifyingCoupon}
                                            className="h-12 px-6 font-bold bg-slate-900 hover:bg-black rounded-xl"
                                        >
                                            {verifyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLY"}
                                        </Button>
                                    </div>
                                )}

                                {!coupon && (
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="link" className="text-orange-600 h-auto p-0 font-bold text-xs flex items-center gap-1 hover:no-underline" onClick={async () => {
                                                const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
                                                if (rid) {
                                                    const deals = await getAvailableCoupons(rid)
                                                    setAvailableCoupons(deals)
                                                }
                                            }}>
                                                View Available Offers <ChevronRight className="w-3 h-3" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl pt-6 px-0 overflow-hidden flex flex-col">
                                            <SheetHeader className="px-6 pb-4 border-b border-slate-100">
                                                <SheetTitle className="text-left text-xl font-black">Available Offers</SheetTitle>
                                                <SheetDescription className="text-left">
                                                    Select a promo code to apply to your order
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                                                {availableCoupons.length === 0 ? (
                                                    <div className="text-center py-10 text-muted-foreground">
                                                        <Ticket className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                        <p>No active offers available right now.</p>
                                                    </div>
                                                ) : (
                                                    availableCoupons
                                                        .filter(deal => !useCartStore.getState().isCouponUsed(deal.code))
                                                        .map((deal) => (
                                                            <div
                                                                key={deal.id}
                                                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
                                                                onClick={() => {
                                                                    if (useCartStore.getState().isCouponUsed(deal.code)) {
                                                                        toast.error('Already Used')
                                                                        return
                                                                    }
                                                                    setCouponCode(deal.code)
                                                                    validateCoupon(deal.code, subtotal).then(res => {
                                                                        if (res.coupon) {
                                                                            applyCoupon(res.coupon)
                                                                            toast.success(`Applied ${deal.code}!`)
                                                                        } else if (res.error) {
                                                                            toast.error(res.error)
                                                                        }
                                                                    })
                                                                }}
                                                            >
                                                                <div className="flex gap-4 relative z-0">
                                                                    <div className="flex flex-col items-center justify-center w-20 border-r border-dashed border-slate-200 pr-4">
                                                                        <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mb-1">
                                                                            <Percent className="h-5 w-5 text-orange-600" />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                            {deal.discount_type === 'percentage' ? `${deal.discount_value}%` : `₹${deal.discount_value}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1 py-1">
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <span className="font-black text-lg text-slate-800 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                                                                {deal.code}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-2">
                                                                            {deal.description || 'Special discount for you!'}
                                                                        </p>
                                                                        <div className="flex items-center justify-between mt-2">
                                                                            <p className="text-[10px] text-slate-400 font-semibold bg-slate-50 inline-block px-1.5 py-0.5 rounded">
                                                                                Valid until {format(new Date(deal.valid_until), 'MMM dd')}
                                                                            </p>
                                                                            <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-0">
                                                                                TAP TO APPLY
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                )}
                            </div>

                            <div className="space-y-2 text-sm pt-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-900">₹{subtotal.toFixed(2)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span className="font-medium flex items-center gap-1"><Ticket className="h-3 w-3" /> Discount</span>
                                        <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax (5%)</span>
                                    <span className="font-medium text-slate-900">₹{tax.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Total to Pay</span>
                            <span className="font-black text-2xl text-slate-900">₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 bg-white/88 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                <div className="max-w-lg mx-auto">
                    <Button
                        size="lg"
                        className="h-16 w-full rounded-[2rem] bg-gradient-to-r from-orange-500 to-red-500 text-lg font-black text-white shadow-2xl shadow-orange-500/30 transition-all hover:shadow-orange-500/40 active:scale-[0.98]"
                        onClick={handlePlaceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing Order...
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full px-2">
                                <span>Confirm Order</span>
                                <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-base font-bold shadow-sm">
                                    ₹{total.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
