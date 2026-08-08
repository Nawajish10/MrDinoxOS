'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, QrCode, Users, Edit, Trash2, Download, Armchair, Zap } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { RestaurantTable } from '@/types'
import { toast } from 'sonner'
import { generateTableMenuQR } from '@/lib/qr-generator'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TablesGridSkeleton } from '@/components/ui/skeleton-loaders'
import Image from 'next/image'

export default function TablesPage() {
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
    const [tableQRCodes, setTableQRCodes] = useState<Record<string, string>>({})
    const [tableForm, setTableForm] = useState({
        table_number: '',
        table_name: '',
        capacity: '',
        status: 'available' as 'available' | 'occupied' | 'reserved',
    })
    const [saving, setSaving] = useState(false)

    const { data: tables = [], isLoading } = useQuery<RestaurantTable[]>({
        queryKey: ['restaurant-tables', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/tables?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return data.tables || []
            }
            const { data, error } = await supabase
                .from('restaurant_tables')
                .select('id, restaurant_id, table_number, table_name, capacity, status, is_active')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('table_number')
            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })

    useEffect(() => {
        const ch = supabase.channel('tables-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                queryClient.invalidateQueries({ queryKey: ['restaurant-tables', RESTAURANT_ID] })
            })
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [queryClient])

    // Memoized QR code generation
    useEffect(() => {
        if (!tables.length) return
        let isMounted = true

        const generateQRs = async () => {
            const codes: Record<string, string> = {}
            for (const table of tables) {
                if (!tableQRCodes[table.id]) {
                    try {
                        codes[table.id] = await generateTableMenuQR(RESTAURANT_ID, table.id)
                    } catch (err) {
                        console.error('QR generation error:', err)
                    }
                }
            }
            if (isMounted && Object.keys(codes).length > 0) {
                setTableQRCodes(prev => ({ ...prev, ...codes }))
            }
        }

        generateQRs()
        return () => { isMounted = false }
    }, [tables, tableQRCodes])

    async function handleSaveTable() {
        try {
            if (!tableForm.table_number || !tableForm.table_name || !tableForm.capacity) {
                toast.error('Please fill all required fields')
                return
            }

            setSaving(true)
            const tableData = {
                restaurant_id: RESTAURANT_ID,
                table_number: Number(tableForm.table_number),
                table_name: tableForm.table_name,
                capacity: Number(tableForm.capacity),
                status: tableForm.status,
            }

            if (editingTable) {
                const res = await fetch('/api/tables', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingTable.id, ...tableData })
                })
                if (!res.ok) throw new Error('Failed to update table')
                toast.success('Table updated successfully')
            } else {
                const res = await fetch('/api/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tableData)
                })
                if (!res.ok) throw new Error('Failed to create table')
                toast.success('Table created successfully')
            }

            queryClient.invalidateQueries({ queryKey: ['restaurant-tables', RESTAURANT_ID] })
            setDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error('Error saving table:', error)
            toast.error('Failed to save table')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteTable(id: string) {
        if (!confirm('Are you sure you want to delete this table?')) return

        try {
            const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete table')
            toast.success('Table deleted successfully')
            queryClient.invalidateQueries({ queryKey: ['restaurant-tables', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error deleting table:', error)
            toast.error('Failed to delete table')
        }
    }

    function resetForm() {
        setTableForm({
            table_number: '',
            table_name: '',
            capacity: '',
            status: 'available',
        })
        setEditingTable(null)
    }

    function handleEditTable(table: RestaurantTable) {
        setEditingTable(table)
        setTableForm({
            table_number: String(table.table_number),
            table_name: table.table_name,
            capacity: String(table.capacity),
            status: table.status,
        })
        setDialogOpen(true)
    }

    function downloadQR(table: RestaurantTable) {
        const qrUrl = tableQRCodes[table.id]
        if (!qrUrl) return
        const a = document.createElement('a')
        a.href = qrUrl
        a.download = `table-${table.table_number}-qr.png`
        a.click()
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Tables & QR Management"
                description="Manage your restaurant dining tables and download instant order QR codes."
            >
                <Button
                    onClick={() => { resetForm(); setDialogOpen(true) }}
                    className="bg-[#FF6B00] hover:bg-[#e66000] text-white gap-2 font-bold rounded-xl"
                >
                    <Plus className="w-4 h-4" />
                    Add Table
                </Button>
            </PageHeader>

            {isLoading ? (
                <TablesGridSkeleton />
            ) : tables.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <Armchair className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-bold text-base text-[#111827]">No tables created yet</h3>
                    <p className="text-xs text-gray-500">Create tables to generate table QR codes for customer ordering.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tables.map((table) => (
                        <Card key={table.id} className="bg-white border-gray-100 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-gray-400">Table #{table.table_number}</span>
                                    <CardTitle className="text-base font-bold text-[#111827] mt-0.5">{table.table_name}</CardTitle>
                                </div>
                                <Badge className={table.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-0' : 'bg-orange-50 text-[#FF6B00] border-0'}>
                                    {table.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span>Capacity: <strong className="text-[#111827]">{table.capacity} Guests</strong></span>
                                    </div>
                                </div>

                                {/* QR Code Presentation */}
                                <div className="bg-gray-50 p-4 rounded-xl flex flex-col items-center justify-center gap-2">
                                    {tableQRCodes[table.id] ? (
                                        <Image
                                            src={tableQRCodes[table.id]}
                                            alt={`Table ${table.table_number} QR`}
                                            width={140}
                                            height={140}
                                            className="w-32 h-32 rounded-lg bg-white p-2 shadow-xs"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 bg-gray-200 animate-pulse rounded-lg" />
                                    )}
                                    <span className="text-[10px] text-gray-400">Scan to view menu & order</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadQR(table)}
                                        className="flex-1 text-xs gap-1.5 rounded-xl bg-white"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        QR
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditTable(table)}
                                        className="text-xs rounded-xl"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteTable(table.id)}
                                        className="text-xs text-red-500 hover:text-red-600 rounded-xl"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">
                            {editingTable ? 'Edit Table' : 'Add New Table'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Configure table number, display name, and seat capacity.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Table Number *</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 1"
                                value={tableForm.table_number}
                                onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Table Name / Zone *</Label>
                            <Input
                                placeholder="e.g. Window Booth 1"
                                value={tableForm.table_name}
                                onChange={(e) => setTableForm({ ...tableForm, table_name: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Capacity (Seats) *</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 4"
                                value={tableForm.capacity}
                                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTable}
                            disabled={saving}
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold rounded-xl"
                        >
                            {saving ? 'Saving...' : editingTable ? 'Save Changes' : 'Create Table'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
