import { NextResponse } from 'next/server'
import { invalidateRestaurantCache, deleteCached, deleteByPattern } from '@/lib/cache/cache'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const restaurantId = body.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID
        const pattern = body.pattern
        const key = body.key
        const namespace = body.namespace

        if (key) {
            await deleteCached(key)
            return NextResponse.json({ success: true, message: `Key ${key} purged` })
        }

        if (pattern) {
            const count = await deleteByPattern(pattern)
            return NextResponse.json({ success: true, count, message: `Pattern ${pattern} purged` })
        }

        if (restaurantId) {
            await invalidateRestaurantCache(restaurantId, namespace)
            return NextResponse.json({ success: true, message: `Restaurant ${restaurantId} cache purged` })
        }

        return NextResponse.json({ error: 'restaurantId, key, or pattern is required' }, { status: 400 })
    } catch (error: unknown) {
        console.error('API /api/cache/invalidate POST error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to invalidate cache' },
            { status: 500 }
        )
    }
}
