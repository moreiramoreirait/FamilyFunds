import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { subscriptionsApi } from '@/api/subscriptions'
import { useAuthStore } from '@/store/authStore'

export default function SubscriptionBanner() {
  const { currentGroupId } = useAuthStore()
  const navigate = useNavigate()

  const dismissKey = `sub-banner-dismissed-${new Date().toISOString().slice(0, 10)}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === '1' } catch { return false }
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription', currentGroupId],
    queryFn: () => subscriptionsApi.getSubscription(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  if (dismissed) return null
  if (!subscription?.trialActive) return null
  if (subscription.trialDaysLeft > 7) return null

  const days = subscription.trialDaysLeft
  const dayLabel = days === 1 ? 'dia' : 'dias'

  return (
    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <p className="flex-1">
        Seu período de teste termina em{' '}
        <strong>{days} {dayLabel}</strong>.{' '}
        Faça upgrade para continuar usando todos os recursos.{' '}
        <button
          onClick={() => navigate('/plans')}
          className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        >
          Ver planos
        </button>
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="flex-shrink-0 p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
