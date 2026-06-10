import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  const { sidebarCollapsed, sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
      )}>
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
