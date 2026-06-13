import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Link2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi } from '@/api/shopping'
import type { ShoppingPurchase } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  /** Chamado com a compra criada (revisão); para FALHA, vem com o link preenchido p/ completar manual. */
  onImported: (purchase: ShoppingPurchase) => void
}

export function PasteNfceLinkModal({ open, onClose, groupId, onImported }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [url, setUrl] = useState('')

  const mutation = useMutation({
    mutationFn: () => shoppingApi.importFromUrl(groupId, url.trim()),
    onSuccess: (purchase) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
      queryClient.invalidateQueries({ queryKey: ['shopping-price-history'] })
      if (purchase.extractionStatus === 'IMPORTADO_COM_SUCESSO') {
        toast({ title: 'NFC-e importada — revise os itens' })
      } else if (purchase.extractionStatus === 'IMPORTADO_PARCIALMENTE') {
        toast({ title: 'Importação parcial — complete os dados que faltam' })
      } else {
        toast({ title: 'Não foi possível ler a nota. Complete manualmente.', variant: 'destructive' })
      }
      setUrl('')
      onImported(purchase)
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao importar NFC-e', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar NFC-e por link</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-3 flex gap-3 items-start">
            <Link2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Cole o link da NFC-e (o mesmo do QR Code do cupom). Tentamos extrair loja, itens e total. Se o portal bloquear, abrimos uma compra para você completar manualmente.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nfce-url">Link da NFC-e</Label>
            <Input id="nfce-url" placeholder="https://www.fazenda.../qrcode?p=..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!url.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
