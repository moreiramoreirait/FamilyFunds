import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, TrendingUp, TrendingDown, ArrowUpDown, CheckCircle2, Pencil } from 'lucide-react'
import { transactionsApi } from '@/api/transactions'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { TransactionModal } from '@/components/transactions/TransactionModal'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', activeGroupId, page],
    queryFn: () => transactionsApi.list(activeGroupId!, page, 20),
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
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lançamentos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
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
