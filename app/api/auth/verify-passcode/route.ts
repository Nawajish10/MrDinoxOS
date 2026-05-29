import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { passcode } = await request.json()

        if (!passcode) {
            return NextResponse.json(
                { error: 'Passcode is required' },
                { status: 400 }
            )
        }

        const adminPasscode = process.env.ADMIN_PASSCODE

        if (!adminPasscode) {
            console.error('Admin passcode not configured in environment variables')
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        if (passcode === adminPasscode) {
            return NextResponse.json({ success: true })
        }

        return NextResponse.json(
            { error: 'Incorrect passcode' },
            { status: 401 }
        )
    } catch (error: unknown) {
        console.error('Passcode verification error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
