
"use client"

import { useState, useEffect } from "react"
import { Order } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useKitchenStore } from "@/store/kitchenStore"
import { Separator } from "@/components/ui/separator"
import { Check, ChefHat, Printer, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"

import { updateOrderItemStatus, updateTicketStatus } from "@/services/orderService"

interface OrderDetailsProps {
    order: Order | null
    onClose: () => void
}

export default function OrderDetails({ order: initialOrder, onClose }: OrderDetailsProps) {
    const { updateOrder, updateTicketOptimistic, updateItemOptimistic, orders } = useKitchenStore()
    const [localOrder, setLocalOrder] = useState<Order | null>(initialOrder)
    const [isUpdating, setIsUpdating] = useState(false)

    // Sync with kitchen store - update local localOrder when store updates
    useEffect(() => {
        if (initialOrder) {
            const updatedOrder = orders.find(o => o.id === initialOrder.id)
            if (updatedOrder) {
                setLocalOrder(updatedOrder)
                console.log('📡 [KITCHEN MODAL] Order updated from store', updatedOrder)
            }
        }
    }, [orders, initialOrder])

    // Initial sync
    useEffect(() => {
        setLocalOrder(initialOrder)
    }, [initialOrder])

    if (!localOrder) return null

    const unservedItems = (localOrder.order_items || []).filter(item => item.status !== 'served' && item.status !== 'completed')

    const handleStatusChange = async (status: Order["status"]) => {
        if (isUpdating) return;
        setIsUpdating(true);

        try {
            // If original_order_id exists, this is a mock order representing a ticket
            if ((localOrder as any).original_order_id) {
                // Optimistically update UI instantly!
                updateTicketOptimistic(localOrder.id, { status })
                
                // Then fire background DB request
                await updateTicketStatus(localOrder.id, status)
            } else {
                updateOrder(localOrder.id, { status })
            }
            console.log(`🔄 [KITCHEN] Ticket/Order status changed to ${status} - items remain unchanged`)
            onClose()
        } catch (e) {
            console.error("Failed to update status", e)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleItemStatusChange = async (itemId: string, newStatus: string) => {
        if (isUpdating) return;
        setIsUpdating(true);

        try {
            console.log(`🔄 [KITCHEN] Changing item ${itemId} to ${newStatus}`)
            
            // Optimistically update local state immediately so the buttons change instantly
            setLocalOrder(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    order_items: prev.order_items?.map(item =>
                        item.id === itemId ? { ...item, status: newStatus as any } : item
                    )
                }
            })

            // Optimistically update the global store
            const actualOrderId = (localOrder as any).original_order_id || localOrder.id;
            updateItemOptimistic(actualOrderId, itemId, newStatus)
            
            // Fire backend update
            await updateOrderItemStatus(itemId, newStatus)
        } catch (e) {
            console.error(`❌ [KITCHEN] Failed to update item ${itemId} status`, e)
        } finally {
            setIsUpdating(false)
        }
    }

    const printKOT = () => {
        const printContent = `
      <html>
      <head>
        <title>KOT - ${localOrder.bill_id}</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
          .item { margin: 5px 0; display: flex; align-items: flex-start; }
          .qty { font-weight: bold; width: 30px; }
          .name { flex: 1; }
          .instructions { font-style: italic; font-size: 11px; margin-left: 30px; }
          .footer { margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>KITCHEN ORDER</h3>
          <p>#${localOrder.bill_id}</p>
          <p>${new Date().toLocaleString()}</p>
          <p>${localOrder.order_type.toUpperCase()} - Table ${localOrder.restaurant_tables?.table_number || 'N/A'}</p>
        </div>
        <div class="items">
          ${unservedItems.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}x</span>
              <span class="name">${item.item_name}</span>
            </div>
            ${item.special_instructions ? `<div class="instructions">Note: ${item.special_instructions}</div>` : ''}
          `).join('')}
        </div>
        ${localOrder.special_instructions ? `<div class="footer"><strong>Note:</strong> ${localOrder.special_instructions}</div>` : ''}
      </body>
      </html>
    `
        const win = window.open('', '', 'width=300,height=600')
        if (win) {
            win.document.write(printContent)
            win.document.close()
            win.print()
        }
    }

    return (
        <Dialog open={!!localOrder} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-none shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <span>Order #{localOrder.bill_id}</span>
                            <Badge>{localOrder.status}</Badge>
                        </DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={printKOT}>
                                <Printer className="mr-2 h-4 w-4" /> Print KOT
                            </Button>
                        </div>
                    </div>
                    <p className="flex items-center gap-4 text-sm mt-1 text-slate-600 font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {format(new Date(localOrder.created_at.includes('Z') || localOrder.created_at.includes('+') ? localOrder.created_at : localOrder.created_at + 'Z'), "h:mm a")}</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">Table {localOrder.restaurant_tables?.table_number || 'N/A'}</span>
                        <span className="uppercase font-extrabold tracking-wide text-primary">{localOrder.order_type.replace('_', ' ')}</span>
                    </p>
                </DialogHeader>

                <Separator />

                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Order Items</h3>
                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
                            ✓ Tick items as you prepare them
                        </p>
                    </div>
                    <div className="space-y-3">
                        {unservedItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex flex-col gap-3 p-4 rounded-xl border transition-all shadow-sm ${item.status === 'ready'
                                    ? 'border-green-300 bg-green-50/50'
                                    : item.status === 'preparing'
                                    ? 'border-orange-300 bg-orange-50/50'
                                    : item.status === 'served'
                                    ? 'border-blue-300 bg-blue-50/50 opacity-60'
                                    : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`font-bold text-lg leading-none ${item.status === 'served' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                <span className="font-extrabold text-primary mr-2">{item.quantity}x</span>
                                                {item.item_name}
                                            </h4>
                                            {(() => {
                                                if (!item.created_at) return null

                                                const now = new Date()
                                                const itemCreated = new Date(item.created_at.includes('Z') || item.created_at.includes('+') ? item.created_at : item.created_at + 'Z')
                                                const diffMinutes = Math.floor((now.getTime() - itemCreated.getTime()) / (1000 * 60))
                                                const isNew = diffMinutes < 5

                                                return isNew ? (
                                                    <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                                                        NEW
                                                    </span>
                                                ) : null
                                            })()}
                                        </div>
                                        {item.special_instructions && (
                                            <p className={`italic text-sm mt-1.5 ${item.status === 'served' ? 'text-slate-400 line-through' : 'text-amber-600'}`}>
                                                Note: {item.special_instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Item Status Controls */}
                                <div className="flex gap-2 mt-2">
                                    <Button 
                                        size="sm" 
                                        variant={item.status === 'pending' ? 'default' : 'outline'}
                                        className={item.status === 'pending' ? 'bg-slate-600 hover:bg-slate-700' : ''}
                                        onClick={() => handleItemStatusChange(item.id, 'pending')}
                                        disabled={isUpdating}
                                    >
                                        Queue
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant={item.status === 'preparing' ? 'default' : 'outline'}
                                        className={item.status === 'preparing' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                                        onClick={() => handleItemStatusChange(item.id, 'preparing')}
                                        disabled={isUpdating}
                                    >
                                        Prep
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant={item.status === 'ready' ? 'default' : 'outline'}
                                        className={item.status === 'ready' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                                        onClick={() => handleItemStatusChange(item.id, 'ready')}
                                        disabled={isUpdating}
                                    >
                                        Ready
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant={item.status === 'served' ? 'default' : 'outline'}
                                        className={item.status === 'served' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                                        onClick={() => handleItemStatusChange(item.id, 'served')}
                                        disabled={isUpdating}
                                    >
                                        Serve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {localOrder.special_instructions && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                            <h4 className="font-bold flex items-center gap-2">
                                <span className="text-xl">⚠️</span> Special Instructions
                            </h4>
                            <p className="mt-1">{localOrder.special_instructions}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
