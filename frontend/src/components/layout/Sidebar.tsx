import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowUpDown, Wallet, Tag, CreditCard,
  BarChart2, Users, Settings, TrendingUp, LogOut, ChevronLeft,
  ChevronRight, PiggyBank, FileUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Lançamentos' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/budget', icon: PiggyBank, label: 'Orçamentos' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/imports', icon: FileUp, label: 'Importação' },
  { to: '/reports', icon: BarChart2, label: 'Relatórios' },
  { to: '/family', icon: Users, label: 'Família' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={cn(
      'fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-border px-4',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="p-1.5 gradient-primary rounded-lg flex-shrink-0">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-foreground truncate">FinançasFamília</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border p-3 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            sidebarCollapsed ? 'justify-center px-2' : 'justify-start gap-2'
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Sair</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            'w-full text-muted-foreground',
            sidebarCollapsed ? 'justify-center px-2' : 'justify-end'
          )}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
