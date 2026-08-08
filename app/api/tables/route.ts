import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const restaurantId = searchParams.get('restaurantId') || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('restaurant_tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('table_number', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, tables: data || [] })
    } catch (error: unknown) {
        console.error('API /api/tables GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch tables' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const restaurantId = body.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
        }

        if (body.table_number === undefined || body.table_number === null || isNaN(Number(body.table_number))) {
            return NextResponse.json({ error: 'Valid table_number is required' }, { status: 400 })
        }

        const tablePayload = {
            restaurant_id: restaurantId,
            table_number: Number(body.table_number),
            table_name: body.table_name || `Table ${body.table_number}`,
            capacity: Number(body.capacity) || 4,
            status: body.status || 'available',
            is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('restaurant_tables')
            .insert(tablePayload)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, table: data }, { status: 201 })
    } catch (error: unknown) {
        console.error('API /api/tables POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create table' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Table id is required for update' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (updates.table_number !== undefined) updatePayload.table_number = Number(updates.table_number)
        if (updates.table_name !== undefined) updatePayload.table_name = updates.table_name
        if (updates.capacity !== undefined) updatePayload.capacity = Number(updates.capacity)
        if (updates.status !== undefined) updatePayload.status = updates.status
        if (updates.is_active !== undefined) updatePayload.is_active = Boolean(updates.is_active)

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('restaurant_tables')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, table: data })
    } catch (error: unknown) {
        console.error('API /api/tables PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update table' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Table id is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from('restaurant_tables')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Table deleted successfully' })
    } catch (error: unknown) {
        console.error('API /api/tables DELETE error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete table' },
            { status: 500 }
        )
    }
}
