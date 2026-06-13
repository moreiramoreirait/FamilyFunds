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
import { serviceSubscriptionsApi } from '@/api/serviceSubscriptions'
import { categoriesApi } from '@/api/categories'
import { accountsApi } from '@/api/accounts'
import { creditCardsApi } from '@/api/creditCards'
import type { ServiceSubscription } from '@/types'

const NONE = '__none__'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  recurrenceType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  billingDay: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  creditCardId: z.string().optional(),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  subscription?: ServiceSubscription | null
}

export function SubscriptionModal({ open, onClose, groupId, subscription }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!subscription

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId], queryFn: () => categoriesApi.list(groupId), enabled: !!groupId && open,
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId], queryFn: () => accountsApi.list(groupId), enabled: !!groupId && open,
  })
  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards', groupId], queryFn: () => creditCardsApi.list(groupId), enabled: !!groupId && open,
  })

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recurrenceType: 'MONTHLY' },
  })

  useEffect(() => {
    if (subscription) {
      reset({
        name: subscription.name,
        amount: String(subscription.amount),
        recurrenceType: (subscription.recurrenceType === 'DAILY' ? 'MONTHLY' : subscription.recurrenceType) as any,
        billingDay: subscription.billingDay ? String(subscription.billingDay) : '',
        startDate: subscription.startDate || '',
        endDate: subscription.endDate || '',
        categoryId: subscription.categoryId || '',
        paymentAccountId: subscription.paymentAccountId || '',
        creditCardId: subscription.creditCardId || '',
        description: subscription.description || '',
      })
    } else {
      reset({ recurrenceType: 'MONTHLY', name: '', amount: '', billingDay: '', startDate: '', endDate: '', categoryId: '', paymentAccountId: '', creditCardId: '', description: '' })
    }
  }, [subscription, open, reset])

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        amount: parseFloat(data.amount.replace(',', '.')),
        recurrenceType: data.recurrenceType,
        billingDay: data.billingDay ? parseInt(data.billingDay) : undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        categoryId: data.categoryId || undefined,
        paymentAccountId: data.paymentAccountId || undefined,
        creditCardId: data.creditCardId || undefined,
      }
      return isEdit
        ? serviceSubscriptionsApi.update(groupId, subscription!.id, payload)
        : serviceSubscriptionsApi.create(groupId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['service-subscriptions-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: isEdit ? 'Assinatura atualizada' : 'Assinatura criada' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao salvar assinatura', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" placeholder="Ex: Netflix, Spotify..." {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="YEARLY">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="billingDay">Dia da cobrança</Label>
              <Input id="billingDay" type="number" min="1" max="31" placeholder="Ex: 10" {...register('billingDay')} />
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
              <Label>Cartão de crédito</Label>
              <Controller name="creditCardId" control={control} render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={v => field.onChange(v === NONE ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Fim (opcional)</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Observações..." {...register('description')} />
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
