import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserPlus, Crown, Edit, Shield, Eye, Pencil } from 'lucide-react'
import { familyGroupsApi } from '@/api/familyGroups'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getInitials, getRoleLabel, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { MemberRole, FamilyGroup } from '@/types'

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

function EditGroupModal({ group, onClose }: { group: FamilyGroup; onClose: () => void }) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => familyGroupsApi.update(group.id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] })
      toast({ title: 'Família atualizada' })
      onClose()
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao atualizar família', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Editar família</CardTitle>
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
            <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InviteModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('EDITOR')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => familyGroupsApi.invite(groupId, { email: email.trim(), role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] })
      toast({ title: 'Convite enviado', description: `Um e-mail foi enviado para ${email.trim()}` })
      onClose()
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message || 'Erro ao enviar convite', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Convidar membro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" placeholder="pessoa@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={v => setRole(v as MemberRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador — acesso total</SelectItem>
                <SelectItem value="EDITOR">Editor — cria e edita lançamentos</SelectItem>
                <SelectItem value="VIEWER">Visualizador — somente leitura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            A pessoa recebe um e-mail com um link para aceitar o convite (válido por 7 dias).
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!email.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Enviando…' : 'Enviar convite'}
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
  const [showCreate, setShowCreate] = useState(false)
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null)
  const [editGroup, setEditGroup] = useState<FamilyGroup | null>(null)

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
                      {group.currentUserRole === 'ADMIN' && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditGroup(group)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                      )}
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
                          onClick={() => setInviteGroupId(group.id)}
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
      {inviteGroupId && <InviteModal groupId={inviteGroupId} onClose={() => setInviteGroupId(null)} />}
      {editGroup && <EditGroupModal group={editGroup} onClose={() => setEditGroup(null)} />}
    </div>
  )
}
