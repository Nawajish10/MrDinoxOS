export async function triggerPaymentWebhook(payload: Record<string, unknown>) {
    try {
        console.log('🚀 Triggering Webhook (Proxy):', payload)
        // Webhook intentionally disabled temporarily as per user request
        // Use internal API proxy to avoid CORS
        /*
        await fetch('/api/webhook/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        */
        console.log('✅ Webhook logic completed (Proxy disabled)')
    } catch (e) {
        console.error('❌ Webhook failed:', e)
        // Don't block UI if webhook fails
    }
}
