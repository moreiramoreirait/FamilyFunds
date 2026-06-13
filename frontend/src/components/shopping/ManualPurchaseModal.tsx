import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi, type PurchaseItemPayload } from '@/api/shopping'
import { formatCurrency } from '@/lib/utils'
import type { ShoppingPurchase } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  purchase?: ShoppingPurchase | null
  /** Pré-preenche o link da NFC-e (fluxo fallback de importação). */
  prefillQrUrl?: string
}

interface ItemRow {
  productName: string
  quantity: string
  unitPrice: string
  category: string
}

const emptyRow = (): ItemRow => ({ productName: '', quantity: '1', unitPrice: '', category: '' })
const num = (s: string) => { const n = parseFloat((s || '').replace(',', '.')); return isNaN(n) ? undefined : n }

export function ManualPurchaseModal({ open, onClose, groupId, purchase, prefillQrUrl }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!purchase

  const [storeName, setStoreName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()])

  useEffect(() => {
    if (!open) return
    if (purchase) {
      setStoreName(purchase.storeName || '')
      setPurchaseDate(purchase.purchaseDate || new Date().toISOString().slice(0, 10))
      setNotes(purchase.notes || '')
      setRows(purchase.items.length
        ? purchase.items.map(i => ({
            productName: i.productName,
            quantity: i.quantity != null ? String(i.quantity) : '1',
            unitPrice: i.unitPrice != null ? String(i.unitPrice) : '',
            category: i.category || '',
          }))
        : [emptyRow()])
    } else {
      setStoreName('')
      setPurchaseDate(new Date().toISOString().slice(0, 10))
      setNotes(prefillQrUrl ? `NFC-e: ${prefillQrUrl}` : '')
      setRows([emptyRow()])
    }
  }, [purchase, open, prefillQrUrl])

  const itemsTotal = rows.reduce((acc, r) => {
    const q = num(r.quantity) ?? 0, p = num(r.unitPrice) ?? 0
    return acc + q * p
  }, 0)

  const setRow = (idx: number, patch: Partial<ItemRow>) =>
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r))

  const mutation = useMutation({
    mutationFn: () => {
      const items: PurchaseItemPayload[] = rows
        .filter(r => r.productName.trim())
        .map(r => {
          const quantity = num(r.quantity)
          const unitPrice = num(r.unitPrice)
          return {
            productName: r.productName.trim(),
            category: r.category.trim() || undefined,
            quantity,
            unitPrice,
            totalPrice: quantity != null && unitPrice != null ? quantity * unitPrice : undefined,
          }
        })
      const payload = {
        storeName: storeName.trim(),
        purchaseDate,
        totalAmount: itemsTotal > 0 ? itemsTotal : undefined,
        notes: notes.trim() || undefined,
        qrCodeUrl: prefillQrUrl || undefined,
        items,
      }
      return isEdit
        ? shoppingApi.updatePurchase(groupId, purchase!.id, payload)
        : shoppingApi.createManual(groupId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-price-history'] })
      toast({ title: isEdit ? 'Compra atualizada' : 'Compra cadastrada' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao salvar compra', variant: 'destructive' }),
  })

  const canSubmit = storeName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar compra' : 'Nova compra manual'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="storeName">Mercado *</Label>
              <Input id="storeName" placeholder="Ex: Carrefour" value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate">Data</Label>
              <Input id="purchaseDate" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <span className="text-xs text-muted-foreground">Total: <strong>{formatCurrency(itemsTotal)}</strong></span>
            </div>
            <div className="space-y-2">
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_64px_88px_auto] gap-2 items-center">
                  <Input placeholder="Produto" value={r.productName} onChange={e => setRow(idx, { productName: e.target.value })} />
                  <Input placeholder="Qtd" type="number" step="0.001" min="0" value={r.quantity} onChange={e => setRow(idx, { quantity: e.target.value })} />
                  <Input placeholder="Vlr unit." type="number" step="0.01" min="0" value={r.unitPrice} onChange={e => setRow(idx, { unitPrice: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9"
                    onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setRows(rs => [...rs, emptyRow()])}>
              <Plus className="h-4 w-4" /> Adicionar item
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" placeholder="Opcional" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <p className="text-xs text-muted-foreground">
            A compra não gera despesa automaticamente. Depois de salvar, use <strong>Gerar despesa</strong> para lançar um único valor total nas transações.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Atualizar' : 'Salvar compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
