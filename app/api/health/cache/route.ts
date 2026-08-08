import { NextResponse } from 'next/server'
import { redisDriver } from '@/lib/cache/redis'

export async function GET() {
    try {
        const isHealthy = await redisDriver.isHealthy()
        
        return NextResponse.json({
            status: isHealthy ? 'healthy' : 'degraded',
            cache: isHealthy ? 'connected' : 'fallback_memory',
            timestamp: new Date().toISOString(),
        })
    } catch (error: unknown) {
        console.error('API /api/health/cache error:', error)
        return NextResponse.json(
            { status: 'error', cache: 'fallback_memory' },
            { status: 500 }
        )
    }
}
