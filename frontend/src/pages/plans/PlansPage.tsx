import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Zap, Crown, Star, Loader2 } from 'lucide-react'
import { subscriptionsApi, type Plan, type Subscription } from '@/api/subscriptions'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const PLAN_ORDER: Record<string, number> = { FREE: 0, ESSENCIAL: 1, PREMIUM: 2 }

const planConfig: Record<string, {
  icon: React.ElementType
  iconClass: string
  badgeClass: string
  ringClass: string
  buttonClass: string
  priceLabel: string
}> = {
  FREE: {
    icon: Star,
    iconClass: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    ringClass: 'border-border',
    buttonClass: '',
    priceLabel: 'Grátis para sempre',
  },
  ESSENCIAL: {
    icon: Zap,
    iconClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ringClass: 'border-blue-500 ring-2 ring-blue-500/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    priceLabel: '/mês',
  },
  PREMIUM: {
    icon: Crown,
    iconClass: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ringClass: 'border-purple-500 ring-2 ring-purple-500/30',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    priceLabel: '/mês',
  },
}

function formatLimit(value: number, unit: string) {
  if (value === -1) return `Ilimitado${unit ? ' ' + unit : ''}`
  return `${value}${unit ? ' ' + unit : ''}`
}

function PlanCard({
  plan,
  subscription,
  onUpgrade,
  isUpgrading,
}: {
  plan: Plan
  subscription: Subscription | undefined
  onUpgrade: (planType: string) => void
  isUpgrading: boolean
}) {
  const config = planConfig[plan.type] ?? planConfig.FREE
  const Icon = config.icon

  // Só uma assinatura ACTIVE conta como plano "atual". Durante o TRIAL o
  // effectivePlan é PREMIUM (acesso de cortesia), mas isso NÃO é pagamento —
  // o usuário precisa poder assinar qualquer plano pago. CANCELLED/EXPIRED
  // também voltam a poder assinar.
  const status = subscription?.status
  const activePlan = status === 'ACTIVE' ? (subscription?.plan ?? 'FREE') : 'FREE'
  const isCurrent = status === 'ACTIVE' && activePlan === plan.type
  const currentOrder = PLAN_ORDER[activePlan] ?? 0
  const thisOrder = PLAN_ORDER[plan.type] ?? 0
  const isHigher = thisOrder > currentOrder
  const isLower = thisOrder < currentOrder
  const isPaid = plan.priceMonthly > 0

  let buttonLabel = 'Assinar'
  if (isCurrent) buttonLabel = 'Plano Atual'
  else if (!isPaid) buttonLabel = 'Plano Grátis'
  else if (isLower) buttonLabel = 'Fazer Downgrade'
  else buttonLabel = status === 'TRIAL' ? 'Assinar agora' : 'Fazer Upgrade'

  const buttonDisabled = isCurrent || isLower || !isPaid || isUpgrading

  return (
    <Card className={cn(
      'relative flex flex-col transition-all duration-200',
      isCurrent ? config.ringClass : 'hover:shadow-md',
      !isCurrent && isHigher && config.ringClass,
    )}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={cn('px-3 py-0.5 rounded-full text-xs font-semibold', config.badgeClass)}>
            Plano Atual
          </span>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('p-2 rounded-xl', config.iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">{plan.displayName}</CardTitle>
        </div>

        <div className="flex items-end gap-1">
          {plan.priceMonthly === 0 ? (
            <span className="text-3xl font-bold">R$ 0</span>
          ) : (
            <>
              <span className="text-3xl font-bold">
                R$ {plan.priceMonthly.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-muted-foreground mb-1 text-sm">/mês</span>
            </>
          )}
        </div>
        <CardDescription className="text-xs">{config.priceLabel}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Limits summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          <div><span className="font-medium text-foreground">{formatLimit(plan.maxUsers, '')}</span> usuários</div>
          <div><span className="font-medium text-foreground">{formatLimit(plan.maxAccounts, '')}</span> contas</div>
          <div><span className="font-medium text-foreground">{formatLimit(plan.maxCreditCards, '')}</span> cartões</div>
          <div><span className="font-medium text-foreground">{formatLimit(plan.maxTransactionsPerMonth, '')}</span> transações/mês</div>
        </div>

        {/* Features list */}
        <ul className="space-y-2 flex-1">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn('w-full mt-2', !buttonDisabled && config.buttonClass)}
          variant={buttonDisabled ? 'outline' : 'default'}
          disabled={buttonDisabled}
          onClick={() => !buttonDisabled && onUpgrade(plan.type)}
        >
          {isUpgrading && !isCurrent && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function PlansPage() {
  const { currentGroupId } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ['subscription', currentGroupId],
    queryFn: () => subscriptionsApi.getSubscription(currentGroupId!),
    enabled: !!currentGroupId,
    // Página onde o plano é visto/alterado: sempre buscar o estado real ao
    // abrir (o staleTime global de 5min poderia mostrar o plano desatualizado
    // após uma troca via admin, portal Stripe ou webhook).
    refetchOnMount: 'always',
  })

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionsApi.listPlans,
  })

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => subscriptionsApi.createCheckout(currentGroupId!, plan),
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (e: any) =>
      toast({
        title: e?.response?.data?.message || 'Erro ao iniciar pagamento',
        variant: 'destructive',
      }),
  })

  const portalMutation = useMutation({
    mutationFn: () => subscriptionsApi.createPortal(currentGroupId!),
    onSuccess: (data) => { window.location.href = data.url },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao abrir portal', variant: 'destructive' }),
  })

  const isLoading = loadingSub || loadingPlans
  const isUpgrading = checkoutMutation.isPending

  const orderedPlans = [...plans].sort(
    (a, b) => (PLAN_ORDER[a.type] ?? 0) - (PLAN_ORDER[b.type] ?? 0)
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Planos e Preços</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Escolha o plano ideal para a sua família. Faça upgrade a qualquer momento.
        </p>
      </div>

      {/* Trial banner */}
      {subscription?.trialActive && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <Zap className="h-4 w-4 flex-shrink-0" />
          <span>
            Você está no período de teste.{' '}
            <strong>{subscription.trialDaysLeft} {subscription.trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}</strong>{' '}
            até o fim do trial.
          </span>
        </div>
      )}

      {/* Payment pending warning */}
      {subscription?.paymentPending && subscription.effectivePlan !== 'FREE' && (
        <div className="flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
          <Zap className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Pagamento pendente.</strong> Não conseguimos cobrar sua assinatura — atualize seu cartão para não perder o acesso.{' '}
            <button onClick={() => portalMutation.mutate()} className="underline font-medium">Gerenciar faturamento</button>
          </span>
        </div>
      )}

      {/* Current plan summary */}
      {subscription && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>Plano atual:</span>
          <Badge className={cn('text-xs', planConfig[subscription.effectivePlan]?.badgeClass)}>
            {subscription.displayName}
          </Badge>
          {subscription.currentPeriodEnd && (
            <span>· Renovação em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}</span>
          )}
          {subscription.plan !== 'FREE' && (
            <button
              onClick={() => portalMutation.mutate()}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              Gerenciar faturamento
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : orderedPlans.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Nenhum plano disponível</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-4">
          {orderedPlans.map(plan => (
            <PlanCard
              key={plan.type}
              plan={plan}
              subscription={subscription}
              onUpgrade={(planType) => checkoutMutation.mutate(planType)}
              isUpgrading={isUpgrading}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        Todos os planos incluem suporte por e-mail. Para dúvidas sobre faturamento, entre em contato conosco.
      </p>
    </div>
  )
}
