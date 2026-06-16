import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Users, Mail, Settings, Crown, Edit as EditIcon, Eye, Trash2, Send, Loader2, X, RefreshCw, Clock,
} from 'lucide-react'
import { familyGroupsApi } from '@/api/familyGroups'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { formatDate, getInitials, getRoleLabel, cn } from '@/lib/utils'
import type { MemberRole } from '@/types'

const roleIcon: Record<MemberRole, React.ElementType> = { ADMIN: Crown, EDITOR: EditIcon, VIEWER: Eye }

export default function ManageFamilyPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const currentUserId = useAuthStore(s => s.user?.id)

  const { data: group, isLoading } = useQuery({
    queryKey: ['family-group', id],
    queryFn: () => familyGroupsApi.getById(id),
    enabled: !!id,
  })
  const isAdmin = group?.currentUserRole === 'ADMIN'

  const { data: invites = [] } = useQuery({
    queryKey: ['family-invites', id],
    queryFn: () => familyGroupsApi.listInvites(id),
    enabled: !!id && isAdmin,
  })

  // invite form
  const [emailsText, setEmailsText] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('EDITOR')
  // rename form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  useEffect(() => {
    if (group) { setName(group.name); setDescription(group.description || '') }
  }, [group?.id])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['family-group', id] })
    queryClient.invalidateQueries({ queryKey: ['family-invites', id] })
    queryClient.invalidateQueries({ queryKey: ['family-groups'] })
  }
  const onError = (e: any) => toast({ title: e?.response?.data?.message || 'Erro', variant: 'destructive' })

  const inviteM = useMutation({
    mutationFn: () => {
      const emails = emailsText.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
      return familyGroupsApi.bulkInvite(id, emails, inviteRole)
    },
    onSuccess: (r) => {
      invalidate()
      setEmailsText('')
      toast({ title: `${r.sent} convite(s) enviado(s)`, description: [r.skipped && `${r.skipped} já membro(s)`, r.failed && `${r.failed} com erro`].filter(Boolean).join(' · ') || undefined })
    },
    onError,
  })
  const revokeM = useMutation({
    mutationFn: (inviteId: string) => familyGroupsApi.revokeInvite(id, inviteId),
    onSuccess: () => { invalidate(); toast({ title: 'Convite revogado' }) },
    onError,
  })
  const resendM = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRole }) => familyGroupsApi.bulkInvite(id, [email], role),
    onSuccess: () => { invalidate(); toast({ title: 'Convite reenviado' }) },
    onError,
  })
  const roleM = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) => familyGroupsApi.changeMemberRole(id, userId, role),
    onSuccess: () => { invalidate(); toast({ title: 'Papel atualizado' }) },
    onError,
  })
  const removeM = useMutation({
    mutationFn: (userId: string) => familyGroupsApi.removeMember(id, userId),
    onSuccess: () => { invalidate(); toast({ title: 'Membro removido' }) },
    onError,
  })
  const renameM = useMutation({
    mutationFn: () => familyGroupsApi.update(id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => { invalidate(); toast({ title: 'Família atualizada' }) },
    onError,
  })

  if (isLoading) return <div className="space-y-4"><div className="h-10 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded-xl" /></div>
  if (!group) return <div className="text-muted-foreground">Família não encontrada.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/family')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground text-sm">Gerenciar família</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-300">
          Apenas administradores podem gerenciar membros e convites. Você está como <strong>{getRoleLabel(group.currentUserRole)}</strong>.
        </div>
      )}

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-1.5"><Users className="h-4 w-4" /> Membros</TabsTrigger>
          {isAdmin && <TabsTrigger value="invites" className="gap-1.5"><Mail className="h-4 w-4" /> Convites</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>}
        </TabsList>

        {/* ─── Membros ─── */}
        <TabsContent value="members" className="mt-4">
          <Card><CardContent className="p-0 divide-y divide-border">
            {group.members.map(m => {
              const RIcon = roleIcon[m.role]
              const isSelf = m.userId === currentUserId
              return (
                <div key={m.userId} className="flex items-center gap-3 p-4">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(m.userName)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.userName} {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>
                  </div>
                  {isAdmin ? (
                    <Select value={m.role} onValueChange={(v) => roleM.mutate({ userId: m.userId, role: v as MemberRole })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="default" className="gap-1"><RIcon className="h-3 w-3" />{getRoleLabel(m.role)}</Badge>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Remover"
                      onClick={() => { if (confirm(`Remover ${m.userName} do grupo?`)) removeM.mutate(m.userId) }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent></Card>
        </TabsContent>

        {/* ─── Convites ─── */}
        {isAdmin && (
          <TabsContent value="invites" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Convidar (um ou vários e-mails)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>E-mails — um por linha (ou separados por vírgula)</Label>
                  <textarea
                    className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={"pessoa1@email.com\npessoa2@email.com"}
                    value={emailsText} onChange={e => setEmailsText(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <div className="space-y-1.5">
                    <Label>Papel (para todos)</Label>
                    <Select value={inviteRole} onValueChange={v => setInviteRole(v as MemberRole)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="gap-2" disabled={!emailsText.trim() || inviteM.isPending} onClick={() => inviteM.mutate()}>
                    {inviteM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar convites
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Convites pendentes ({invites.length})</CardTitle></CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">Nenhum convite pendente.</p>
                ) : invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {getRoleLabel(inv.role)}{inv.expiresAt && <><span>•</span><Clock className="h-3 w-3" /> expira {formatDate(inv.expiresAt)}</>}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1" disabled={resendM.isPending}
                      onClick={() => resendM.mutate({ email: inv.email, role: inv.role })}>
                      <RefreshCw className="h-3.5 w-3.5" /> Reenviar
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" disabled={revokeM.isPending}
                      onClick={() => revokeM.mutate(inv.id)}>
                      <X className="h-4 w-4" /> Revogar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─── Configurações ─── */}
        {isAdmin && (
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Dados da família</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Input placeholder="Opcional" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <Button disabled={renameM.isPending} onClick={() => renameM.mutate()}>
                  {renameM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
