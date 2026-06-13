import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Pencil, Trash2, CheckCircle2, Wallet, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi } from '@/api/shopping'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ShoppingPurchase, PurchaseStatus } from '@/types'
import { GenerateTransactionModal } from './GenerateTransactionModal'
import { ManualPurchaseModal } from './ManualPurchaseModal'

const statusMap: Record<PurchaseStatus, { label: string; variant: any }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'pending' },
  FINALIZADA: { label: 'Finalizada', variant: 'default' },
  LANCADA_NO_FINANCEIRO: { label: 'Lançada no financeiro', variant: 'paid' },
  CANCELADA: { label: 'Cancelada', variant: 'cancelled' },
}

const sourceLabel: Record<string, string> = {
  MANUAL: 'Manual', QR_CODE: 'QR Code', NFC_URL: 'Link NFC-e', SHOPPING_LIST: 'De uma lista',
}

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  purchaseId: string
}

export function PurchaseDetailModal({ open, onClose, groupId, purchaseId }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [genOpen, setGenOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['shopping-purchase', groupId, purchaseId],
    queryFn: () => shoppingApi.getPurchase(groupId, purchaseId),
    enabled: !!groupId && !!purchaseId && open,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shopping-purchase', groupId, purchaseId] })
    queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
    queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
  }

  const finalizeM = useMutation({
    mutationFn: () => shoppingApi.finalizePurchase(groupId, purchaseId),
    onSuccess: () => { invalidate(); toast({ title: 'Compra finalizada' }) },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const deleteM = useMutation({
    mutationFn: () => shoppingApi.deletePurchase(groupId, purchaseId),
    onSuccess: () => { invalidate(); toast({ title: 'Compra excluída' }); onClose() },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' }),
  })

  const st = purchase ? statusMap[purchase.status] : null
  const hasExpense = !!purchase?.financialTransactionId

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da compra</DialogTitle>
          </DialogHeader>

          {isLoading || !purchase ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{purchase.storeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(purchase.purchaseDate)} · {sourceLabel[purchase.sourceType] || purchase.sourceType}
                  </p>
                </div>
                {st && <Badge variant={st.variant}>{st.label}</Badge>}
              </div>

              <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor total</span>
                <span className="text-xl font-bold">{formatCurrency(purchase.totalAmount ?? 0)}</span>
              </div>

              {hasExpense && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Despesa já lançada nas transações.
                </div>
              )}

              {/* Itens */}
              <div>
                <p className="text-sm font-medium mb-2">Itens ({purchase.items.length})</p>
                {purchase.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {purchase.items.map(it => (
                      <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{it.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.quantity ?? 1} {it.unit || 'un'} {it.unitPrice != null && `× ${formatCurrency(it.unitPrice)}`}
                          </p>
                        </div>
                        <span className="font-medium flex-shrink-0">{formatCurrency(it.totalPrice ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {purchase.notes && (
                <p className="text-xs text-muted-foreground flex gap-2"><FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />{purchase.notes}</p>
              )}
            </div>
          )}

          {purchase && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 mr-auto">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={deleteM.isPending} onClick={() => { if (confirm('Excluir esta compra?')) deleteM.mutate() }}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
              {purchase.status === 'RASCUNHO' && (
                <Button variant="outline" size="sm" disabled={finalizeM.isPending} onClick={() => finalizeM.mutate()}>
                  {finalizeM.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Finalizar
                </Button>
              )}
              {!hasExpense && (
                <Button size="sm" className={cn('gap-1.5')} disabled={(purchase.totalAmount ?? 0) <= 0} onClick={() => setGenOpen(true)}>
                  <Wallet className="h-4 w-4" /> Gerar despesa
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {purchase && genOpen && (
        <GenerateTransactionModal open={genOpen} onClose={() => setGenOpen(false)} groupId={groupId} purchase={purchase} />
      )}
      {purchase && editOpen && (
        <ManualPurchaseModal open={editOpen} onClose={() => setEditOpen(false)} groupId={groupId} purchase={purchase} />
      )}
    </>
  )
}
