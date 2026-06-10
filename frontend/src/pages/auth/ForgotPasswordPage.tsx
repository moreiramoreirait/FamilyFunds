import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/api/auth'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      // Always show success to prevent user enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">E-mail enviado!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Se <strong>{email}</strong> está cadastrado, você receberá um link
          para redefinir sua senha em breve. Verifique também a caixa de spam.
        </p>
        <Link to="/login">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Esqueceu a senha?</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-9"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading || !email}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar link de redefinição
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
