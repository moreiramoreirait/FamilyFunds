import { Outlet } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">FinançasFamília</h1>
          <p className="text-xl text-blue-100 mb-8">
            Gestão financeira inteligente para toda a família
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Controle', desc: 'Total das finanças' },
              { label: 'Família', desc: 'Todos juntos' },
              { label: 'Clareza', desc: 'Decisões melhores' },
            ].map(item => (
              <div key={item.label} className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="font-bold text-lg">{item.label}</div>
                <div className="text-sm text-blue-200">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-2 gradient-primary rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">FinançasFamília</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
