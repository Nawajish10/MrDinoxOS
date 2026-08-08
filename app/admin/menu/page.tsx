'use client'

import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Star, Flame, UtensilsCrossed, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryScrollerSkeleton, MenuCardSkeleton } from '@/components/ui/skeleton-loaders'

export default function MenuPage() {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [dietaryType, setDietaryType] = useState('both')

    // Dialog states
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
    const [itemDialogOpen, setItemDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

    // Form states
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
    const [itemForm, setItemForm] = useState({
        category_id: '',
        name: '',
        description: '',
        price: '',
        discounted_price: '',
        image_url: '',
        is_veg: true,
        is_bestseller: false,
        is_available: true,
        is_spicy: false,
        spicy_level: 0,
        stock: '' as string | number,
        is_infinite_stock: true,
    })
    const [savingCategory, setSavingCategory] = useState(false)
    const [savingItem, setSavingItem] = useState(false)

    // 1. TanStack Query for Categories (Cached 5m)
    const { data: categories = [], isLoading: loadingCategories } = useQuery<MenuCategory[]>({
        queryKey: ['restaurant-categories', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/menu/categories?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return data.categories || []
            }
            const { data, error } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .is('deleted_at', null)
                .order('sort_order', { ascending: true })
            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 5,
    })

    // 2. TanStack Query for Menu Items (Cached 5m)
    const { data: items = [], isLoading: loadingItems } = useQuery<MenuItem[]>({
        queryKey: ['restaurant-menu-items', RESTAURANT_ID],
        queryFn: async () => {
            const res = await fetch(`/api/menu/items?restaurantId=${RESTAURANT_ID}`)
            if (res.ok) {
                const data = await res.json()
                return (data.items || []).filter((i: any) => !i.name.startsWith('[DELETED]'))
            }
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, menu_categories(name)')
                .eq('restaurant_id', RESTAURANT_ID)
                .is('deleted_at', null)
                .order('name', { ascending: true })
            if (error) throw error
            return (data || []).filter(i => !i.name.startsWith('[DELETED]'))
        },
        staleTime: 1000 * 60 * 5,
    })

    useEffect(() => {
        const storedDietary = localStorage.getItem('restaurant_dietary_type')
        if (storedDietary) setDietaryType(storedDietary)

        const ch = supabase.channel('menu-admin-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories' }, () => {
                queryClient.invalidateQueries({ queryKey: ['restaurant-categories', RESTAURANT_ID] })
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
                queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items', RESTAURANT_ID] })
            })
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [queryClient])

    const filteredItems = useMemo(() => {
        let filtered = [...items]

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category_id === selectedCategory)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term)
            )
        }

        return filtered
    }, [items, searchTerm, selectedCategory])

    async function handleSaveCategory() {
        try {
            if (!categoryForm.name.trim()) {
                toast.error('Category name is required')
                return
            }

            setSavingCategory(true)
            const payload = {
                restaurant_id: RESTAURANT_ID,
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim() || null,
            }

            if (editingCategory) {
                const res = await fetch('/api/menu/categories', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingCategory.id, ...payload })
                })
                if (!res.ok) throw new Error('Failed to update category')
                toast.success('Category updated successfully')
            } else {
                const res = await fetch('/api/menu/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                if (!res.ok) throw new Error('Failed to create category')
                toast.success('Category created successfully')
            }

            queryClient.invalidateQueries({ queryKey: ['restaurant-categories', RESTAURANT_ID] })
            setCategoryDialogOpen(false)
            setCategoryForm({ name: '', description: '' })
            setEditingCategory(null)
        } catch (error) {
            console.error('Error saving category:', error)
            toast.error('Failed to save category')
        } finally {
            setSavingCategory(false)
        }
    }

    async function handleDeleteCategory(id: string) {
        if (!confirm('Are you sure you want to delete this category?')) return

        try {
            const res = await fetch(`/api/menu/categories?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete category')
            toast.success('Category deleted')
            queryClient.invalidateQueries({ queryKey: ['restaurant-categories', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error deleting category:', error)
            toast.error('Failed to delete category')
        }
    }

    async function handleSaveItem() {
        try {
            if (!itemForm.name.trim() || !itemForm.price || !itemForm.category_id) {
                toast.error('Please fill all required fields (Name, Price, Category)')
                return
            }

            setSavingItem(true)
            const payload = {
                restaurant_id: RESTAURANT_ID,
                category_id: itemForm.category_id,
                name: itemForm.name.trim(),
                description: itemForm.description.trim() || null,
                price: parseFloat(itemForm.price),
                discounted_price: itemForm.discounted_price ? parseFloat(itemForm.discounted_price) : null,
                image_url: itemForm.image_url.trim() || null,
                is_veg: itemForm.is_veg,
                is_bestseller: itemForm.is_bestseller,
                is_available: itemForm.is_available,
                is_spicy: itemForm.is_spicy,
                spicy_level: itemForm.is_spicy ? Number(itemForm.spicy_level) : 0,
                stock: itemForm.stock ? Number(itemForm.stock) : null,
                is_infinite_stock: itemForm.is_infinite_stock,
            }

            if (editingItem) {
                const res = await fetch('/api/menu/items', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingItem.id, ...payload })
                })
                if (!res.ok) throw new Error('Failed to update dish')
                toast.success('Dish updated successfully')
            } else {
                const res = await fetch('/api/menu/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                if (!res.ok) throw new Error('Failed to create dish')
                toast.success('Dish created successfully')
            }

            queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items', RESTAURANT_ID] })
            setItemDialogOpen(false)
            resetItemForm()
        } catch (error) {
            console.error('Error saving dish:', error)
            toast.error('Failed to save dish')
        } finally {
            setSavingItem(false)
        }
    }

    async function handleDeleteItem(id: string) {
        if (!confirm('Are you sure you want to delete this dish?')) return

        try {
            const res = await fetch(`/api/menu/items?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete item')
            toast.success('Dish removed from menu')
            queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items', RESTAURANT_ID] })
        } catch (error) {
            console.error('Error deleting item:', error)
            toast.error('Failed to delete item')
        }
    }

    function resetItemForm() {
        setItemForm({
            category_id: categories[0]?.id || '',
            name: '',
            description: '',
            price: '',
            discounted_price: '',
            image_url: '',
            is_veg: true,
            is_bestseller: false,
            is_available: true,
            is_spicy: false,
            spicy_level: 0,
            stock: '',
            is_infinite_stock: true,
        })
        setEditingItem(null)
    }

    function handleEditItem(item: MenuItem) {
        setEditingItem(item)
        setItemForm({
            category_id: item.category_id,
            name: item.name,
            description: item.description || '',
            price: item.price.toString(),
            discounted_price: item.discounted_price ? item.discounted_price.toString() : '',
            image_url: item.image_url || '',
            is_veg: item.is_veg,
            is_bestseller: item.is_bestseller,
            is_available: item.is_available,
            is_spicy: item.is_spicy,
            spicy_level: item.spicy_level || 0,
            stock: item.stock != null ? item.stock.toString() : '',
            is_infinite_stock: Boolean(item.is_infinite_stock),
        })
        setItemDialogOpen(true)
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Menu Management"
                description="Organize categories, dishes, pricing, inventory stock, and dietary tags."
            >
                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setCategoryDialogOpen(true) }}
                        variant="outline"
                        className="bg-white rounded-xl gap-2 font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Add Category
                    </Button>
                    <Button
                        onClick={() => { resetItemForm(); setItemDialogOpen(true) }}
                        className="bg-[#FF6B00] hover:bg-[#e66000] text-white gap-2 font-bold rounded-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Add Dish
                    </Button>
                </div>
            </PageHeader>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <Button
                    size="sm"
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                        "rounded-full text-xs font-bold px-4 h-8 transition-all shrink-0",
                        selectedCategory === 'all' ? "bg-[#FF6B00] text-white hover:bg-[#e66000]" : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                >
                    All Dishes ({items.length})
                </Button>
                {loadingCategories ? (
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />)}
                    </div>
                ) : (
                    categories.map((cat) => (
                        <div key={cat.id} className="relative group shrink-0">
                            <Button
                                size="sm"
                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "rounded-full text-xs font-bold px-4 h-8 transition-all",
                                    selectedCategory === cat.id ? "bg-[#FF6B00] text-white hover:bg-[#e66000]" : "bg-white text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {cat.name}
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Search Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search dishes by name or ingredient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-50 border-gray-200 text-xs rounded-xl"
                    />
                </div>
                <span className="text-xs font-bold text-gray-500">
                    Showing: {filteredItems.length} items
                </span>
            </div>

            {/* Items Grid */}
            {loadingItems ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <MenuCardSkeleton key={i} />)}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-bold text-base text-[#111827]">No menu items found</h3>
                    <p className="text-xs text-gray-500">Create dishes or select a different category to view items.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="bg-white border-gray-100 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between group">
                            <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
                                {item.image_url ? (
                                    <Image
                                        src={item.image_url}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 25vw"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <UtensilsCrossed className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                                    <Badge className={item.is_veg ? 'bg-emerald-600 text-white border-0 text-[10px] font-bold' : 'bg-red-600 text-white border-0 text-[10px] font-bold'}>
                                        {item.is_veg ? 'VEG' : 'NON-VEG'}
                                    </Badge>
                                    {item.is_bestseller && (
                                        <Badge className="bg-[#FF6B00] text-white border-0 text-[10px] font-bold flex items-center gap-0.5">
                                            <Star className="w-2.5 h-2.5 fill-white" /> Bestseller
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-sm text-[#111827] line-clamp-1">{item.name}</h4>
                                    {item.description && (
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-extrabold text-base text-[#111827]">₹{item.price}</span>
                                        {item.discounted_price && (
                                            <span className="text-xs text-gray-400 line-through">₹{item.discounted_price}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditItem(item)}
                                            className="h-7 w-7 p-0 rounded-lg text-gray-400 hover:text-[#FF6B00]"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="h-7 w-7 p-0 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">
                            {editingCategory ? 'Edit Category' : 'Create Menu Category'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Category Name *</Label>
                            <Input
                                placeholder="e.g. Starters, Main Course, Beverages"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Description</Label>
                            <Input
                                placeholder="e.g. Delicious freshly prepared appetizers"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={savingCategory}
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold rounded-xl"
                        >
                            {savingCategory ? 'Saving...' : 'Save Category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Item Dialog */}
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogContent className="sm:max-w-lg bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">
                            {editingItem ? 'Edit Dish' : 'Add New Dish'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3.5 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Category *</Label>
                                <Select
                                    value={itemForm.category_id}
                                    onValueChange={(val) => setItemForm({ ...itemForm, category_id: val })}
                                >
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-xs">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Dish Name *</Label>
                                <Input
                                    placeholder="e.g. Paneer Butter Masala"
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Price (₹) *</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 280"
                                    value={itemForm.price}
                                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-700">Discounted Price (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 240"
                                    value={itemForm.discounted_price}
                                    onChange={(e) => setItemForm({ ...itemForm, discounted_price: e.target.value })}
                                    className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Description</Label>
                            <Textarea
                                placeholder="Describe dish ingredients, taste profile, and preparation style"
                                value={itemForm.description}
                                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl text-xs min-h-[60px]"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-700">Image URL</Label>
                            <Input
                                placeholder="https://images.unsplash.com/photo-..."
                                value={itemForm.image_url}
                                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                                className="bg-gray-50 border-gray-200 rounded-xl text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveItem}
                            disabled={savingItem}
                            className="bg-[#FF6B00] hover:bg-[#e66000] text-white font-bold rounded-xl"
                        >
                            {savingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Dish'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
