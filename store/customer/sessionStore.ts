import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SessionStatus } from '@/types'

interface SessionState {
    activeOrderId: string | null
    activeBillId: string | null
    sessionId: string | null
    
    orderStatus: string | null
    paymentStatus: string | null
    
    isServed: boolean
    servedAt: string | null
    
    showPayment: boolean
    showAddMoreReminder: boolean
    addMoreReminderTimerId: NodeJS.Timeout | null

    startSession: (orderId: string, billId: string, sessionId: string) => void
    updateSessionStatus: (orderStatus: string, paymentStatus: string) => void
    setServed: (servedAt: string) => void
    startAddMoreTimer: (callback: () => void) => void
    clearAddMoreTimer: () => void
    showPaymentOption: () => void
    closeSession: () => void
    dismissAddMoreReminder: () => void
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            activeOrderId: null,
            activeBillId: null,
            sessionId: null,
            
            orderStatus: null,
            paymentStatus: null,
            
            isServed: false,
            servedAt: null,
            
            showPayment: false,
            showAddMoreReminder: false,
            addMoreReminderTimerId: null,

            startSession: (orderId, billId, sessionId) => set({
                activeOrderId: orderId,
                activeBillId: billId,
                sessionId: sessionId,
                orderStatus: 'pending',
                paymentStatus: 'pending',
                isServed: false,
                servedAt: null,
                showPayment: false,
                showAddMoreReminder: false
            }),

            updateSessionStatus: (orderStatus, paymentStatus) => set({
                orderStatus,
                paymentStatus
            }),

            setServed: (servedAt) => set({
                isServed: true,
                servedAt,
                orderStatus: 'served'
            }),

            startAddMoreTimer: (callback) => {
                const currentTimer = get().addMoreReminderTimerId;
                if (currentTimer) {
                    clearTimeout(currentTimer);
                }
                
                // 15 minutes timer
                const timerId = setTimeout(() => {
                    set({ showAddMoreReminder: true });
                    callback();
                }, 15 * 60 * 1000);
                
                set({ addMoreReminderTimerId: timerId });
            },

            clearAddMoreTimer: () => {
                const currentTimer = get().addMoreReminderTimerId;
                if (currentTimer) {
                    clearTimeout(currentTimer);
                }
                set({ addMoreReminderTimerId: null });
            },

            showPaymentOption: () => set({
                showPayment: true,
                showAddMoreReminder: false
            }),
            
            dismissAddMoreReminder: () => set({
                showAddMoreReminder: false
            }),

            closeSession: () => {
                const currentTimer = get().addMoreReminderTimerId;
                if (currentTimer) {
                    clearTimeout(currentTimer);
                }
                
                set({
                    activeOrderId: null,
                    activeBillId: null,
                    sessionId: null,
                    orderStatus: null,
                    paymentStatus: null,
                    isServed: false,
                    servedAt: null,
                    showPayment: false,
                    showAddMoreReminder: false,
                    addMoreReminderTimerId: null
                })
            }
        }),
        {
            name: 'restaurant-session-storage',
            partialize: (state) => ({ 
                activeOrderId: state.activeOrderId,
                activeBillId: state.activeBillId,
                sessionId: state.sessionId,
                orderStatus: state.orderStatus,
                paymentStatus: state.paymentStatus,
                isServed: state.isServed,
                servedAt: state.servedAt,
                showPayment: state.showPayment
            }), // Do not persist the timer object
        }
    )
)
