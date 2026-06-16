import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle2, AlertTriangle, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'

export const PENDING_INVITE_KEY = 'pendingInviteToken'

type State = 'loading' | 'need-auth' | 'accepting' | 'success' | 'error'

export default function InviteAcceptPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const token = params.get('token') || localStorage.getItem(PENDING_INVITE_KEY)
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Link de convite inválido (sem token).')
      return
    }
    localStorage.setItem(PENDING_INVITE_KEY, token)

    if (!isAuthenticated) {
      setState('need-auth')
      return
    }

    setState('accepting')
    familyGroupsApi.acceptInvite(token)
      .then(() => {
        localStorage.removeItem(PENDING_INVITE_KEY)
        queryClient.invalidateQueries({ queryKey: ['family-groups'] })
        setState('success')
        setTimeout(() => navigate('/family'), 1600)
      })
      .catch((e: any) => {
        setState('error')
        setMessage(e?.response?.data?.message || 'Não foi possível aceitar o convite.')
      })
  }, [token, isAuthenticated])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8 text-center space-y-5">
        <div className="flex items-center justify-center gap-2">
          <div className="p-1.5 gradient-primary rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-foreground">FinançasFamília</span>
        </div>

        {(state === 'loading' || state === 'accepting') && (
          <div className="py-6 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando seu convite…</p>
          </div>
        )}

        {state === 'need-auth' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full"><Users className="h-7 w-7 text-primary" /></div>
              <h2 className="text-xl font-bold">Você foi convidado!</h2>
              <p className="text-sm text-muted-foreground">
                Para entrar no grupo familiar, crie uma conta ou entre — use o <strong>mesmo e-mail</strong> em que recebeu o convite.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/register')}>Criar conta</Button>
              <Button variant="outline" onClick={() => navigate('/login')}>Já tenho conta — Entrar</Button>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="py-4 flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <h2 className="text-xl font-bold">Convite aceito!</h2>
            <p className="text-sm text-muted-foreground">Você entrou no grupo familiar. Redirecionando…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4 flex flex-col items-center gap-3">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-bold">Não foi possível aceitar</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Ir para o app' : 'Ir para o login'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
