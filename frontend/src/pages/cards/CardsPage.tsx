import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CreditCard as CreditCardIcon, ChevronRight } from 'lucide-react'
import { creditCardsApi, type CreditCard, type CreditCardInvoice, type CreditCardPayload } from '@/api/creditCards'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CARD_BRANDS = ['Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners', 'Outro']
const BRAND_COLORS: Record<string, string> = {
  Visa: 'from-blue-600 to-blue-800',
  Mastercard: 'from-red-500 to-orange-600',
  'American Express': 'from-green-600 to-emerald-800',
  Elo: 'from-yellow-500 to-orange-500',
  Hipercard: 'from-red-700 to-red-900',
  Diners: 'from-gray-600 to-gray-800',
  Outro: 'from-purple-600 to-purple-800',
}

function CardForm({ card, onSave, onClose }: {
  card?: CreditCard | null; onSave: (data: CreditCardPayload) => void; onClose: () => void
}) {
  const [form, setForm] = useState<CreditCardPayload>({
    name: card?.name || '',
    brand: card?.brand || 'Visa',
    lastFourDigits: card?.lastFourDigits || '',
    creditLimit: card?.creditLimit || 0,
    closingDay: card?.closingDay || 10,
    dueDay: card?.dueDay || 20,
  })

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome do Cartão</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Visa Bradesco" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Bandeira</Label>
          <Select value={form.brand} onValueChange={v => setForm(f => ({ ...f, brand: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARD_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Últimos 4 dígitos</Label>
          <Input maxLength={4} value={form.lastFourDigits} onChange={e => setForm(f => ({ ...f, lastFourDigits: e.target.value }))} placeholder="1234" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Limite (R$)</Label>
        <Input type="number" step="0.01" min="0" value={form.creditLimit || ''} onChange={e => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) }))} placeholder="0,00" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Dia de fechamento</Label>
          <Input type="number" min="1" max="31" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: parseInt(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Dia de vencimento</Label>
          <Input type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: parseInt(e.target.value) }))} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    OPEN: { label: 'Aberta', variant: 'pending' },
    CLOSED: { label: 'Fechada', variant: 'default' },
    PAID: { label: 'Paga', variant: 'paid' },
    OVERDUE: { label: 'Vencida', variant: 'overdue' },
  }
  const { label, variant } = map[status] || { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function CardDetail({ card, groupId }: { card: CreditCard; groupId: string }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', groupId, card.id],
    queryFn: () => creditCardsApi.getInvoices(groupId, card.id),
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId],
    queryFn: () => accountsApi.list(groupId),
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [payingInvoice, setPayingInvoice] = useState<CreditCardInvoice | null>(null)
  const [payAccountId, setPayAccountId] = useState('')

  const payMutation = useMutation({
    mutationFn: () => creditCardsApi.payInvoice(groupId, payingInvoice!.id, payAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({ title: 'Fatura paga com sucesso!' })
      setPayingInvoice(null)
    },
  })

  const usedPercent = card.creditLimit > 0
    ? Math.round(((card.creditLimit - card.availableLimit) / card.creditLimit) * 100)
    : 0

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Limite usado</span>
          <span className="font-medium">{formatCurrency(card.creditLimit - card.availableLimit)} / {formatCurrency(card.creditLimit)}</span>
        </div>
        <Progress value={usedPercent} className={cn(usedPercent > 80 ? '[&>div]:bg-rose-500' : usedPercent > 60 ? '[&>div]:bg-amber-500' : '')} />
        <p className="text-xs text-muted-foreground">Disponível: <span className="font-medium text-emerald-600">{formatCurrency(card.availableLimit)}</span></p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Faturas Recentes</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura</p>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 6).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(inv.referenceYear, inv.referenceMonth - 1), 'MMMM yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">Vence: {format(parseISO(inv.dueDate), 'dd/MM/yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  {['OPEN', 'CLOSED', 'OVERDUE'].includes(inv.status) && (
                    <Button size="sm" variant="outline" onClick={() => setPayingInvoice(inv)}>Pagar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!payingInvoice} onOpenChange={o => !o && setPayingInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagar Fatura</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Valor: <span className="font-bold">{formatCurrency(payingInvoice?.totalAmount || 0)}</span></p>
            <div className="space-y-1.5">
              <Label>Conta de pagamento</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingInvoice(null)}>Cancelar</Button>
            <Button disabled={!payAccountId || payMutation.isPending} onClick={() => payMutation.mutate()}>
              {payMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CardsPage() {
  const { currentGroupId } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editCard, setEditCard] = useState<CreditCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards', currentGroupId],
    queryFn: () => creditCardsApi.list(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreditCardPayload) => creditCardsApi.create(currentGroupId!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credit-cards'] }); setModalOpen(false); toast({ title: 'Cartão criado!' }) },
  })
  const updateMutation = useMutation({
    mutationFn: (data: CreditCardPayload) => creditCardsApi.update(currentGroupId!, editCard!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credit-cards'] }); setEditCard(null); toast({ title: 'Cartão atualizado!' }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => creditCardsApi.delete(currentGroupId!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credit-cards'] }); toast({ title: 'Cartão removido' }) },
  })

  const activeCard = cards.find(c => c.id === selectedCard)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie seus cartões e faturas</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cartão
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CreditCardIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum cartão cadastrado</p>
            <Button onClick={() => setModalOpen(true)} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Adicionar Cartão</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {cards.map(card => (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all bg-gradient-to-br text-white',
                  BRAND_COLORS[card.brand] || 'from-gray-600 to-gray-800',
                  selectedCard === card.id ? 'ring-2 ring-white/30 shadow-xl scale-[1.02]' : 'hover:scale-[1.01] shadow-md'
                )}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-white/70 text-xs">{card.brand}</p>
                    <p className="font-bold">{card.name}</p>
                  </div>
                  <CreditCardIcon className="h-6 w-6 text-white/70" />
                </div>
                <p className="text-lg font-mono tracking-widest mb-4">•••• •••• •••• {card.lastFourDigits}</p>
                <div className="flex justify-between text-xs text-white/80">
                  <span>Limite: {formatCurrency(card.creditLimit)}</span>
                  <span>Fecha dia {card.closingDay}</span>
                </div>
                {selectedCard === card.id && <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />}
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {activeCard ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{activeCard.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditCard(activeCard)}>Editar</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate(activeCard.id)}>Remover</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDetail card={activeCard} groupId={currentGroupId!} />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <CreditCardIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground text-sm">Selecione um cartão para ver detalhes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog open={modalOpen || !!editCard} onOpenChange={o => { if (!o) { setModalOpen(false); setEditCard(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle>
          </DialogHeader>
          <CardForm
            card={editCard}
            onSave={data => editCard ? updateMutation.mutate(data) : createMutation.mutate(data)}
            onClose={() => { setModalOpen(false); setEditCard(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
