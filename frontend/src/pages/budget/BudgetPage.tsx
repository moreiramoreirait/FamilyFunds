import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { budgetsApi, type Budget, type BudgetPayload } from '@/api/budgets'
import { categoriesApi } from '@/api/categories'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function BudgetModal({
  open, onClose, onSave, groupId, month, year
}: {
  open: boolean; onClose: () => void; onSave: (data: BudgetPayload) => void
  groupId: string; month: number; year: number
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [alertPercentage, setAlertPercentage] = useState('80')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => categoriesApi.list(groupId),
  })

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      categoryId: categoryId || undefined,
      amount: parseFloat(amount),
      month,
      year,
      alertPercentage: parseInt(alertPercentage),
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Orçamento — {MONTHS[month - 1]}/{year}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Todas as despesas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Total geral</SelectItem>
                {expenseCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Limite (R$)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0,00" required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Alertar ao atingir (%)</Label>
            <Input
              type="number" min="1" max="100"
              value={alertPercentage} onChange={e => setAlertPercentage(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Criar Orçamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BudgetCard({ budget, onDelete }: { budget: Budget; onDelete: () => void }) {
  const pct = Math.min(Math.round(Number(budget.percentage)), 100)
  const isAlert = budget.alertTriggered
  const isOver = pct >= 100

  return (
    <Card className={cn('transition-shadow', isAlert ? 'border-amber-500/50' : '', isOver ? 'border-rose-500/50' : '')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              {(isAlert || isOver) && (
                <AlertTriangle className={cn('h-4 w-4', isOver ? 'text-rose-500' : 'text-amber-500')} />
              )}
              <p className="font-semibold text-sm">{budget.categoryName}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Limite: {formatCurrency(budget.amount)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Progress
          value={pct}
          className={cn(
            'h-2 mb-2',
            isOver ? '[&>div]:bg-rose-500' : isAlert ? '[&>div]:bg-amber-500' : ''
          )}
        />

        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', isOver ? 'text-rose-600' : 'text-muted-foreground')}>
            {formatCurrency(budget.spent)} gastos
          </span>
          <span className={cn('font-medium', isOver ? 'text-rose-600 font-bold' : '')}>
            {pct}%
          </span>
          <span className={cn('font-medium', budget.remaining < 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {budget.remaining >= 0 ? `Restam ${formatCurrency(budget.remaining)}` : `${formatCurrency(Math.abs(budget.remaining))} excedido`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BudgetPage() {
  const { currentGroupId } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', currentGroupId, month, year],
    queryFn: () => budgetsApi.list(currentGroupId!, month, year),
    enabled: !!currentGroupId,
  })

  const createMutation = useMutation({
    mutationFn: (data: BudgetPayload) => budgetsApi.create(currentGroupId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast({ title: 'Orçamento criado com sucesso!' })
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(currentGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast({ title: 'Orçamento removido' })
    },
  })

  const navigateMonth = (dir: number) => {
    let m = month + dir
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0)
  const alertCount = budgets.filter(b => b.alertTriggered).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Controle seus limites de gastos mensais</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[140px] text-center">
          {MONTHS[month - 1]} / {year}
        </span>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Orçado</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Gasto</p>
            <p className={cn('text-xl font-bold mt-1', totalSpent > totalBudget ? 'text-rose-600' : '')}>{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Alertas</p>
            <p className={cn('text-xl font-bold mt-1', alertCount > 0 ? 'text-amber-600' : '')}>{alertCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget list */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum orçamento para este mês</p>
            <p className="text-sm text-muted-foreground mt-1">Crie orçamentos para controlar seus gastos</p>
            <Button onClick={() => setModalOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar Orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              onDelete={() => deleteMutation.mutate(b.id)}
            />
          ))}
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        groupId={currentGroupId!}
        month={month}
        year={year}
      />
    </div>
  )
}
