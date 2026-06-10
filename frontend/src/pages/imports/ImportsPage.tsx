import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, FileText, CheckCircle2, XCircle, Clock, Trash2,
  ChevronRight, TrendingUp, TrendingDown, AlertCircle, RefreshCw,
} from 'lucide-react'
import { importsApi, type BankImport, type BankImportItem } from '@/api/imports'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── status helpers ───────────────────────────────────────────────────────────

const importStatusLabel: Record<string, string> = {
  PENDING: 'Pendente', PROCESSING: 'Processando',
  COMPLETED: 'Concluído', FAILED: 'Falhou',
}
const importStatusVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'secondary', PROCESSING: 'secondary',
  COMPLETED: 'default', FAILED: 'destructive',
}

function fileTypeIcon(type: string) {
  const classes = 'h-5 w-5'
  if (type === 'XLSX') return <FileText className={cn(classes, 'text-emerald-500')} />
  if (type === 'OFX')  return <FileText className={cn(classes, 'text-blue-500')} />
  return <FileText className={cn(classes, 'text-muted-foreground')} />
}

function formatDate(d: string) {
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) }
  catch { return d }
}

// ─── Import Row Review ────────────────────────────────────────────────────────

interface ReviewDialogProps {
  bankImport: BankImport
  groupId: string
  onClose: () => void
}

function ReviewDialog({ bankImport, groupId, onClose }: ReviewDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<Set<string>>(
    new Set(bankImport.items.filter(i => i.status === 'PENDING').map(i => i.id))
  )

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    const pending = bankImport.items.filter(i => i.status === 'PENDING')
    if (selected.size === pending.length) setSelected(new Set())
    else setSelected(new Set(pending.map(i => i.id)))
  }

  const confirmMutation = useMutation({
    mutationFn: () =>
      importsApi.confirm(groupId, bankImport.id, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast({ title: `${selected.size} transação(ões) importada(s)!` })
      onClose()
    },
    onError: () => toast({ title: 'Erro ao confirmar importação', variant: 'destructive' }),
  })

  const pendingItems = bankImport.items.filter(i => i.status === 'PENDING')
  const allSelected  = selected.size === pendingItems.length && pendingItems.length > 0

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar Importação — {bankImport.fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
            Selecionar todos ({pendingItems.length})
          </label>
          <span className="text-sm text-muted-foreground">
            {selected.size} selecionado(s) de {bankImport.items.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {bankImport.items.map(item => (
            <ImportItemRow
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
            />
          ))}
          {bankImport.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum item encontrado
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending || selected.size === 0}
          >
            {confirmMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Importando…</>
            ) : (
              <>Importar {selected.size} transação(ões)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ImportItemRowProps {
  item: BankImportItem
  checked: boolean
  onToggle: () => void
}
function ImportItemRow({ item, checked, onToggle }: ImportItemRowProps) {
  const isPending = item.status === 'PENDING'
  return (
    <label className={cn(
      'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
      isPending
        ? checked
          ? 'border-primary/40 bg-primary/5'
          : 'border-transparent hover:bg-muted/50'
        : 'border-transparent opacity-60 cursor-not-allowed',
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={!isPending}
        className="rounded flex-shrink-0"
      />

      <div className={cn(
        'p-1.5 rounded-full flex-shrink-0',
        item.type === 'INCOME'
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-rose-100 dark:bg-rose-900/30',
      )}>
        {item.type === 'INCOME'
          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          : <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">{item.transactionDate}</p>
      </div>

      {item.categoryName && (
        <Badge variant="secondary" className="text-xs">{item.categoryName}</Badge>
      )}

      <p className={cn(
        'text-sm font-semibold tabular-nums flex-shrink-0',
        item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600',
      )}>
        {item.type === 'EXPENSE' ? '- ' : '+ '}
        {formatCurrency(item.amount)}
      </p>

      {item.status !== 'PENDING' && (
        <Badge
          variant={item.status === 'IMPORTED' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {item.status === 'IMPORTED' ? 'Importado' : 'Ignorado'}
        </Badge>
      )}
    </label>
  )
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

interface UploadDialogProps {
  groupId: string
  onClose: () => void
}

function UploadDialog({ groupId, onClose }: UploadDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [accountId, setAccountId] = useState('')
  const [dragging, setDragging] = useState(false)

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId],
    queryFn: () => accountsApi.list(groupId),
  })

  const uploadMutation = useMutation({
    mutationFn: () => importsApi.upload(groupId, accountId, file!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      toast({ title: 'Arquivo processado com sucesso!' })
      onClose()
    },
    onError: () => toast({ title: 'Erro ao processar arquivo', variant: 'destructive' }),
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const acceptedFormats = '.csv,.ofx,.qfx,.xlsx,.xls'

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Extrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conta de destino *</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats}
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">CSV, OFX, XLSX (máx. 10 MB)</p>
              </div>
            )}
          </div>

          {/* Format hint */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Formatos suportados:</p>
            <p>• <strong>CSV</strong> — colunas Data, Descrição, Valor (detectadas automaticamente)</p>
            <p>• <strong>OFX / QFX</strong> — extrato padrão de todos os bancos</p>
            <p>• <strong>XLSX</strong> — planilha Excel com cabeçalho</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !accountId || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processando…</>
            ) : 'Processar arquivo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportsPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups }   = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [reviewImport, setReviewImport] = useState<BankImport | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['imports', activeGroupId],
    queryFn: () => importsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => importsApi.delete(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      toast({ title: 'Importação removida' })
    },
  })

  const handleReview = async (imp: BankImport) => {
    // Re-fetch with items
    if (imp.items.length === 0) {
      const full = await importsApi.get(activeGroupId!, imp.id)
      setReviewImport(full)
    } else {
      setReviewImport(imp)
    }
  }

  const imports = data?.content ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importação de Extratos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Importe seus extratos bancários em CSV, OFX ou XLSX
          </p>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Importar Extrato
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : imports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="p-4 bg-muted rounded-full">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Nenhuma importação ainda</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Importe seus extratos bancários para registrar transações automaticamente
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar primeiro extrato
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {imports.map(imp => (
            <ImportCard
              key={imp.id}
              bankImport={imp}
              onReview={() => handleReview(imp)}
              onDelete={() => deleteMutation.mutate(imp.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      {uploadOpen && activeGroupId && (
        <UploadDialog groupId={activeGroupId} onClose={() => setUploadOpen(false)} />
      )}

      {/* Review dialog */}
      {reviewImport && activeGroupId && (
        <ReviewDialog
          bankImport={reviewImport}
          groupId={activeGroupId}
          onClose={() => setReviewImport(null)}
        />
      )}
    </div>
  )
}

// ─── Import Card ──────────────────────────────────────────────────────────────

interface ImportCardProps {
  bankImport: BankImport
  onReview: () => void
  onDelete: () => void
  deleting: boolean
}

function ImportCard({ bankImport, onReview, onDelete, deleting }: ImportCardProps) {
  const statusIcon = {
    PENDING:    <Clock className="h-4 w-4 text-muted-foreground" />,
    PROCESSING: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    COMPLETED:  <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    FAILED:     <XCircle className="h-4 w-4 text-destructive" />,
  }[bankImport.status]

  const canReview = bankImport.status === 'COMPLETED'

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          {/* File type icon */}
          <div className="p-2 bg-muted rounded-lg flex-shrink-0">
            {fileTypeIcon(bankImport.fileType)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{bankImport.fileName}</p>
              <Badge variant={importStatusVariant[bankImport.status]} className="text-xs">
                {statusIcon}
                <span className="ml-1">{importStatusLabel[bankImport.status]}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {bankImport.accountName && <span>📂 {bankImport.accountName}</span>}
              <span>{bankImport.totalRecords} registros</span>
              {bankImport.importedRecords > 0 && (
                <span className="text-emerald-600">✓ {bankImport.importedRecords} importados</span>
              )}
              {bankImport.skippedRecords > 0 && (
                <span>{bankImport.skippedRecords} ignorados</span>
              )}
              <span>{formatDate(bankImport.createdAt)}</span>
            </div>
            {bankImport.errorMessage && (
              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {bankImport.errorMessage}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canReview && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onReview}>
                Revisar <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar for COMPLETED imports */}
        {bankImport.status === 'COMPLETED' && bankImport.totalRecords > 0 && (
          <div className="px-4 pb-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${(bankImport.importedRecords / bankImport.totalRecords) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
