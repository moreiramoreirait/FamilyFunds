import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi } from '@/api/shopping'
import { categoriesApi } from '@/api/categories'
import { accountsApi } from '@/api/accounts'
import { creditCardsApi } from '@/api/creditCards'
import { formatCurrency, cn } from '@/lib/utils'
import type { ShoppingPurchase, TransactionStatus } from '@/types'

const NONE = '__none__'

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  purchase: ShoppingPurchase
}

export function GenerateTransactionModal({ open, onClose, groupId, purchase }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [status, setStatus] = useState<TransactionStatus>('PAID')
  const [accountId, setAccountId] = useState(purchase.accountId || '')
  const [creditCardId, setCreditCardId] = useState(purchase.creditCardId || '')
  const [categoryId, setCategoryId] = useState(purchase.categoryId || '')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId], queryFn: () => categoriesApi.list(groupId), enabled: !!groupId && open,
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId], queryFn: () => accountsApi.list(groupId), enabled: !!groupId && open,
  })
  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards', groupId], queryFn: () => creditCardsApi.list(groupId), enabled: !!groupId && open,
  })

  const mutation = useMutation({
    mutationFn: () => shoppingApi.generateTransaction(groupId, purchase.id, {
      status,
      accountId: accountId || undefined,
      creditCardId: creditCardId || undefined,
      categoryId: categoryId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast({ title: 'Despesa lançada nas transações' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao gerar despesa', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar despesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background"><Wallet className="h-4 w-4 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Lançamento único · valor total</p>
              <p className="text-lg font-bold truncate">{formatCurrency(purchase.totalAmount ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Situação da despesa</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStatus('PAID')}
                className={cn('rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  status === 'PAID' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 'border-border hover:bg-muted')}>
                Paga (debita saldo)
              </button>
              <button type="button" onClick={() => setStatus('PENDING')}
                className={cn('rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  status === 'PENDING' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20' : 'border-border hover:bg-muted')}>
                Pendente
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Select value={accountId || NONE} onValueChange={v => setAccountId(v === NONE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhuma</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {status === 'PAID' && !accountId && (
              <p className="text-xs text-amber-600">Sem conta, a despesa não debita saldo.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <Select value={creditCardId || NONE} onValueChange={v => setCreditCardId(v === NONE ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId || NONE} onValueChange={v => setCategoryId(v === NONE ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Padrão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Padrão (Alimentação)</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Lançar despesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
