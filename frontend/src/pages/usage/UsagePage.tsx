import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '@/api/subscriptions'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Wallet, CreditCard, Users, ReceiptText, Upload, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

function UsageBar({ label, icon: Icon, used, max, unit = '' }: {
  label: string; icon: React.ElementType; used: number; max: number; unit?: string
}) {
  const unlimited = max === -1
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100))
  const color = unlimited ? 'bg-emerald-500' : pct >= 80 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'
  const textColor = unlimited ? 'text-emerald-600' : pct >= 80 ? 'text-rose-600' : pct >= 60 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        <span className={cn('font-semibold tabular-nums', textColor)}>
          {unlimited ? `${used} / ∞` : `${used} / ${max}${unit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <div className="h-full w-full rounded-full bg-emerald-200 dark:bg-emerald-700 animate-none" />
        </div>
      )}
    </div>
  )
}

export default function UsagePage() {
  const { currentGroupId } = useAuthStore()
  const navigate = useNavigate()

  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage', currentGroupId],
    queryFn: () => subscriptionsApi.getUsage(currentGroupId!),
    enabled: !!currentGroupId,
  })

  if (isLoading || !usage) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando uso...</div>
  }

  const atLimit = (used: number, max: number) => max !== -1 && used >= max * 0.8

  const hasWarning = atLimit(usage.transactionsUsed, usage.maxTransactionsPerMonth) ||
                     atLimit(usage.accountsUsed, usage.maxAccounts) ||
                     atLimit(usage.cardsUsed, usage.maxCreditCards) ||
                     atLimit(usage.membersUsed, usage.maxUsers)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Uso do Plano</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plano atual: <strong>{usage.effectivePlan === 'FREE' ? 'Free' : usage.effectivePlan === 'ESSENCIAL' ? 'Essencial' : 'Premium'}</strong>
          {usage.trialActive && ` · ${usage.trialDaysLeft} dias de teste restantes`}
        </p>
      </div>

      {hasWarning && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Você está próximo do limite do plano {usage.effectivePlan}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Faça upgrade para continuar usando sem interrupções.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/plans')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
            Ver planos
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageBar label="Lançamentos este mês" icon={ReceiptText}
            used={usage.transactionsUsed} max={usage.maxTransactionsPerMonth} />
          <UsageBar label="Contas bancárias" icon={Wallet}
            used={usage.accountsUsed} max={usage.maxAccounts} />
          <UsageBar label="Cartões de crédito" icon={CreditCard}
            used={usage.cardsUsed} max={usage.maxCreditCards} />
          <UsageBar label="Membros do grupo" icon={Users}
            used={usage.membersUsed} max={usage.maxUsers} />
          <UsageBar label="Importações este mês" icon={Upload}
            used={usage.importsUsed} max={usage.maxImportsPerMonth} />
        </CardContent>
      </Card>
    </div>
  )
}
