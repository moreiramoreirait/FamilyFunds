import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Tag } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { transactionsApi } from '@/api/transactions'
import { categoriesApi } from '@/api/categories'
import type { Transaction } from '@/types'

type Scope = 'SINGLE' | 'ALL_MATCHING' | 'THIS_AND_FUTURE'

/** Sugere uma palavra-chave a partir da descrição (1º token com 3+ letras/números). */
function suggestKeyword(desc: string): string {
  const tokens = desc.split(/[^\p{L}\p{N}]+/u).filter(t => t.length >= 3)
  return (tokens[0] || desc).trim()
}

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  transaction: Transaction
}

export function CategorizeDialog({ open, onClose, groupId, transaction }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [categoryId, setCategoryId] = useState(transaction.categoryId || '')
  const [keyword, setKeyword] = useState(suggestKeyword(transaction.description))

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId], queryFn: () => categoriesApi.list(groupId), enabled: open,
  })

  const kw = keyword.trim()
  const { data: matchCount } = useQuery({
    queryKey: ['categorize-count', groupId, kw],
    queryFn: () => transactionsApi.categorizeCount(groupId, kw),
    enabled: open && kw.length > 0,
  })

  const mutation = useMutation({
    mutationFn: (scope: Scope) =>
      transactionsApi.categorize(groupId, transaction.id, { categoryId, scope, keyword: keyword.trim() || undefined }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({
        title: `${r.affected} lançamento(s) categorizado(s)`,
        description: r.ruleCreated ? 'Futuros lançamentos com essa palavra também serão categorizados.' : undefined,
      })
      onClose()
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao categorizar', variant: 'destructive' }),
  })

  const disabled = !categoryId || mutation.isPending

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Categorizar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="truncate font-medium">{transaction.description}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecionar categoria…" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Palavra-chave (para "todos" e "futuros")</Label>
            <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Ex: UBER" />
            <p className="text-xs text-muted-foreground">Lançamentos cuja descrição contém essa palavra.</p>
          </div>

          <div className="space-y-2 pt-1">
            <Button className="w-full" variant="outline" disabled={disabled} onClick={() => mutation.mutate('SINGLE')}>
              Só este lançamento
            </Button>
            <Button className="w-full" variant="outline" disabled={disabled || !kw} onClick={() => mutation.mutate('ALL_MATCHING')}>
              Todos com "{kw || '—'}"{matchCount != null ? ` (${matchCount})` : ''} — inclui antigos
            </Button>
            <Button className="w-full gap-2" disabled={disabled || !keyword.trim()} onClick={() => mutation.mutate('THIS_AND_FUTURE')}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Este e os futuros
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
