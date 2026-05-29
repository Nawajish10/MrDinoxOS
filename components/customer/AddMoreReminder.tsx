'use client'

import { PartyPopper } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useCartStore } from '@/store/cartStore'
import { useSessionStore } from '@/store/customer/sessionStore'

interface AddMoreReminderProps {
    orderId: string
    billId: string
}

export function AddMoreReminder({ orderId, billId }: AddMoreReminderProps) {
    const router = useRouter()
    const { showAddMoreReminder, dismissAddMoreReminder } = useSessionStore()

    const handleAddMore = () => {
        dismissAddMoreReminder()
        useCartStore.getState().setActiveOrder(orderId, billId)
        router.push('/customer/menu')
    }

    return (
        <Dialog open={showAddMoreReminder} onOpenChange={(open) => !open && dismissAddMoreReminder()}>
            <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-0 bg-gradient-to-b from-orange-50 to-white">
                <div className="p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                        <PartyPopper className="w-10 h-10 text-orange-500" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 text-center">Still Hungry?</DialogTitle>
                        <DialogDescription className="text-center text-slate-600 font-medium text-base pt-2">
                            Hope you are enjoying your meal. Would you like to order any drinks or desserts?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-200 text-lg"
                            onClick={handleAddMore}
                        >
                            View Menu
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                            onClick={dismissAddMoreReminder}
                        >
                            No thanks, I am full
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
