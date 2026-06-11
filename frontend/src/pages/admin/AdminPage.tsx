import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminGroupResponse } from '@/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Users, TrendingUp, Crown, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

const planLabels: Record<string, string> = { FREE: 'Free', ESSENCIAL: 'Essencial', PREMIUM: 'Premium' }
const statusLabels: Record<string, string> = { TRIAL: 'Trial', ACTIVE: 'Ativo', CANCELLED: 'Cancelado', EXPIRED: 'Expirado' }
const planBadge: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ESSENCIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PREMIUM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}
const statusBadge: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
}

function StatCard({ title, value, sub, icon: Icon }: { title: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [changingPlan, setChangingPlan] = useState<string | null>(null)

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: adminApi.getGroups,
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  })

  const planMutation = useMutation({
    mutationFn: ({ groupId, plan }: { groupId: string; plan: string }) =>
      adminApi.forceChangePlan(groupId, plan),
    onSuccess: () => {
      toast({ title: 'Plano alterado com sucesso' })
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      // Propaga a troca para as telas do cliente (badge da sidebar, página
      // de Planos, uso) que leem a assinatura em cache.
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: () => toast({ title: 'Erro ao alterar plano', variant: 'destructive' }),
    onSettled: () => setChangingPlan(null),
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciamento de grupos e assinaturas</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total de grupos" value={stats.totalGroups} icon={Users} />
          <StatCard title="Em trial" value={stats.trialGroups} icon={TrendingUp} />
          <StatCard title="Assinaturas pagas" value={stats.activeProGroups + stats.activeBusinessGroups} icon={Crown} />
          <StatCard title="MRR estimado" value={`R$ ${stats.estimatedMRR.toFixed(2)}`}
            sub={`${stats.totalUsers} usuários`} icon={DollarSign} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupos ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingGroups ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {['Grupo', 'Admin', 'Membros', 'Plano efetivo', 'Status', 'Trial até', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g: AdminGroupResponse) => (
                    <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{g.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.ownerEmail}</td>
                      <td className="px-4 py-3">{g.memberCount}</td>
                      <td className="px-4 py-3">
                        <Badge className={planBadge[g.effectivePlan]}>{planLabels[g.effectivePlan]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadge[g.subscriptionStatus]}>{statusLabels[g.subscriptionStatus]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {g.trialEndDate ? format(new Date(g.trialEndDate), 'dd/MM/yy', { locale: ptBR }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {(['FREE', 'ESSENCIAL', 'PREMIUM'] as const).filter(p => p !== g.effectivePlan).map(plan => (
                            <button
                              key={plan}
                              onClick={() => {
                                setChangingPlan(g.id + plan)
                                planMutation.mutate({ groupId: g.id, plan })
                              }}
                              disabled={changingPlan === g.id + plan}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              → {planLabels[plan]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
