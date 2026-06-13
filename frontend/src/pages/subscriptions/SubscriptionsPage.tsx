import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, RefreshCw, Tv, CalendarClock, Wallet, Pencil, Pause, Play, X, CheckCircle2,
} from 'lucide-react'
import { serviceSubscriptionsApi } from '@/api/serviceSubscriptions'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ServiceSubscription } from '@/types'
import { SubscriptionModal } from '@/components/subscriptions/SubscriptionModal'

const statusMap: Record<string, { label: string; variant: any }> = {
  ACTIVE: { label: 'Ativa', variant: 'paid' },
  PAUSED: { label: 'Pausada', variant: 'pending' },
  CANCELLED: { label: 'Cancelada', variant: 'cancelled' },
}
const recurrenceLabel: Record<string, string> = {
  DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal', YEARLY: 'Anual',
}

function fmtDate(d?: string) {
  if (!d) return '—'
  try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) } catch { return d }
}

export default function SubscriptionsPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editSub, setEditSub] = useState<ServiceSubscription | null>(null)

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['service-subscriptions', activeGroupId],
    queryFn: () => serviceSubscriptionsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })
  const { data: summary } = useQuery({
    queryKey: ['service-subscriptions-summary', activeGroupId],
    queryFn: () => serviceSubscriptionsApi.summary(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['service-subscriptions-summary'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const mkAction = (fn: (g: string, id: string) => Promise<unknown>, okMsg: string) => ({
    mutationFn: (id: string) => fn(activeGroupId!, id),
    onSuccess: () => { invalidate(); toast({ title: okMsg }) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const pauseM = useMutation(mkAction(serviceSubscriptionsApi.pause, 'Assinatura pausada'))
  const cancelM = useMutation(mkAction(serviceSubscriptionsApi.cancel, 'Assinatura cancelada'))
  const activateM = useMutation(mkAction(serviceSubscriptionsApi.activate, 'Assinatura reativada'))

  const generateM = useMutation({
    mutationFn: () => serviceSubscriptionsApi.generate(activeGroupId!),
    onSuccess: (r) => { invalidate(); toast({ title: `${r.created} lançamento(s) gerado(s)` }) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao gerar', variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Serviços recorrentes (Netflix, Spotify, ChatGPT...)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={generateM.isPending} onClick={() => generateM.mutate()}>
            <RefreshCw className={cn('h-4 w-4', generateM.isPending && 'animate-spin')} />
            Gerar lançamentos
          </Button>
          <Button className="gap-2" onClick={() => { setEditSub(null); setModalOpen(true) }}>
            <Plus className="h-4 w-4" /> Nova Assinatura
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Wallet} title="Total mensal (ativas)"
          value={formatCurrency(summary?.monthlyTotal ?? 0)} color="text-emerald-600" />
        <SummaryCard icon={Tv} title="Assinaturas ativas"
          value={String(summary?.activeCount ?? 0)} sub={summary?.pausedCount ? `${summary.pausedCount} pausada(s)` : undefined} color="text-blue-600" />
        <SummaryCard icon={CalendarClock} title="Próxima cobrança"
          value={summary?.nextChargeName || '—'}
          sub={summary?.nextChargeDate ? `${fmtDate(summary.nextChargeDate)} · ${formatCurrency(summary.nextChargeAmount ?? 0)}` : undefined}
          color="text-purple-600" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full"><Tv className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-lg">Nenhuma assinatura</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">Cadastre seus serviços recorrentes para acompanhar o total mensal e gerar lançamentos.</p>
          <Button onClick={() => { setEditSub(null); setModalOpen(true) }}><Plus className="h-4 w-4 mr-2" /> Nova Assinatura</Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {subs.map(sub => {
              const st = statusMap[sub.status] || statusMap.ACTIVE
              return (
                <div key={sub.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Tv className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sub.name}</p>
                      <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span>{recurrenceLabel[sub.recurrenceType]}</span>
                      <span>•</span>
                      <span>Próx.: {fmtDate(sub.nextChargeDate)}</span>
                      {sub.categoryName && <><span>•</span><span>{sub.categoryName}</span></>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-rose-600 flex-shrink-0">{formatCurrency(sub.amount)}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar"
                      onClick={() => { setEditSub(sub); setModalOpen(true) }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {sub.status === 'ACTIVE' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar" onClick={() => pauseM.mutate(sub.id)}>
                        <Pause className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                    {sub.status !== 'ACTIVE' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Reativar" onClick={() => activateM.mutate(sub.id)}>
                        <Play className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {sub.status !== 'CANCELLED' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancelar" onClick={() => cancelM.mutate(sub.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {modalOpen && activeGroupId && (
        <SubscriptionModal open={modalOpen} onClose={() => { setModalOpen(false); setEditSub(null) }}
          groupId={activeGroupId} subscription={editSub} />
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, title, value, sub, color }: {
  icon: React.ElementType; title: string; value: string; sub?: string; color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn('text-lg font-bold mt-1 truncate', color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted"><Icon className={cn('h-5 w-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  )
}
