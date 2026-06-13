import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, AlertTriangle,
  Clock, PiggyBank, ArrowUpDown, RefreshCw, Tv, Repeat, Percent, ShoppingCart
} from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { shoppingApi } from '@/api/shopping'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatPercent, getStatusLabel, cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { familyGroupsApi } from '@/api/familyGroups'
import { useState } from 'react'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

function KPICard({
  title, value, subtitle, icon: Icon, colorClass, trend
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType
  colorClass: string; trend?: { value: number; positive: boolean }
}) {
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold mt-1 truncate", colorClass)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl", colorClass.includes('emerald') ? 'bg-emerald-100 dark:bg-emerald-900/30' :
            colorClass.includes('rose') ? 'bg-rose-100 dark:bg-rose-900/30' :
            colorClass.includes('amber') ? 'bg-amber-100 dark:bg-amber-900/30' :
            'bg-primary/10')}>
            <Icon className={cn("h-5 w-5", colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, any> = {
    PAID: 'paid', PENDING: 'pending', OVERDUE: 'overdue', CANCELLED: 'cancelled'
  }
  return <Badge variant={variantMap[status] || 'default'}>{getStatusLabel(status)}</Badge>
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'INCOME'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
      )}>
        {isIncome
          ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          : <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-xs text-muted-foreground">
          {tx.categoryName || 'Sem categoria'} • {formatDate(tx.transactionDate)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("text-sm font-semibold", isIncome ? 'text-income' : 'text-expense')}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>
        <StatusBadge status={tx.status} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { currentGroupId } = useAuthStore()
  const [groupId, setGroupId] = useState(currentGroupId)

  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = groupId || groups?.[0]?.id

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', activeGroupId],
    queryFn: () => dashboardApi.get(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const { data: shoppingSummary } = useQuery({
    queryKey: ['shopping-summary', activeGroupId],
    queryFn: () => shoppingApi.summary(activeGroupId!),
    enabled: !!activeGroupId,
  })

  if (!activeGroupId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Nenhum grupo familiar encontrado</h2>
        <p className="text-muted-foreground">Crie ou participe de um grupo familiar para começar</p>
        <Button onClick={() => window.location.href = '/family'}>Criar Família</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const kpis = [
    { title: 'Saldo Total', value: formatCurrency(data.totalBalance), icon: Wallet, colorClass: 'text-primary', subtitle: 'Em todas as contas' },
    { title: 'Receitas do Mês', value: formatCurrency(data.monthlyIncome), icon: TrendingUp, colorClass: 'text-emerald-600 dark:text-emerald-400', subtitle: 'Mês atual' },
    { title: 'Despesas do Mês', value: formatCurrency(data.monthlyExpense), icon: TrendingDown, colorClass: 'text-rose-600 dark:text-rose-400', subtitle: 'Mês atual' },
    { title: 'Resultado', value: formatCurrency(data.monthlyResult), icon: ArrowUpDown, colorClass: data.monthlyResult >= 0 ? 'text-emerald-600' : 'text-rose-600', subtitle: data.monthlyResult >= 0 ? 'Saldo positivo' : 'Saldo negativo' },
    { title: 'Total Cartões', value: formatCurrency(data.totalCreditCardsOutstanding), icon: CreditCard, colorClass: 'text-amber-600 dark:text-amber-400', subtitle: 'Faturas abertas' },
    { title: 'Contas Vencidas', value: String(data.overdueCount), icon: AlertTriangle, colorClass: 'text-rose-600 dark:text-rose-400', subtitle: 'Necessitam atenção' },
    { title: 'A Vencer (7d)', value: String(data.dueSoonCount), icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400', subtitle: 'Próximos 7 dias' },
    { title: 'Economia do Mês', value: formatCurrency(data.savingsAmount), icon: PiggyBank, colorClass: 'text-emerald-600 dark:text-emerald-400', subtitle: 'Valor economizado' },
    { title: 'Assinaturas/mês', value: formatCurrency(data.totalMonthlySubscriptions), icon: Tv, colorClass: 'text-blue-600 dark:text-blue-400', subtitle: 'Serviços ativos' },
    { title: 'Recorrentes/mês', value: formatCurrency(data.totalMonthlyRecurringExpenses), icon: Repeat, colorClass: 'text-rose-600 dark:text-rose-400', subtitle: 'Despesas fixas' },
    { title: 'Fixas s/ Receita', value: formatPercent(data.recurringPercentOfIncome ?? 0), icon: Percent, colorClass: 'text-purple-600 dark:text-purple-400', subtitle: 'Assinaturas + recorrentes' },
    { title: 'Supermercado/mês', value: formatCurrency(shoppingSummary?.monthTotal ?? 0), icon: ShoppingCart, colorClass: 'text-emerald-600 dark:text-emerald-400', subtitle: `${shoppingSummary?.monthPurchaseCount ?? 0} compra(s)` },
  ]

  const monthlyData = data.monthlyEvolution.map(item => ({
    month: item.month,
    Receitas: item.income,
    Despesas: item.expense,
    Saldo: item.balance,
  }))

  const pieData = data.expensesByCategory
    .filter(c => c.amount > 0)
    .slice(0, 8)
    .map((c, i) => ({
      name: c.categoryName,
      value: c.amount,
      color: COLORS[i % COLORS.length],
    }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral das suas finanças</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map(kpi => <KPICard key={kpi.title} {...kpi} />)}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly Evolution - takes 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))' }} />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Nenhum gasto registrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent + Upcoming */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos Lançamentos</CardTitle>
            <Button variant="link" size="sm" onClick={() => window.location.href = '/transactions'} className="text-xs p-0 h-auto">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentTransactions.length > 0 ? (
              data.recentTransactions.slice(0, 5).map(tx => <TransactionRow key={tx.id} tx={tx} />)
            ) : (
              <p className="text-center text-muted-foreground text-sm py-6">Nenhum lançamento encontrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            {data.upcomingDue.length > 0 ? (
              data.upcomingDue.slice(0, 5).map(tx => <TransactionRow key={tx.id} tx={tx} />)
            ) : (
              <p className="text-center text-muted-foreground text-sm py-6">Nenhum vencimento próximo</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
