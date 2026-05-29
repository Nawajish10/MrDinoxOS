export interface WhatsAppOrderDetails {
    billId: string
    tableNumber: string | null
    customerName: string
    customerPhone: string
    items: { name: string; quantity: number; total: number }[]
    grandTotal: number
}

export function generateWhatsAppMessage(details: WhatsAppOrderDetails): string {
    const { billId, tableNumber, customerName, customerPhone, items, grandTotal } = details

    let message = `Hi! I just placed an order.\n\n`
    message += `Order: #${billId}\n`

    if (tableNumber) {
        message += `Table: ${tableNumber}\n`
    }

    if (customerName) {
        message += `Name: ${customerName}\n`
    }

    if (customerPhone) {
        message += `Phone: ${customerPhone}\n`
    }

    message += `\nItems:\n`
    items.forEach((item) => {
        message += `- ${item.name} x${item.quantity} - Rs. ${item.total}\n`
    })

    message += `\nTotal: Rs. ${grandTotal}\n\n`
    message += `Please confirm my order!`

    return encodeURIComponent(message)
}

export function getWhatsAppUrl(whatsappNumber: string, encodedMessage: string): string {
    const cleanNumber = whatsappNumber.replace(/\D/g, '')
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`
}
