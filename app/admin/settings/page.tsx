'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Store, Clock, DollarSign, Phone, Mail, MapPin, Smartphone, Utensils } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Restaurant } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardStatsSkeleton } from '@/components/ui/skeleton-loaders'

export default function SettingsPage() {
    const queryClient = useQueryClient()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        tagline: '',
        phone: '',
        whatsapp_number: '',
        email: '',
        address: '',
        city: '',
        tax_percentage: '',
        delivery_charge: '',
        min_order_amount: '',
        avg_preparation_time: '',
        opening_time: '',
        closing_time: '',
        upi_id: '',
    })
    const [dietaryType, setDietaryType] = useState('both')

    const { data: restaurant, isLoading } = useQuery<Restaurant | null>({
        queryKey: ['restaurant-settings', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/settings?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return data.restaurant || null
            }
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', RESTAURANT_ID)
                .single()
            if (error) throw error
            return data
        },
        staleTime: 1000 * 60 * 10, // 10 minutes fresh
    })

    useEffect(() => {
        if (restaurant) {
            setForm({
                name: restaurant.name || '',
                tagline: restaurant.tagline || '',
                phone: restaurant.phone || '',
                whatsapp_number: restaurant.whatsapp_number || '',
                email: restaurant.email || '',
                address: restaurant.address || '',
                city: restaurant.city || '',
                tax_percentage: restaurant.tax_percentage?.toString() || '',
                delivery_charge: restaurant.delivery_charge?.toString() || '',
                min_order_amount: restaurant.min_order_amount?.toString() || '',
                avg_preparation_time: restaurant.avg_preparation_time?.toString() || '',
                opening_time: restaurant.opening_time || '',
                closing_time: restaurant.closing_time || '',
                upi_id: restaurant.upi_id || '',
            })
        }
        const storedDietary = localStorage.getItem('restaurant_dietary_type')
        if (storedDietary) setDietaryType(storedDietary)
    }, [restaurant])

    async function handleSaveSettings() {
        try {
            if (!form.name || !form.phone) {
                toast.error('Restaurant Name and Phone are required')
                return
            }

            setSaving(true)
            const payload = {
                id: RESTAURANT_ID,
                name: form.name,
                tagline: form.tagline,
                phone: form.phone,
                whatsapp_number: form.whatsapp_number,
                email: form.email,
                address: form.address,
                city: form.city,
                tax_percentage: form.tax_percentage ? parseFloat(form.tax_percentage) : 0,
                delivery_charge: form.delivery_charge ? parseFloat(form.delivery_charge) : 0,
                min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
                avg_preparation_time: form.avg_preparation_time ? parseInt(form.avg_preparation_time) : 25,
                opening_time: form.opening_time,
                closing_time: form.closing_time,
                upi_id: form.upi_id,
            }

            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to update settings')

            localStorage.setItem('restaurant_dietary_type', dietaryType)
            queryClient.invalidateQueries({ queryKey: ['restaurant-settings', RESTAURANT_ID] })
            toast.success('Restaurant profile and preferences saved successfully')
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Restaurant Settings"
                description="Configure your business profile, operating hours, taxes, delivery fees, and UPI payouts."
            >
                <Button
                    onClick={handleSaveSettings}
                    disabled={saving || isLoading}
                    className="bg-[#FF6B00] hover:bg-[#e66000] text-white gap-2 font-bold rounded-xl"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </PageHeader>

            {isLoading ? (
                <DashboardStatsSkeleton />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* General Profile */}
                    <Card className="bg-white border-gray-100 shadow-xs rounded-2xl">
                        <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B00]">
                                <Store className="w-4 h-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-[#111827]">Business Profile</CardTitle>
                                <CardDescription className="text-xs">Restaurant identity and branding</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Restaurant Name *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Tagline / Slogan</Label>
                                <Input
                                    value={form.tagline}
                                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                                    placeholder="e.g. Authentic Taste, Fast Delivery"
                                    className="bg-gray-50 border-gray-200 rounded-xl"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">Phone *</Label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">WhatsApp</Label>
                                    <Input
                                        value={form.whatsapp_number}
                                        onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Email Address</Label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Full Address</Label>
                                <Textarea
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl min-h-[60px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational & Financial Settings */}
                    <Card className="bg-white border-gray-100 shadow-xs rounded-2xl">
                        <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-[#111827]">Pricing & Payouts</CardTitle>
                                <CardDescription className="text-xs">Taxes, minimum spend, and UPI IDs</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">GST / Tax (%)</Label>
                                    <Input
                                        type="number"
                                        value={form.tax_percentage}
                                        onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                                        placeholder="e.g. 5"
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">Delivery Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        value={form.delivery_charge}
                                        onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })}
                                        placeholder="e.g. 30"
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Merchant UPI ID (For QR Orders)</Label>
                                <Input
                                    value={form.upi_id}
                                    onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                                    placeholder="e.g. merchant@icici"
                                    className="bg-gray-50 border-gray-200 font-mono rounded-xl text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">Opening Time</Label>
                                    <Input
                                        type="time"
                                        value={form.opening_time}
                                        onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-700">Closing Time</Label>
                                    <Input
                                        type="time"
                                        value={form.closing_time}
                                        onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                                        className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
