import { Bell, Moon, Sun, Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { familyGroupsApi } from '@/api/familyGroups'

export default function Header() {
  const { theme, setTheme, setSidebarOpen } = useUIStore()
  const { currentGroupId, setCurrentGroup } = useAuthStore()

  const { data: groups = [] } = useQuery({
    queryKey: ['family-groups'],
    queryFn: familyGroupsApi.list,
  })

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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
        </Button>

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
