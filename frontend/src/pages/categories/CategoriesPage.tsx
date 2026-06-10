import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, ChevronDown, ChevronRight, Trash2, Edit2 } from 'lucide-react'
import { categoriesApi } from '@/api/categories'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Category } from '@/types'

const typeLabels = { INCOME: 'Receita', EXPENSE: 'Despesa', BOTH: 'Ambos' }
const typeBadge: Record<string, any> = { INCOME: 'income', EXPENSE: 'expense', BOTH: 'default' }

function CategoryItem({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => category.subcategories.length > 0 && setExpanded(e => !e)}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: category.color ? category.color + '20' : undefined }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#94a3b8' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{category.name}</p>
          <p className="text-xs text-muted-foreground">{category.subcategories.length} subcategorias</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={typeBadge[category.type]} className="text-xs">{typeLabels[category.type]}</Badge>
          {category.isSystem && <Badge variant="outline" className="text-xs">Sistema</Badge>}
          {!category.isSystem && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={e => { e.stopPropagation(); onDelete(category.id) }}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
          {category.subcategories.length > 0 && (
            expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && category.subcategories.length > 0 && (
        <div className="border-t border-border bg-muted/20 divide-y divide-border">
          {category.subcategories.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground ml-4" />
              <span className="text-sm text-muted-foreground">{sub.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', activeGroupId],
    queryFn: () => categoriesApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Categoria removida' })
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao remover', variant: 'destructive' }),
  })

  const filtered = categories.filter(c => filter === 'ALL' || c.type === filter || c.type === 'BOTH')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-muted-foreground text-sm">{categories.length} categorias cadastradas</p>
        </div>
        <Button className="gap-2" onClick={() => toast({ title: 'Em breve', description: 'Cadastro de categoria' })}>
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'Todas' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full"><Tag className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-lg">Nenhuma categoria</h3>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lista de categorias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map(cat => (
              <CategoryItem key={cat.id} category={cat} onDelete={id => deleteMutation.mutate(id)} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
