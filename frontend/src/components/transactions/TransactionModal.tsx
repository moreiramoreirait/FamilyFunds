import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { transactionsApi } from '@/api/transactions'
import { categoriesApi } from '@/api/categories'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  transactionDate: z.string().min(1, 'Data é obrigatória'),
  dueDate: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
  notes: z.string().optional(),
  isInstallment: z.boolean().default(false),
  installments: z.string().optional(),
  isRecurrent: z.boolean().default(false),
  recurrenceType: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
  defaultType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}

export function TransactionModal({ open, onClose, transaction, defaultType = 'EXPENSE' }: Props) {
  const { currentGroupId } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!transaction

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', currentGroupId],
    queryFn: () => categoriesApi.list(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentGroupId],
    queryFn: () => accountsApi.list(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const {
    register, handleSubmit, control, watch, reset, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      status: 'PENDING',
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      isInstallment: false,
      isRecurrent: false,
    },
  })

  useEffect(() => {
    if (transaction) {
      reset({
        description: transaction.description,
        amount: String(transaction.amount),
        type: transaction.type as any,
        transactionDate: transaction.transactionDate,
        dueDate: transaction.dueDate || '',
        categoryId: transaction.categoryId || '',
        accountId: transaction.accountId || '',
        status: transaction.status as any,
        notes: transaction.notes || '',
        isInstallment: false,
        isRecurrent: false,
      })
    } else {
      reset({
        type: defaultType,
        status: 'PENDING',
        transactionDate: format(new Date(), 'yyyy-MM-dd'),
        isInstallment: false,
        isRecurrent: false,
      })
    }
  }, [transaction, defaultType, reset])

  const selectedType = watch('type')
  const isInstallment = watch('isInstallment')
  const isRecurrent = watch('isRecurrent')

  const mutation = useMutation<unknown, Error, FormData>({
    mutationFn: (data: FormData) => {
      const payload = {
        description: data.description,
        amount: parseFloat(data.amount.replace(',', '.')),
        type: data.type,
        transactionDate: data.transactionDate,
        dueDate: data.dueDate || undefined,
        categoryId: data.categoryId || undefined,
        accountId: data.accountId || undefined,
        status: data.status,
        notes: data.notes || undefined,
        installmentCount: isInstallment ? parseInt(data.installments || '1') : undefined,
      }
      return isEdit
        ? transactionsApi.update(currentGroupId!, transaction!.id, payload)
        : isInstallment
          ? transactionsApi.createInstallments(currentGroupId!, payload)
          : transactionsApi.create(currentGroupId!, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({
        title: isEdit ? 'Lançamento atualizado' : 'Lançamento criado',
        description: isEdit ? 'As alterações foram salvas.' : 'O lançamento foi adicionado com sucesso.',
      })
      onClose()
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o lançamento.', variant: 'destructive' })
    },
  })

  const filteredCategories = categories.filter(c =>
    c.type === selectedType || c.type === 'BOTH'
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map(t => (
              <Controller key={t} name="type" control={control} render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(t)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-sm font-medium border transition-colors',
                    field.value === t
                      ? t === 'INCOME' ? 'bg-emerald-500 text-white border-emerald-500'
                        : t === 'EXPENSE' ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-blue-500 text-white border-blue-500'
                      : 'bg-transparent border-border hover:bg-muted'
                  )}
                >
                  {t === 'INCOME' ? 'Receita' : t === 'EXPENSE' ? 'Despesa' : 'Transferência'}
                </button>
              )} />
            ))}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" placeholder="Ex: Aluguel, Supermercado..." {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register('amount')}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transactionDate">Data *</Label>
              <Input id="transactionDate" type="date" {...register('transactionDate')} />
              {errors.transactionDate && <p className="text-xs text-destructive">{errors.transactionDate.message}</p>}
            </div>
          </div>

          {/* Category + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Controller name="categoryId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Controller name="accountId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {/* Status + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>

          {/* Installment toggle */}
          {!isEdit && (
            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer" htmlFor="isInstallment">Parcelado</Label>
                <Controller name="isInstallment" control={control} render={({ field }) => (
                  <input
                    id="isInstallment"
                    type="checkbox"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                )} />
              </div>
              {isInstallment && (
                <div className="space-y-1.5">
                  <Label htmlFor="installments">Número de parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="2"
                    max="60"
                    placeholder="Ex: 12"
                    {...register('installments')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Observações opcionais..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                selectedType === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600' :
                selectedType === 'EXPENSE' ? 'bg-rose-500 hover:bg-rose-600' : ''
              )}
            >
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
