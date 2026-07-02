import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { categoriesApi } from '@/api/categories'
import { cn } from '@/lib/utils'
import { CategoryIcon, ICON_NAMES, CATEGORY_COLORS } from '@/lib/categoryIcons'
import type { Category, CategoryType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  groupId: string
  category?: Category | null
}

const TYPES: { value: CategoryType; label: string }[] = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
  { value: 'BOTH', label: 'Ambos' },
]

export function CategoryFormDialog({ open, onClose, groupId, category }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!category

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('EXPENSE')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(ICON_NAMES[0])

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      setType((category?.type as CategoryType) ?? 'EXPENSE')
      setColor(category?.color ?? CATEGORY_COLORS[0])
      setIcon(category?.icon ?? ICON_NAMES[0])
    }
  }, [open, category])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), type, color, icon }
      return isEdit
        ? categoriesApi.update(groupId, category!.id, payload)
        : categoriesApi.create(groupId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: isEdit ? 'Categoria atualizada' : 'Categoria criada' })
      onClose()
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message || 'Erro ao salvar categoria', variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color + '22', color }}
            >
              <CategoryIcon icon={icon} className="h-4 w-4" />
            </span>
            {isEdit ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Alimentação" />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-sm font-medium border transition-colors',
                    type === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    color === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c, borderColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto p-1 rounded-lg border border-border">
              {ICON_NAMES.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  className={cn(
                    'aspect-square rounded-md flex items-center justify-center transition-colors',
                    icon === name ? 'text-white' : 'hover:bg-muted text-muted-foreground'
                  )}
                  style={icon === name ? { backgroundColor: color } : undefined}
                  aria-label={name}
                >
                  <CategoryIcon icon={name} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
