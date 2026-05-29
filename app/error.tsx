'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary caught an error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
                    <p className="text-gray-500 text-sm">
                        We apologize for the inconvenience. Our team has been notified of this issue.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button 
                        onClick={() => reset()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        Try again
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/'}
                        className="w-full"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    )
}
