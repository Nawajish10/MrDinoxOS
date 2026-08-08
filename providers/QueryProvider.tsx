'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 3, // 3 minutes fresh
                gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                retry: 1,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
