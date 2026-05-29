
"use client"

import { useKitchenStore } from '@/store/kitchenStore'
import OrderColumn from '@/components/kitchen/OrderColumn'
import OrderDetails from '@/components/kitchen/OrderDetails'

export default function KitchenPage() {
    const orders = useKitchenStore((state) => state.orders)
    const orderTypeFilter = useKitchenStore((state) => state.orderTypeFilter)
    const selectedOrder = useKitchenStore((state) => state.selectedOrder)
    const setSelectedOrder = useKitchenStore((state) => state.setSelectedOrder)

    // Flatten orders into kitchen tickets represented as Mock Orders
    const ticketsAsOrders = orders.flatMap((order: any) => {
        if (!order.kitchen_tickets || order.kitchen_tickets.length === 0) {
            // Fallback for orders without tickets (e.g. older orders before this feature)
            return [order];
        }

        return order.kitchen_tickets.map((ticket: any) => {
            // Filter items that belong to this ticket
            const ticketItems = order.order_items?.filter((item: any) => item.ticket_id === ticket.id) || [];
            
            return {
                ...order,
                id: ticket.id, // Set ID to ticket ID for updates
                original_order_id: order.id,
                bill_id: `${order.bill_id} (${ticket.ticket_number})`,
                status: ticket.status,
                order_items: ticketItems,
                created_at: ticket.created_at
            }
        });
    });

    // Computed data - Only show active tickets
    const newOrders = ticketsAsOrders.filter((o: any) =>
        (o.status === 'pending' || o.status === 'confirmed') &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter) &&
        o.order_items?.length > 0
    )

    const preparingOrders = ticketsAsOrders.filter((o: any) =>
        o.status === 'preparing' &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter) &&
        o.order_items?.length > 0
    )

    const readyOrders = ticketsAsOrders.filter((o: any) =>
        o.status === 'ready' &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter) &&
        o.order_items?.length > 0
    )

    return (
        <div className="momentum-scroll flex h-full min-h-0 w-full gap-4 overflow-x-auto p-3 sm:p-4 lg:p-6">
            <div className="flex min-h-0 min-w-[86vw] flex-1 flex-col sm:min-w-[360px] lg:max-w-[470px]">
                <OrderColumn
                    title="New Orders"
                    orders={newOrders}
                    emptyMessage="No new orders"
                    columnType="new"
                />
            </div>
            <div className="flex min-h-0 min-w-[86vw] flex-1 flex-col sm:min-w-[360px] lg:max-w-[470px]">
                <OrderColumn
                    title="Preparing"
                    orders={preparingOrders}
                    emptyMessage="No orders being prepared"
                    columnType="preparing"
                />
            </div>
            <div className="flex min-h-0 min-w-[86vw] flex-1 flex-col sm:min-w-[360px] lg:max-w-[470px]">
                <OrderColumn
                    title="Ready"
                    orders={readyOrders}
                    emptyMessage="No orders ready"
                    columnType="ready"
                />
            </div>

            <OrderDetails
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />
        </div>
    )
}
