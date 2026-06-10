import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserPlus, Crown, Edit, Shield, Eye } from 'lucide-react'
import { familyGroupsApi } from '@/api/familyGroups'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, getInitials, getRoleLabel, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { MemberRole } from '@/types'

const roleIcon: Record<MemberRole, React.ElementType> = {
  ADMIN: Crown, EDITOR: Edit, VIEWER: Eye
}
const roleBadgeClass: Record<MemberRole, string> = {
  ADMIN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  EDITOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()
  const { setCurrentGroup } = useAuthStore()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: familyGroupsApi.create,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] })
      setCurrentGroup(group.id)
      toast({ title: `Família "${group.name}" criada com sucesso!` })
      onClose()
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao criar família', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Criar Grupo Familiar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da família</Label>
            <Input placeholder="Ex: Família Moreira" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input placeholder="Breve descrição" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={!name.trim() || mutation.isPending}
              onClick={() => mutation.mutate({ name: name.trim(), description: description.trim() || undefined })}
            >
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function FamilyPage() {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['family-groups'],
    queryFn: familyGroupsApi.list,
  })
  const { currentGroupId, setCurrentGroup } = useAuthStore()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)

  const activeGroup = groups.find(g => g.id === currentGroupId) || groups[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grupos Familiares</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus grupos e membros</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Criar Família
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full"><Users className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-lg">Nenhum grupo familiar</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Crie um grupo para começar a gerenciar as finanças da sua família em conjunto
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar meu primeiro grupo
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => {
            const RoleIcon = roleIcon[group.currentUserRole]
            const isActive = group.id === currentGroupId || (!currentGroupId && group === groups[0])

            return (
              <Card key={group.id} className={cn("card-hover", isActive && "border-primary ring-1 ring-primary")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{group.name}</h3>
                          {isActive && <Badge className="text-xs">Ativo</Badge>}
                        </div>
                        {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", roleBadgeClass[group.currentUserRole])}>
                        <RoleIcon className="h-3 w-3" />
                        {getRoleLabel(group.currentUserRole)}
                      </div>
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => setCurrentGroup(group.id)}>
                          Alternar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Membros ({group.members.length})
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {group.members.map(member => {
                        const MemberRoleIcon = roleIcon[member.role]
                        return (
                          <div key={member.userId} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                {getInitials(member.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium leading-none">{member.userName}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <MemberRoleIcon className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{getRoleLabel(member.role)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {group.currentUserRole === 'ADMIN' && (
                        <button
                          className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg px-3 py-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          onClick={() => toast({ title: 'Em breve', description: 'Envio de convites' })}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span className="text-sm">Convidar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
