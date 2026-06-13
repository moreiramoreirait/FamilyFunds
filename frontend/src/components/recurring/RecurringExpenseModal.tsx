import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { recurringExpensesApi } from '@/api/recurringExpenses'
import { categoriesApi } from '@/api/categories'
import { accountsApi } from '@/api/accounts'
import type { RecurringExpense } from '@/types'

const NONE = '__none__'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  recurrenceType: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']),
  dueDay: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  autoGenerate: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  expense?: RecurringExpense | null
}

export function RecurringExpenseModal({ open, onClose, groupId, expense }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!expense

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId], queryFn: () => categoriesApi.list(groupId), enabled: !!groupId && open,
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId], queryFn: () => accountsApi.list(groupId), enabled: !!groupId && open,
  })

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recurrenceType: 'MONTHLY', autoGenerate: true },
  })

  useEffect(() => {
    if (expense) {
      reset({
        description: expense.description,
        amount: String(expense.amount),
        recurrenceType: (expense.recurrenceType === 'DAILY' ? 'MONTHLY' : expense.recurrenceType) as any,
        dueDay: expense.dueDay ? String(expense.dueDay) : '',
        startDate: expense.startDate || '',
        endDate: expense.endDate || '',
        categoryId: expense.categoryId || '',
        paymentAccountId: expense.paymentAccountId || '',
        autoGenerate: expense.autoGenerate,
      })
    } else {
      reset({ recurrenceType: 'MONTHLY', autoGenerate: true, description: '', amount: '', dueDay: '', startDate: '', endDate: '', categoryId: '', paymentAccountId: '' })
    }
  }, [expense, open, reset])

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        description: data.description,
        amount: parseFloat(data.amount.replace(',', '.')),
        recurrenceType: data.recurrenceType,
        dueDay: data.dueDay ? parseInt(data.dueDay) : undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        categoryId: data.categoryId || undefined,
        paymentAccountId: data.paymentAccountId || undefined,
        autoGenerate: data.autoGenerate,
      }
      return isEdit
        ? recurringExpensesApi.update(groupId, expense!.id, payload)
        : recurringExpensesApi.create(groupId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: isEdit ? 'Despesa atualizada' : 'Despesa recorrente criada' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao salvar', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Despesa Recorrente' : 'Nova Despesa Recorrente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" placeholder="Ex: Aluguel, Internet, Energia..." {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor *</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
              <Controller name="recurrenceType" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="YEARLY">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dueDay">Dia do vencimento</Label>
              <Input id="dueDay" type="number" min="1" max="31" placeholder="Ex: 5" {...register('dueDay')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Início</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Controller name="categoryId" control={control} render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={v => field.onChange(v === NONE ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta de pagamento</Label>
              <Controller name="paymentAccountId" control={control} render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={v => field.onChange(v === NONE ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Fim (opcional)</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Controller name="autoGenerate" control={control} render={({ field }) => (
                <input id="autoGenerate" type="checkbox" checked={field.value}
                  onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              )} />
              <Label htmlFor="autoGenerate" className="cursor-pointer">Gerar lançamentos automaticamente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
