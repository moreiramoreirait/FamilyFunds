import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Landmark, Plus, Trash2, Loader2, Lock, RefreshCw, ShieldCheck } from 'lucide-react'
import { openFinanceApi } from '@/api/openFinance'
import { subscriptionsApi } from '@/api/subscriptions'
import { familyGroupsApi } from '@/api/familyGroups'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDate, cn } from '@/lib/utils'

// Widget Pluggy Connect — carregado sob demanda (lib browser-only, evita peso no bundle inicial)
const PluggyConnect = lazy(() =>
  import('react-pluggy-connect').then(m => ({ default: m.PluggyConnect }))
)

const statusMap: Record<string, { label: string; variant: any }> = {
  UPDATED: { label: 'Conectado', variant: 'paid' },
  UPDATING: { label: 'Atualizando', variant: 'pending' },
  LOGIN_ERROR: { label: 'Erro de login', variant: 'cancelled' },
  OUTDATED: { label: 'Desatualizado', variant: 'pending' },
  WAITING_USER_INPUT: { label: 'Aguardando você', variant: 'pending' },
  PENDING: { label: 'Pendente', variant: 'pending' },
}

export default function OpenFinancePage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const groupId = currentGroupId || groups?.[0]?.id
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [connectToken, setConnectToken] = useState<string | null>(null)

  const { data: subscription } = useQuery({
    queryKey: ['subscription', groupId], queryFn: () => subscriptionsApi.getSubscription(groupId!), enabled: !!groupId,
  })
  const isPremium = subscription?.effectivePlan === 'PREMIUM'

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['bank-connections', groupId],
    queryFn: () => openFinanceApi.list(groupId!),
    enabled: !!groupId && isPremium,
  })

  const startConnect = useMutation({
    mutationFn: () => openFinanceApi.connectToken(groupId!),
    onSuccess: (token) => setConnectToken(token),
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao iniciar conexão', variant: 'destructive' }),
  })

  const saveConn = useMutation({
    mutationFn: (itemId: string) => openFinanceApi.saveConnection(groupId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections', groupId] })
      toast({ title: 'Banco conectado!' })
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao salvar conexão', variant: 'destructive' }),
  })

  const removeConn = useMutation({
    mutationFn: (id: string) => openFinanceApi.remove(groupId!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bank-connections', groupId] }); toast({ title: 'Conexão removida' }) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const syncConn = useMutation({
    mutationFn: (id: string) => openFinanceApi.sync(groupId!, id),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections', groupId] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Sincronizado!', description: `${r.transactionsImported} transação(ões) · ${r.accountsLinked} conta(s) nova(s)` })
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao sincronizar', variant: 'destructive' }),
  })

  if (!groupId) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Nenhum grupo familiar encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Open Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Conecte seus bancos e sincronize o extrato automaticamente</p>
        </div>
        {isPremium && (
          <Button className="gap-2" disabled={startConnect.isPending} onClick={() => startConnect.mutate()}>
            {startConnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Conectar banco
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3 flex gap-3 items-start">
        <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          A conexão é feita pelo provedor de Open Finance (Pluggy). <strong>Suas credenciais bancárias são digitadas direto no widget do provedor</strong> — o FinançasFamília nunca tem acesso à sua senha do banco.
        </p>
      </div>

      {!isPremium ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-muted rounded-full"><Lock className="h-7 w-7 text-muted-foreground" /></div>
            <h3 className="font-semibold text-lg">Recurso Premium</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              A conexão bancária via Open Finance está disponível no plano <strong>Premium</strong>. Faça upgrade para sincronizar seus bancos automaticamente.
            </p>
            <Button onClick={() => window.location.href = '/plans'}>Ver planos</Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full"><Landmark className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-lg">Nenhum banco conectado</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">Conecte um banco para trazer o extrato automaticamente para o sistema.</p>
          <Button className="gap-2" disabled={startConnect.isPending} onClick={() => startConnect.mutate()}>
            <Plus className="h-4 w-4" /> Conectar banco
          </Button>
        </div>
      ) : (
        <Card><CardContent className="p-0 divide-y divide-border">
          {connections.map(c => {
            const st = statusMap[c.status] || { label: c.status, variant: 'default' }
            return (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.connectorImageUrl
                    ? <img src={c.connectorImageUrl} alt="" className="w-7 h-7 object-contain" />
                    : <Landmark className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.connectorName || 'Banco'}</p>
                    <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.lastSyncedAt ? `Sincronizado ${formatDate(c.lastSyncedAt)}` : 'Ainda não sincronizado'}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={syncConn.isPending}
                  onClick={() => syncConn.mutate(c.id)}>
                  <RefreshCw className={cn('h-3.5 w-3.5', syncConn.isPending && 'animate-spin')} /> Sincronizar
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Remover"
                  onClick={() => { if (confirm(`Remover a conexão com ${c.connectorName || 'este banco'}?`)) removeConn.mutate(c.id) }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )
          })}
        </CardContent></Card>
      )}

      {/* Widget Pluggy Connect */}
      {connectToken && (
        <Suspense fallback={null}>
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={import.meta.env.VITE_PLUGGY_SANDBOX === 'true'}
            onSuccess={(data: any) => {
              const itemId = data?.item?.id
              if (itemId) saveConn.mutate(itemId)
              setConnectToken(null)
            }}
            onError={() => { toast({ title: 'Conexão não concluída', variant: 'destructive' }); setConnectToken(null) }}
            onClose={() => setConnectToken(null)}
          />
        </Suspense>
      )}

      {saveConn.isPending && (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Salvando conexão…</p>
      )}
    </div>
  )
}
