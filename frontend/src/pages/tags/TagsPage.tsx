import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag as TagIcon, Trash2, Edit2 } from 'lucide-react'
import { tagsApi } from '@/api/tags'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Tag } from '@/types'

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6b7280']

interface TagDialogProps {
  open: boolean
  onClose: () => void
  groupId: string
  tag?: Tag | null
}

function TagDialog({ open, onClose, groupId, tag }: TagDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!tag
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  useEffect(() => {
    if (tag) { setName(tag.name); setColor(tag.color || PRESET_COLORS[0]) }
    else { setName(''); setColor(PRESET_COLORS[0]) }
  }, [tag, open])

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? tagsApi.update(groupId, tag!.id, { name: name.trim(), color })
      : tagsApi.create(groupId, { name: name.trim(), color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast({ title: isEdit ? 'Tag atualizada' : 'Tag criada' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao salvar tag', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Nome *</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Viagem, Reembolsável..."
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) mutation.mutate() }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform',
                    color.toLowerCase() === c.toLowerCase() ? 'border-foreground scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0"
                title="Cor personalizada"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">Prévia:</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: color + '22', color }}>
              {name.trim() || 'tag'}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TagsPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTag, setEditTag] = useState<Tag | null>(null)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', activeGroupId],
    queryFn: () => tagsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.delete(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast({ title: 'Tag removida' })
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao remover', variant: 'destructive' }),
  })

  const openNew = () => { setEditTag(null); setDialogOpen(true) }
  const openEdit = (tag: Tag) => { setEditTag(tag); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-muted-foreground text-sm">{tags.length} tag(s) cadastrada(s)</p>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full"><TagIcon className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-lg">Nenhuma tag</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Crie tags para organizar e filtrar seus lançamentos (ex: Viagem, Reembolsável, Pessoal).
          </p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Criar primeira tag</Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lista de tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tags.map(tag => {
              const color = tag.color || '#6b7280'
              return (
                <div key={tag.id} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '20' }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: color + '22', color }}>
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(tag)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Excluir" onClick={() => deleteMutation.mutate(tag.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {activeGroupId && (
        <TagDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditTag(null) }}
          groupId={activeGroupId}
          tag={editTag}
        />
      )}
    </div>
  )
}
