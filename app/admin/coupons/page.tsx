'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Percent, DollarSign, Calendar, TrendingUp, Edit, Trash2, Copy, Tag, Clock } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Coupon } from '@/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TablesGridSkeleton } from '@/components/ui/skeleton-loaders'

export default function CouponsPage() {
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
    const [couponForm, setCouponForm] = useState({
        code: '',
        description: '',
        discount_type: 'percentage' as 'percentage' | 'fixed',
        discount_value: '',
        min_order_amount: '',
        max_discount: '',
        usage_limit: '',
        valid_from: '',
        valid_until: '',
    })
    const [saving, setSaving] = useState(false)

    const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
        queryKey: ['restaurant-coupons', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/coupons?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return data.coupons || []
            }
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })

    async function handleSaveCoupon() {
        try {
            if (!couponForm.code || !couponForm.discount_value || !couponForm.valid_until) {
                toast.error('Please fill all required fields')
                return
            }

            setSaving(true)
            const couponData = {
                restaurant_id: RESTAURANT_ID,
                code: couponForm.code.toUpperCase(),
                description: couponForm.description || null,
                discount_type: couponForm.discount_type,
                discount_value: parseFloat(couponForm.discount_value),
                min_order_amount: parseFloat(couponForm.min_order_amount) || 0,
                max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
                usage_limit: parseInt(couponForm.usage_limit) || 0,
                valid_from: couponForm.valid_from || new Date().toISOString(),
                valid_until: new Date(couponForm.valid_until).toISOString(),
                is_active: true,
            }

            if (editingCoupon) {
                const res = await fetch('/api/coupons', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingCoupon.id, ...couponData })
                })
                if (!res.ok) throw new Error('Failed to update coupon')
                toast.success('Coupon updated successfully')
            } else {
                const res = await fetch('/api/coupons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(couponData)
                })
                if (!res.ok) throw new Error('Failed to create coupon')
                toast.success('Coupon created successfully')
            }

            queryClient.invalidateQueries({ queryKey: ['restaurant-coupons', RESTAURANT_ID] })
            setDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error('Error saving coupon:', error)
            toast.error('Failed to save coupon')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteCoupon(id: string) {
        if (!confirm('Are you sure you want to delete this coupon?')) return

        try {
            const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete coupon')
            toast.success('Coupon deleted successfully')
            queryClient.invalidateQueries({ queryKey: ['restaurant-coupons', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error deleting coupon:', error)
            toast.error('Failed to delete coupon')
        }
    }

    async function toggleCouponStatus(coupon: Coupon) {
        try {
            const res = await fetch('/api/coupons', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active })
            })
            if (!res.ok) throw new Error('Failed to update status')
            toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`)
            queryClient.invalidateQueries({ queryKey: ['restaurant-coupons', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error toggling coupon status:', error)
            toast.error('Failed to update status')
        }
    }

    function resetForm() {
        setCouponForm({
            code: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            min_order_amount: '',
            max_discount: '',
            usage_limit: '',
            valid_from: '',
            valid_until: '',
        })
        setEditingCoupon(null)
    }

    function handleEditCoupon(coupon: Coupon) {
        setEditingCoupon(coupon)
        setCouponForm({
            code: coupon.code,
            description: coupon.description || '',
            discount_type: coupon.discount_type as 'percentage' | 'fixed',
            discount_value: coupon.discount_value.toString(),
            min_order_amount: coupon.min_order_amount?.toString() || '',
            max_discount: coupon.max_discount?.toString() || '',
            usage_limit: coupon.usage_limit?.toString() || '',
            valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
            valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
        })
        setDialogOpen(true)
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Coupons & Discounts"
                description="Create promo codes, manage customer discounts, and track usage rates."
            >
                <Button
                    onClick={() => { resetForm(); setDialogOpen(true) }}
                    className="bg-[#FF6B00] hover:bg-[#e66000] text-white gap-2 font-bold rounded-xl"
                >
                    <Plus className="w-4 h-4" />
                    Create Coupon
                </Button>
            </PageHeader>

            {/* Coupons Feed */}
            {isLoading ? (
                <TablesGridSkeleton />
            ) : coupons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-bold text-base text-[#111827]">No coupons created yet</h3>
                    <p className="text-xs text-gray-500">Create promotional discount codes for your customers to increase average order value.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((coupon) => (
                        <Card key={coupon.id} className="bg-white border-gray-100 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-black text-[#FF6B00] px-2.5 py-1 bg-orange-50 rounded-lg border border-orange-200/60">
                                                {coupon.code}
                                            </span>
                                            <Badge className={coupon.is_active ? 'bg-emerald-50 text-emerald-700 border-0 text-[10px] font-bold uppercase' : 'bg-gray-100 text-gray-500 border-0 text-[10px] font-bold uppercase'}>
                                                {coupon.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        {coupon.description && (
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-1">{coupon.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditCoupon(coupon)}
                                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-[#FF6B00]"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteCoupon(coupon.id)}
                                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400">Discount Value</span>
                                        <p className="font-extrabold text-[#111827] text-sm mt-0.5">
                                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Min. Order</span>
                                        <p className="font-extrabold text-[#111827] text-sm mt-0.5">
                                            {coupon.min_order_amount ? `₹${coupon.min_order_amount}` : 'None'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        Expires: {format(new Date(coupon.valid_until), 'dd MMM yyyy')}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleCouponStatus(coupon)}
                                        className="h-7 text-[11px] rounded-lg bg-white"
                                    >
                                        {coupon.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">
                            {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Set up discount percentages, minimum cart value, and expiration dates.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Coupon Code *</Label>
                            <Input
                                placeholder="e.g. FESTIVE20"
                                value={couponForm.code}
                                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                                className="bg-gray-50 border-gray-200 font-mono uppercase rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Description</Label>
                            <Input
                                placeholder="e.g. 20% off on all orders above ₹499"
                                value={couponForm.description}
                                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Discount Type</Label>
                                <Select
                                    value={couponForm.discount_type}
                                    onValueChange={(val: any) => setCouponForm({ ...couponForm, discount_type: val })}
                                >
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Discount Value *</Label>
                                <Input
                                    type="number"
                                    placeholder={couponForm.discount_type === 'percentage' ? '20' : '100'}
                                    value={couponForm.discount_value}
                                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Min. Order Amount (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 299"
                                    value={couponForm.min_order_amount}
                                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Valid Until *</Label>
                                <Input
                                    type="date"
                                    value={couponForm.valid_until}
                                    onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCoupon}
                            disabled={saving}
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold rounded-xl"
                        >
                            {saving ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
