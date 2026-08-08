'use client'

import React from 'react'

export function DashboardStatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="h-3.5 w-24 bg-gray-200 rounded-md" />
                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-7 w-32 bg-gray-200 rounded-md" />
                    <div className="h-3 w-40 bg-gray-100 rounded-md" />
                </div>
            ))}
        </div>
    )
}

export function CategoryScrollerSkeleton() {
    return (
        <div className="flex gap-3 overflow-hidden py-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[76px]">
                    <div className="w-16 h-16 rounded-full bg-gray-200" />
                    <div className="h-3 w-12 bg-gray-200 rounded-md" />
                </div>
            ))}
        </div>
    )
}

export function MenuCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs flex flex-col justify-between h-full animate-pulse">
            <div className="space-y-2.5">
                <div className="w-full aspect-4/3 bg-gray-200 rounded-xl" />
                <div className="h-4 w-3/4 bg-gray-200 rounded-md" />
                <div className="h-3 w-full bg-gray-100 rounded-md" />
                <div className="h-3 w-2/3 bg-gray-100 rounded-md" />
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-50">
                <div className="h-5 w-16 bg-gray-200 rounded-md" />
                <div className="h-8 w-20 bg-orange-100 rounded-full" />
            </div>
        </div>
    )
}

export function OrdersTableSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs animate-pulse">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="h-4 w-32 bg-gray-200 rounded-md" />
                <div className="h-4 w-20 bg-gray-200 rounded-md" />
            </div>
            <div className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                            <div className="h-4 w-28 bg-gray-200 rounded-md" />
                            <div className="h-3 w-48 bg-gray-100 rounded-md" />
                        </div>
                        <div className="h-6 w-20 bg-gray-200 rounded-full" />
                        <div className="h-5 w-16 bg-gray-200 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ReportsCardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                        <div className="h-3.5 w-24 bg-gray-200 rounded-md" />
                        <div className="h-7 w-32 bg-gray-200 rounded-md" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 h-64 space-y-4">
                    <div className="h-4 w-36 bg-gray-200 rounded-md" />
                    <div className="h-44 bg-gray-50 rounded-xl" />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 h-64 space-y-4">
                    <div className="h-4 w-36 bg-gray-200 rounded-md" />
                    <div className="h-44 bg-gray-50 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function TablesGridSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="h-5 w-20 bg-gray-200 rounded-md" />
                        <div className="h-5 w-16 bg-green-100 rounded-full" />
                    </div>
                    <div className="h-3.5 w-28 bg-gray-100 rounded-md" />
                    <div className="w-full aspect-square bg-gray-100 rounded-xl" />
                </div>
            ))}
        </div>
    )
}
