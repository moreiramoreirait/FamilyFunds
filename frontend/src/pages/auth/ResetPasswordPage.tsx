import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/api/auth'
import { useToast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Token inválido ou ausente.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Link inválido ou expirado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Senha redefinida!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Sua senha foi alterada com sucesso.
        </p>
        <Button onClick={() => navigate('/login')} className="gap-2">
          Ir para o login
        </Button>
      </div>
    )
  }

  if (!token || error === 'Token inválido ou ausente.') {
    return (
      <div className="animate-fade-in text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-rose-100 dark:bg-rose-900/30 rounded-full">
            <XCircle className="h-10 w-10 text-rose-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Link inválido</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Este link é inválido ou já foi utilizado. Solicite um novo.
        </p>
        <Link to="/forgot-password">
          <Button variant="outline">Solicitar novo link</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Nova senha</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Escolha uma senha forte com pelo menos 8 caracteres.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input
            id="confirm"
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Strength indicator */}
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[8, 12, 16].map((threshold, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= threshold
                      ? i === 0 ? 'bg-rose-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-400'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {password.length < 8 ? 'Muito curta' :
               password.length < 12 ? 'Fraca' :
               password.length < 16 ? 'Boa' : 'Forte'}
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11"
          disabled={loading || !password || !confirm}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Redefinir senha
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar ao login
        </Link>
      </p>
    </div>
  )
}
