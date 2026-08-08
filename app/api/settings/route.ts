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
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, restaurant: data })
    } catch (error: unknown) {
        console.error('API /api/settings GET error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch restaurant settings' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const restaurantId = body.id || body.restaurant_id || process.env.NEXT_PUBLIC_RESTAURANT_ID

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {
            name: body.name,
            tagline: body.tagline || null,
            phone: body.phone,
            whatsapp_number: body.whatsapp_number || null,
            email: body.email || null,
            address: body.address || '',
            city: body.city || '',
            tax_percentage: body.tax_percentage !== undefined ? Number(body.tax_percentage) : 0,
            delivery_charge: body.delivery_charge !== undefined ? Number(body.delivery_charge) : 0,
            min_order_amount: body.min_order_amount !== undefined ? Number(body.min_order_amount) : 0,
            avg_preparation_time: body.avg_preparation_time !== undefined ? Number(body.avg_preparation_time) : 15,
            opening_time: body.opening_time || null,
            closing_time: body.closing_time || null,
            upi_id: body.upi_id || null,
            is_open: body.is_open !== undefined ? Boolean(body.is_open) : true,
            updated_at: new Date().toISOString()
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('restaurants')
            .update(updatePayload)
            .eq('id', restaurantId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, restaurant: data })
    } catch (error: unknown) {
        console.error('API /api/settings PUT error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update restaurant settings' },
            { status: 500 }
        )
    }
}
