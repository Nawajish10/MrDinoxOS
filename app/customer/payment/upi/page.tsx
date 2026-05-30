'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useRestaurant } from '@/hooks/useRestaurant'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function UPIPaymentContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const billId = searchParams.get('billId')
    const amountParam = searchParams.get('amount')
    const amount = parseFloat(amountParam || '0')

    const { restaurant } = useRestaurant()
    const [upiUrl, setUpiUrl] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // 1. Generate UPI URI
    useEffect(() => {
        if (restaurant?.upi_id && amount > 0) {
            const url = `upi://pay?pa=${restaurant.upi_id}&pn=${encodeURIComponent(restaurant.name)}&am=${amount}&tr=${billId}&tn=${encodeURIComponent(`Payment for Bill ${billId}`)}&cu=INR`
            setUpiUrl(url)
        }
    }, [restaurant, amount, billId])

    // 2. Real-time listener for Payment Status changes (Verified by Gateway)
    useEffect(() => {
        if (!billId) return

        const channel = supabase
            .channel(`payment-status-${billId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `bill_id=eq.${billId}`,
                },
                (payload: any) => {
                    if (payload.new && payload.new.payment_status === 'paid') {
                        console.log('✅ [UI] Payment verified by backend!')
                        setIsSuccess(true)
                        toast.success('Payment Verified Successfully!')
                        setTimeout(() => {
                            router.replace(`/customer/track/${billId}`)
                        }, 2000)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [billId, router])

    const copyUpiId = () => {
        if (restaurant?.upi_id) {
            navigator.clipboard.writeText(restaurant.upi_id)
            toast.success('UPI ID copied to clipboard')
        }
    }

    // 3. Simulated Gateway Webhook Trigger
    const simulateGatewayVerification = async () => {
        setIsVerifying(true)
        try {
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billId,
                    transactionId: `TXN${Date.now()}`,
                    status: 'SUCCESS'
                })
            })

            if (!res.ok) throw new Error('Verification failed')
            
            // The real-time listener will pick up the DB change and transition the UI.
            toast.loading('Waiting for gateway confirmation...')
        } catch (err) {
            console.error('Simulation error:', err)
            toast.error('Simulation failed.')
            setIsVerifying(false)
        }
    }

    if (!billId || !amount) return <div>Invalid Payment Details</div>

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-green-50 text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce duration-1000">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h1 className="text-3xl font-black text-green-900">Payment Successful</h1>
                <p className="text-green-700 font-medium text-lg">Redirecting to your order...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-primary/10 to-background text-center space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Scan to Pay</h1>
                <p className="text-muted-foreground">Using any UPI App (GPay, PhonePe, Paytm)</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border">
                {upiUrl ? (
                    <QRCodeSVG value={upiUrl} size={200} level="H" includeMargin />
                ) : (
                    <div className="w-[200px] h-[200px] bg-secondary flex items-center justify-center animate-pulse">
                        Loading QR...
                    </div>
                )}
                <div className="mt-4 font-bold text-2xl">₹{amount.toFixed(2)}</div>
            </div>

            <div className="w-full max-w-xs space-y-4">
                {restaurant?.upi_id && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                        <span className="font-medium text-sm truncate">{restaurant.upi_id}</span>
                        <Button variant="ghost" size="sm" onClick={copyUpiId}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {upiUrl && (
                    <Button
                        asChild
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 rounded-xl mb-4"
                    >
                        <a href={upiUrl}>
                            Pay with UPI App / GPay
                        </a>
                    </Button>
                )}

                <Button 
                    className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700" 
                    onClick={simulateGatewayVerification}
                    disabled={isVerifying}
                >
                    <ShieldCheck className="mr-2 w-5 h-5" />
                    {isVerifying ? 'Verifying...' : 'Simulate Backend Verification'}
                </Button>
                
                <Button variant="outline" className="w-full text-slate-500" onClick={() => router.replace(`/customer/track/${billId}`)}>
                    Pay Cash at Counter Instead
                </Button>
            </div>
        </div>
    )
}

export default function UPIPaymentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Payment...</div>}>
            <UPIPaymentContent />
        </Suspense>
    )
}
