import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Key, Trash2, Check, Sun, Moon, Monitor, Bell, User } from 'lucide-react'
import apiClient from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useUIStore as useUiStore } from '@/store/uiStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENROUTER'

interface AiSetting {
  id: string; provider: AiProvider; model: string; isActive: boolean; maskedApiKey: string | null
}

const AI_PROVIDERS: { value: AiProvider; label: string; models: string[] }[] = [
  { value: 'OPENAI', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'] },
  { value: 'ANTHROPIC', label: 'Anthropic', models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'] },
  { value: 'GEMINI', label: 'Google Gemini', models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'] },
  { value: 'OPENROUTER', label: 'OpenRouter', models: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'meta-llama/llama-3.2-3b-instruct:free'] },
]

function ThemeOption({ value, icon: Icon, label, current, onClick }: {
  value: string; icon: React.ElementType; label: string; current: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className={cn(
      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all w-full',
      current === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
    )}>
      <Icon className={cn('h-5 w-5', current === value ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('text-xs font-medium', current === value ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
      {current === value && <Check className="h-3 w-3 text-primary" />}
    </button>
  )
}

function AiTab({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [provider, setProvider] = useState<AiProvider>('OPENAI')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')

  const { data: settings = [] } = useQuery<AiSetting[]>({
    queryKey: ['ai-settings', groupId],
    queryFn: () => apiClient.get(`/family-groups/${groupId}/ai-settings`).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: object) => apiClient.post(`/family-groups/${groupId}/ai-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({ title: 'Configuração salva!' })
      setApiKey('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/family-groups/${groupId}/ai-settings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-settings'] }),
  })

  const selectedProvider = AI_PROVIDERS.find(p => p.value === provider)!

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure integrações de IA para classificação automática de transações.
        As chaves são armazenadas com criptografia AES-256.
      </p>

      {settings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Provedores configurados</h3>
          {settings.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{AI_PROVIDERS.find(p => p.value === s.provider)?.label || s.provider}</p>
                  <p className="text-xs text-muted-foreground">{s.model} • {s.maskedApiKey || '••••••••'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.isActive ? 'paid' : 'default'}>{s.isActive ? 'Ativo' : 'Inativo'}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 border border-dashed border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Adicionar Provedor</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={v => { setProvider(v as AiProvider); setModel(AI_PROVIDERS.find(p => p.value === v)?.models[0] || '') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Chave da API</Label>
          <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-... ou sua chave de API" />
        </div>
        <Button disabled={!apiKey || saveMutation.isPending} onClick={() => saveMutation.mutate({ provider, apiKey, model, isActive: true })} className="w-full">
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser, currentGroupId } = useAuthStore()
  const { theme, setTheme } = useUiStore()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')

  const profileMutation = useMutation({
    mutationFn: (data: { name: string }) => apiClient.put('/users/me', data),
    onSuccess: (res) => { updateUser(res.data); toast({ title: 'Perfil atualizado!' }) },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Personalize o sistema</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="notifications">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tema</CardTitle>
              <CardDescription>Escolha como o sistema aparece para você</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <ThemeOption value="light" icon={Sun} label="Claro" current={theme} onClick={() => setTheme('light')} />
                <ThemeOption value="dark" icon={Moon} label="Escuro" current={theme} onClick={() => setTheme('dark')} />
                <ThemeOption value="system" icon={Monitor} label="Sistema" current={theme} onClick={() => setTheme('system')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                </div>
                <Button onClick={() => profileMutation.mutate({ name })} disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Inteligência Artificial</CardTitle>
              <CardDescription>Configure provedores de IA para classificação automática</CardDescription>
            </CardHeader>
            <CardContent>
              {currentGroupId ? <AiTab groupId={currentGroupId} /> : <p className="text-muted-foreground text-sm">Selecione um grupo familiar</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Conta vencida', desc: 'Notificar quando uma conta vencer sem pagamento' },
                  { label: 'Vencimento próximo', desc: 'Alertar 3 dias antes do vencimento' },
                  { label: 'Orçamento em alerta', desc: 'Notificar ao atingir o percentual configurado' },
                  { label: 'Fatura do cartão', desc: 'Lembrete antes do fechamento da fatura' },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
