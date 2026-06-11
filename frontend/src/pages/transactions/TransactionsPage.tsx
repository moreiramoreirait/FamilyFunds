import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, X, TrendingUp, TrendingDown, ArrowUpDown, CheckCircle2, Pencil } from 'lucide-react'
import { transactionsApi, type TransactionFilters } from '@/api/transactions'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { TransactionModal } from '@/components/transactions/TransactionModal'

const ALL = '__all__'

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, any> = {
    PAID: 'paid', PENDING: 'pending', OVERDUE: 'overdue', CANCELLED: 'cancelled'
  }
  return <Badge variant={variantMap[status] || 'default'} className="text-xs">{getStatusLabel(status)}</Badge>
}

export default function TransactionsPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', activeGroupId],
    queryFn: () => accountsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', activeGroupId],
    queryFn: () => categoriesApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', activeGroupId],
    queryFn: () => tagsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const updateFilter = (key: keyof TransactionFilters, value?: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }
  const clearFilters = () => { setFilters({}); setPage(0) }
  const hasFilters = Object.values(filters).some(Boolean)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', activeGroupId, page, filters],
    queryFn: () => transactionsApi.list(activeGroupId!, page, 20, filters),
    enabled: !!activeGroupId,
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => transactionsApi.markAsPaid(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Lançamento marcado como pago!' })
    },
    onError: () => toast({ title: 'Erro ao marcar como pago', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Lançamento cancelado' })
    },
    onError: () => toast({ title: 'Erro ao cancelar lançamento', variant: 'destructive' }),
  })

  const transactions = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  const filtered = transactions.filter(t =>
    search === '' || t.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lançamentos</h1>
          <p className="text-muted-foreground text-sm">{totalElements} lançamentos encontrados</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filters.type ?? ALL} onValueChange={v => updateFilter('type', v === ALL ? undefined : v)}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                <SelectItem value="INCOME">Receita</SelectItem>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
                <SelectItem value="TRANSFER">Transferência</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status ?? ALL} onValueChange={v => updateFilter('status', v === ALL ? undefined : v)}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.accountId ?? ALL} onValueChange={v => updateFilter('accountId', v === ALL ? undefined : v)}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as contas</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.categoryId ?? ALL} onValueChange={v => updateFilter('categoryId', v === ALL ? undefined : v)}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.tagId ?? ALL} onValueChange={v => updateFilter('tagId', v === ALL ? undefined : v)}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as tags</SelectItem>
                {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={e => updateFilter('startDate', e.target.value || undefined)}
              className="w-40 h-9"
              title="Data inicial"
            />
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={e => updateFilter('endDate', e.target.value || undefined)}
              className="w-40 h-9"
              title="Data final"
            />

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={clearFilters}>
                <X className="h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Todos os lançamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowUpDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum lançamento</h3>
              <p className="text-muted-foreground text-sm">Comece adicionando seu primeiro lançamento</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(tx => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onMarkPaid={() => markPaidMutation.mutate({ id: tx.id })}
                  onDelete={() => deleteMutation.mutate(tx.id)}
                  onEdit={() => setEditTx(tx)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <TransactionModal
        open={modalOpen || !!editTx}
        onClose={() => { setModalOpen(false); setEditTx(null) }}
        transaction={editTx}
      />
    </div>
  )
}

function TransactionRow({ tx, onMarkPaid, onDelete, onEdit }: { tx: Transaction; onMarkPaid: () => void; onDelete: () => void; onEdit: () => void }) {
  const isIncome = tx.type === 'INCOME'
  const isTransfer = tx.type === 'TRANSFER'

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
        isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' :
        isTransfer ? 'bg-blue-100 dark:bg-blue-900/30' :
        'bg-rose-100 dark:bg-rose-900/30'
      )}>
        {isIncome ? <TrendingUp className="h-4 w-4 text-emerald-600" /> :
         isTransfer ? <ArrowUpDown className="h-4 w-4 text-blue-600" /> :
         <TrendingDown className="h-4 w-4 text-rose-600" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{tx.description}</p>
          {tx.isInstallment && tx.installmentNumber && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {tx.installmentNumber}/{tx.installmentTotal}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)}</span>
          {tx.categoryName && (
            <>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground">{tx.categoryName}</span>
            </>
          )}
          {tx.accountName && (
            <>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground">{tx.accountName}</span>
            </>
          )}
        </div>
        {tx.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tx.tags.map(tag => {
              const color = tag.color || '#6b7280'
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                  style={{ backgroundColor: color + '22', color }}
                >
                  {tag.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={cn("text-sm font-bold", isIncome ? 'text-income' : 'text-expense')}>
            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
          </p>
          <div className="mt-0.5">
            <StatusBadge status={tx.status} />
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {tx.status === 'PENDING' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar como pago" onClick={onMarkPaid}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={onEdit}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  )
}
