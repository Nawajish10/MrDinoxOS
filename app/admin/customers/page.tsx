'use client'

import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Plus, Phone, Mail, MapPin, ShoppingBag, Wallet, User, Edit, Trash2 } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Customer } from '@/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OrdersTableSkeleton } from '@/components/ui/skeleton-loaders'

export default function CustomersPage() {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    })
    const [saving, setSaving] = useState(false)

    const { data: customers = [], isLoading } = useQuery<Customer[]>({
        queryKey: ['restaurant-customers', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/customers?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return data.customers || []
            }
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as Customer[]
        },
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })

    useEffect(() => {
        const ch = supabase.channel('customers-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
                queryClient.invalidateQueries({ queryKey: ['restaurant-customers', RESTAURANT_ID] })
            })
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [queryClient])

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers
        const term = searchTerm.toLowerCase()
        return customers.filter((c) =>
            c.name?.toLowerCase().includes(term) ||
            c.phone?.includes(term) ||
            c.email?.toLowerCase().includes(term)
        )
    }, [customers, searchTerm])

    async function handleSaveCustomer() {
        try {
            if (!customerForm.phone) {
                toast.error('Customer phone number is required')
                return
            }

            setSaving(true)
            const customerPayload = {
                restaurant_id: RESTAURANT_ID,
                name: customerForm.name || null,
                phone: customerForm.phone,
                email: customerForm.email || null,
                address: customerForm.address || null,
            }

            if (editingCustomer) {
                const res = await fetch('/api/customers', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingCustomer.id, ...customerPayload })
                })
                if (!res.ok) throw new Error('Failed to update customer')
                toast.success('Customer updated successfully')
            } else {
                const res = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerPayload)
                })
                if (!res.ok) throw new Error('Failed to add customer')
                toast.success('Customer added successfully')
            }

            queryClient.invalidateQueries({ queryKey: ['restaurant-customers', RESTAURANT_ID] })
            setDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error('Error saving customer:', error)
            toast.error('Failed to save customer')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteCustomer(id: string) {
        if (!confirm('Are you sure you want to remove this customer record?')) return

        try {
            const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete customer')
            toast.success('Customer removed successfully')
            queryClient.invalidateQueries({ queryKey: ['restaurant-customers', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error deleting customer:', error)
            toast.error('Failed to delete customer')
        }
    }

    function resetForm() {
        setCustomerForm({ name: '', phone: '', email: '', address: '' })
        setEditingCustomer(null)
    }

    function handleEditCustomer(customer: Customer) {
        setEditingCustomer(customer)
        setCustomerForm({
            name: customer.name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
        })
        setDialogOpen(true)
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Customer Management"
                description="Manage your guest directory, order frequency, and contact preferences."
            >
                <Button
                    onClick={() => { resetForm(); setDialogOpen(true) }}
                    className="bg-[#FF6B00] hover:bg-[#e66000] text-white gap-2 font-bold rounded-xl"
                >
                    <Plus className="w-4 h-4" />
                    Add Customer
                </Button>
            </PageHeader>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div className="relative flex-1 sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by customer name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-50 border-gray-200 text-xs rounded-xl"
                    />
                </div>
                <span className="text-xs font-bold text-gray-500">
                    Total: {customers.length} Guests
                </span>
            </div>

            {/* Customers Feed */}
            {isLoading ? (
                <OrdersTableSkeleton />
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <User className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-bold text-base text-[#111827]">No customers found</h3>
                    <p className="text-xs text-gray-500">Try adjusting your search criteria or add your first customer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="bg-white border-gray-100 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF6B00] font-extrabold flex items-center justify-center text-sm">
                                            {customer.name?.charAt(0).toUpperCase() || 'G'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-[#111827]">{customer.name || 'Walk-in Guest'}</h3>
                                            <p className="text-xs text-gray-400">{customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditCustomer(customer)}
                                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-[#FF6B00]"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-xl grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400 flex items-center gap-1">
                                            <ShoppingBag className="w-3 h-3" /> Orders
                                        </span>
                                        <p className="font-extrabold text-[#111827] mt-0.5">{customer.total_orders || 0} orders</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 flex items-center gap-1">
                                            <Wallet className="w-3 h-3" /> Total Spent
                                        </span>
                                        <p className="font-extrabold text-[#FF6B00] mt-0.5">₹{(customer.total_spent || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                {customer.address && (
                                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="line-clamp-1">{customer.address}</span>
                                    </div>
                                )}
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
                            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Enter guest details to manage loyalty and communication.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Full Name</Label>
                            <Input
                                placeholder="e.g. John Doe"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Phone Number *</Label>
                            <Input
                                placeholder="e.g. +91 9876543210"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Email Address</Label>
                            <Input
                                type="email"
                                placeholder="e.g. guest@example.com"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Delivery Address</Label>
                            <Input
                                placeholder="e.g. 123 Main St, Apartment 4B"
                                value={customerForm.address}
                                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCustomer}
                            disabled={saving}
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold rounded-xl"
                        >
                            {saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
