import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPinOff } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <MapPinOff className="h-8 w-8 text-orange-600" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900">404</h1>
                    <h2 className="text-xl font-bold text-gray-800">Page Not Found</h2>
                    <p className="text-gray-500 text-sm">
                        The page you are looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                        <Link href="/">
                            Return to Homepage
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
