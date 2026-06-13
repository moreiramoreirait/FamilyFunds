import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Plus, Trash2, CheckCircle2, Circle, ShoppingCart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi, type ListItemPayload } from '@/api/shopping'
import { formatCurrency, cn } from '@/lib/utils'
import type { ShoppingList } from '@/types'

const num = (s: string) => { const n = parseFloat((s || '').replace(',', '.')); return isNaN(n) ? undefined : n }

interface NewRow { productName: string; quantity: string; estimatedUnitPrice: string }
const emptyRow = (): NewRow => ({ productName: '', quantity: '1', estimatedUnitPrice: '' })

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  list?: ShoppingList | null
  onConverted?: (purchaseId: string) => void
}

export function ShoppingListModal({ open, onClose, groupId, list, onConverted }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!list
  const listId = list?.id

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<NewRow[]>([emptyRow()])
  // novo item (modo edição)
  const [newItem, setNewItem] = useState<NewRow>(emptyRow())

  // Em modo edição, busca a lista fresca (itens atualizados)
  const { data: fresh } = useQuery({
    queryKey: ['shopping-list', groupId, listId],
    queryFn: () => shoppingApi.getList(groupId, listId!),
    enabled: !!groupId && !!listId && open,
    initialData: list ?? undefined,
  })

  useEffect(() => {
    if (!open) return
    if (list) {
      setName(list.name); setDescription(list.description || '')
    } else {
      setName(''); setDescription(''); setRows([emptyRow()])
    }
  }, [list, open])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })
    if (listId) queryClient.invalidateQueries({ queryKey: ['shopping-list', groupId, listId] })
  }

  // ─── Criar lista nova ───
  const createM = useMutation({
    mutationFn: () => {
      const items: ListItemPayload[] = rows.filter(r => r.productName.trim()).map(r => ({
        productName: r.productName.trim(),
        quantity: num(r.quantity),
        estimatedUnitPrice: num(r.estimatedUnitPrice),
      }))
      return shoppingApi.createList(groupId, { name: name.trim(), description: description.trim() || undefined, items })
    },
    onSuccess: () => { invalidate(); toast({ title: 'Lista criada' }); onClose() },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao criar lista', variant: 'destructive' }),
  })

  // ─── Editar nome/descrição ───
  const updateMetaM = useMutation({
    mutationFn: () => shoppingApi.updateList(groupId, listId!, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => { invalidate(); toast({ title: 'Lista atualizada' }) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const addItemM = useMutation({
    mutationFn: () => shoppingApi.addListItem(groupId, listId!, {
      productName: newItem.productName.trim(),
      quantity: num(newItem.quantity),
      estimatedUnitPrice: num(newItem.estimatedUnitPrice),
    }),
    onSuccess: () => { invalidate(); setNewItem(emptyRow()) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const updateItemM = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: ListItemPayload }) =>
      shoppingApi.updateListItem(groupId, listId!, itemId, data),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const deleteItemM = useMutation({
    mutationFn: (itemId: string) => shoppingApi.deleteListItem(groupId, listId!, itemId),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const convertM = useMutation({
    mutationFn: () => shoppingApi.convertList(groupId, listId!),
    onSuccess: (purchase) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
      toast({ title: 'Lista convertida em compra (rascunho)' })
      onClose()
      onConverted?.(purchase.id)
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao converter', variant: 'destructive' }),
  })

  const setRow = (idx: number, patch: Partial<NewRow>) =>
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r))

  const items = fresh?.items ?? []
  const converted = !!fresh?.convertedPurchaseId
  const newTotal = rows.reduce((a, r) => a + (num(r.quantity) ?? 0) * (num(r.estimatedUnitPrice) ?? 0), 0)

  const toggleItem = (itemId: string, current: boolean) => {
    const it = items.find(i => i.id === itemId)
    if (!it) return
    updateItemM.mutate({ itemId, data: {
      productName: it.productName, category: it.category, quantity: it.quantity, unit: it.unit,
      estimatedUnitPrice: it.estimatedUnitPrice, preferredStore: it.preferredStore,
      realUnitPrice: it.realUnitPrice, checked: !current,
    } })
  }
  const setRealPrice = (itemId: string, value: string) => {
    const it = items.find(i => i.id === itemId)
    if (!it) return
    updateItemM.mutate({ itemId, data: {
      productName: it.productName, category: it.category, quantity: it.quantity, unit: it.unit,
      estimatedUnitPrice: it.estimatedUnitPrice, preferredStore: it.preferredStore,
      checked: it.checked, realUnitPrice: num(value),
    } })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'Lista de compras' : 'Nova lista'}
            {converted && <Badge variant="paid">Convertida</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">Nome *</Label>
              <Input id="list-name" placeholder="Ex: Compras do mês" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-desc">Descrição</Label>
              <Input id="list-desc" placeholder="Opcional" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {!isEdit ? (
            // ─── Criação: editor de itens local ───
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <span className="text-xs text-muted-foreground">Estimado: <strong>{formatCurrency(newTotal)}</strong></span>
              </div>
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_64px_88px_auto] gap-2 items-center">
                  <Input placeholder="Produto" value={r.productName} onChange={e => setRow(idx, { productName: e.target.value })} />
                  <Input placeholder="Qtd" type="number" step="0.001" min="0" value={r.quantity} onChange={e => setRow(idx, { quantity: e.target.value })} />
                  <Input placeholder="Vlr est." type="number" step="0.01" min="0" value={r.estimatedUnitPrice} onChange={e => setRow(idx, { estimatedUnitPrice: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9"
                    onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setRows(rs => [...rs, emptyRow()])}>
                <Plus className="h-4 w-4" /> Adicionar item
              </Button>
            </div>
          ) : (
            // ─── Edição: checklist com itens persistidos ───
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens ({items.length})</Label>
                <span className="text-xs text-muted-foreground">Estimado: <strong>{formatCurrency(fresh?.estimatedTotal ?? 0)}</strong></span>
              </div>
              <div className="divide-y divide-border rounded-lg border border-border">
                {items.length === 0 && <p className="text-sm text-muted-foreground p-3">Nenhum item ainda.</p>}
                {items.map(it => (
                  <div key={it.id} className="flex items-center gap-2 px-3 py-2">
                    <button type="button" disabled={converted} onClick={() => toggleItem(it.id, it.checked)} title="Marcar como comprado">
                      {it.checked
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm truncate', it.checked && 'line-through text-muted-foreground')}>{it.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.quantity ?? 1} {it.unit || 'un'}
                        {it.estimatedUnitPrice != null && ` · est. ${formatCurrency(it.estimatedUnitPrice)}`}
                        {it.lastPaidPrice != null && ` · últ. ${formatCurrency(it.lastPaidPrice)}`}
                      </p>
                    </div>
                    <Input className="w-24 h-8" placeholder="Vlr real" type="number" step="0.01" min="0"
                      disabled={converted}
                      defaultValue={it.realUnitPrice != null ? String(it.realUnitPrice) : ''}
                      onBlur={e => { if (e.target.value !== (it.realUnitPrice != null ? String(it.realUnitPrice) : '')) setRealPrice(it.id, e.target.value) }} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={converted}
                      onClick={() => deleteItemM.mutate(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {!converted && (
                <div className="grid grid-cols-[1fr_64px_88px_auto] gap-2 items-center pt-1">
                  <Input placeholder="Novo item" value={newItem.productName} onChange={e => setNewItem(v => ({ ...v, productName: e.target.value }))} />
                  <Input placeholder="Qtd" type="number" step="0.001" min="0" value={newItem.quantity} onChange={e => setNewItem(v => ({ ...v, quantity: e.target.value }))} />
                  <Input placeholder="Vlr est." type="number" step="0.01" min="0" value={newItem.estimatedUnitPrice} onChange={e => setNewItem(v => ({ ...v, estimatedUnitPrice: e.target.value }))} />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={!newItem.productName.trim() || addItemM.isPending}
                    onClick={() => addItemM.mutate()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            A lista é só um guia — <strong>não gera despesa</strong>. Ao converter em compra, você revisa e decide se lança a despesa.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && !converted && (
            <Button type="button" variant="outline" className="gap-2 mr-auto" disabled={convertM.isPending || items.length === 0}
              onClick={() => convertM.mutate()}>
              {convertM.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Converter em compra
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          {!isEdit ? (
            <Button type="button" disabled={!name.trim() || createM.isPending} onClick={() => createM.mutate()}>
              {createM.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Criar lista
            </Button>
          ) : (
            <Button type="button" disabled={!name.trim() || updateMetaM.isPending} onClick={() => updateMetaM.mutate()}>
              {updateMetaM.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Salvar nome
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
