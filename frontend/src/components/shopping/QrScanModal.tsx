import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Camera, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { shoppingApi } from '@/api/shopping'
import type { ShoppingPurchase } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  onImported: (purchase: ShoppingPurchase) => void
}

const READER_ID = 'nfce-qr-reader'

export function QrScanModal({ open, onClose, groupId, onImported }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const scannerRef = useRef<any>(null)
  const handlingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    handlingRef.current = false
    setError(null)
    setImporting(false)

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        const scanner = new Html5Qrcode(READER_ID)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText: string) => {
            if (handlingRef.current) return
            handlingRef.current = true
            setImporting(true)
            try { await scanner.stop() } catch { /* noop */ }
            try {
              const purchase = await shoppingApi.importFromQrCode(groupId, decodedText)
              queryClient.invalidateQueries({ queryKey: ['shopping-purchases'] })
              queryClient.invalidateQueries({ queryKey: ['shopping-summary'] })
              queryClient.invalidateQueries({ queryKey: ['shopping-price-history'] })
              if (purchase.extractionStatus === 'IMPORTADO_COM_SUCESSO') {
                toast({ title: 'NFC-e importada — revise os itens' })
              } else if (purchase.extractionStatus === 'IMPORTADO_PARCIALMENTE') {
                toast({ title: 'Importação parcial — complete os dados' })
              } else {
                toast({ title: 'Não foi possível ler a nota. Complete manualmente.', variant: 'destructive' })
              }
              onImported(purchase)
              onClose()
            } catch (e: any) {
              toast({ title: e?.response?.data?.message || 'Erro ao importar NFC-e', variant: 'destructive' })
              setImporting(false)
              handlingRef.current = false
            }
          },
          () => { /* ignore per-frame decode errors */ },
        )
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Não foi possível acessar a câmera. Verifique as permissões.')
      }
    }
    start()

    return () => {
      cancelled = true
      const s = scannerRef.current
      if (s) {
        s.stop().then(() => s.clear()).catch(() => { /* noop */ })
        scannerRef.current = null
      }
    }
  }, [open, groupId])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Escanear QR Code da NFC-e</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Câmera indisponível</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">{error}</p>
                <p className="text-muted-foreground mt-2 text-xs">Use “Colar link” como alternativa. A câmera exige HTTPS e permissão do navegador.</p>
              </div>
            </div>
          ) : (
            <>
              <div id={READER_ID} className="w-full rounded-lg overflow-hidden bg-black/80 min-h-[240px]" />
              {importing
                ? <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Importando nota…</p>
                : <p className="text-xs text-center text-muted-foreground">Aponte para o QR Code impresso no cupom fiscal.</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
