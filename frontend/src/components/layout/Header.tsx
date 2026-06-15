import { useEffect } from 'react'
import { Bell, Moon, Sun, Menu, ChevronDown, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { familyGroupsApi } from '@/api/familyGroups'
import { notificationsApi } from '@/api/notifications'
import { formatDate, cn } from '@/lib/utils'

function NotificationsBell({ groupId }: { groupId?: string }) {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', groupId],
    queryFn: () => notificationsApi.list(groupId!),
    enabled: !!groupId,
    refetchInterval: 60_000,
  })
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count', groupId],
    queryFn: () => notificationsApi.unreadCount(groupId!),
    enabled: !!groupId,
    refetchInterval: 60_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(groupId!, id),
    onSuccess: invalidate,
  })
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(groupId!),
    onSuccess: invalidate,
  })

  const recent = notifications.slice(0, 12)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-destructive rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
        ) : (
          recent.map(n => (
            <DropdownMenuItem
              key={n.id}
              className={cn('flex flex-col items-start gap-0.5 py-2 cursor-pointer', !n.isRead && 'bg-primary/5')}
              onSelect={(e) => { e.preventDefault(); if (!n.isRead) markRead.mutate(n.id) }}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                <span className={cn('text-sm truncate', !n.isRead && 'font-semibold')}>{n.title}</span>
              </div>
              {n.message && <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>}
              <span className="text-[11px] text-muted-foreground">{formatDate(n.createdAt, "dd/MM/yyyy HH:mm")}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function Header() {
  const { theme, setTheme, setSidebarOpen } = useUIStore()
  const { currentGroupId, setCurrentGroup } = useAuthStore()

  const { data: groups = [] } = useQuery({
    queryKey: ['family-groups'],
    queryFn: familyGroupsApi.list,
  })

  // Garante que sempre haja um grupo selecionado: se nenhum foi escolhido
  // (login novo, storage limpo) ou o atual aponta para um grupo inexistente,
  // seleciona o primeiro. Sem isso, mutações que usam currentGroupId direto
  // (ex: criar lançamento) enviariam "null" e falhariam.
  useEffect(() => {
    if (groups.length === 0) return
    const validSelection = groups.some(g => g.id === currentGroupId)
    if (!validSelection) setCurrentGroup(groups[0].id)
  }, [groups, currentGroupId, setCurrentGroup])

  const currentGroup = groups.find(g => g.id === currentGroupId) || groups[0]

  const handleGroupChange = (groupId: string) => {
    setCurrentGroup(groupId)
    window.location.reload()
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Family Group Switcher */}
        {groups.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
                <span className="truncate text-sm font-medium">
                  {currentGroup?.name || 'Selecionar família'}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {groups.map(g => (
                <DropdownMenuItem
                  key={g.id}
                  onClick={() => handleGroupChange(g.id)}
                  className={currentGroupId === g.id ? 'font-semibold' : ''}
                >
                  {g.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/family'}>
                Gerenciar famílias
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationsBell groupId={currentGroup?.id} />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
