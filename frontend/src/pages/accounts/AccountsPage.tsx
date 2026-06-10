import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, TrendingUp, TrendingDown, MoreVertical, Trash2, Pencil } from 'lucide-react'
import { accountsApi, type AccountPayload } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'
import { familyGroupsApi } from '@/api/familyGroups'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, getAccountTypeLabel, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Account, AccountType } from '@/types'

// ─── constants ───────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CHECKING',   label: 'Conta Corrente' },
  { value: 'SAVINGS',    label: 'Conta Poupança' },
  { value: 'WALLET',     label: 'Carteira Digital' },
  { value: 'CASH',       label: 'Dinheiro em Espécie' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'OTHER',      label: 'Outra' },
]

const accountTypeColors: Record<AccountType, string> = {
  CHECKING:   'bg-blue-500',
  SAVINGS:    'bg-emerald-500',
  WALLET:     'bg-purple-500',
  CASH:       'bg-amber-500',
  INVESTMENT: 'bg-teal-500',
  OTHER:      'bg-gray-500',
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#6366f1',
]

// ─── Account Modal ────────────────────────────────────────────────────────────

interface AccountModalProps {
  open: boolean
  onClose: () => void
  account?: Account | null
  groupId: string
}

function AccountModal({ open, onClose, account, groupId }: AccountModalProps) {
  const isEdit = !!account
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [name, setName]                   = useState(account?.name ?? '')
  const [bankName, setBankName]           = useState(account?.bankName ?? '')
  const [type, setType]                   = useState<AccountType>(account?.type ?? 'CHECKING')
  const [initialBalance, setInitialBalance] = useState(String(account?.initialBalance ?? '0'))
  const [color, setColor]                 = useState(account?.color ?? PRESET_COLORS[0])
  const [notes, setNotes]                 = useState(account?.notes ?? '')
  const [includeInTotal, setIncludeInTotal] = useState(account?.includeInTotal ?? true)

  // Reset form when account changes (open new vs edit)
  const resetForm = () => {
    setName(account?.name ?? '')
    setBankName(account?.bankName ?? '')
    setType(account?.type ?? 'CHECKING')
    setInitialBalance(String(account?.initialBalance ?? '0'))
    setColor(account?.color ?? PRESET_COLORS[0])
    setNotes(account?.notes ?? '')
    setIncludeInTotal(account?.includeInTotal ?? true)
  }

  const mutation = useMutation({
    mutationFn: (payload: AccountPayload) =>
      isEdit
        ? accountsApi.update(groupId, account!.id, payload)
        : accountsApi.create(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: isEdit ? 'Conta atualizada!' : 'Conta criada!' })
      onClose()
    },
    onError: () => {
      toast({ title: 'Erro ao salvar conta', variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate({
      name: name.trim(),
      bankName: bankName.trim() || undefined,
      type,
      initialBalance: parseFloat(initialBalance) || 0,
      color,
      notes: notes.trim() || undefined,
      includeInTotal,
    })
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) { onClose(); resetForm() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nome da conta *</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Nubank, Inter, Bradesco"
              required
            />
          </div>

          {/* Bank */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-bank">Banco / Instituição</Label>
            <Input
              id="acc-bank"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Nubank, Itaú, Caixa…"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo de conta *</Label>
            <Select value={type} onValueChange={v => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Balance */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Saldo inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="acc-balance"
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  className="pl-9"
                  placeholder="0,00"
                />
              </div>
            </div>
          )}

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border-2 border-transparent cursor-pointer"
                title="Cor personalizada"
              />
            </div>
          </div>

          {/* Include in total */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInTotal}
              onChange={e => setIncludeInTotal(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Incluir no patrimônio total</span>
          </label>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-notes">Observações</Label>
            <Input
              id="acc-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onClose(); resetForm() }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  open: boolean
  accountName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmDeleteDialog({ open, accountName, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover conta?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja remover a conta <strong>{accountName}</strong>? Esta ação não pode ser desfeita.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Removendo…' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const activeGroupId = currentGroupId || groups?.[0]?.id
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen]     = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', activeGroupId],
    queryFn: () => accountsApi.list(activeGroupId!),
    enabled: !!activeGroupId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(activeGroupId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Conta removida com sucesso' })
      setDeleteTarget(null)
    },
    onError: () => {
      toast({ title: 'Erro ao remover conta', variant: 'destructive' })
    },
  })

  const openCreate = () => {
    setEditAccount(null)
    setModalOpen(true)
  }

  const openEdit = (account: Account) => {
    setEditAccount(account)
    setModalOpen(true)
  }

  const totalBalance = accounts
    .filter(a => a.includeInTotal && a.isActive)
    .reduce((sum, a) => sum + a.currentBalance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground text-sm">
            Saldo total: <span className="font-semibold text-foreground">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 bg-muted rounded-full">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Nenhuma conta cadastrada</h3>
          <p className="text-muted-foreground text-sm">Adicione suas contas bancárias para começar</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Conta
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Card key={account.id} className="card-hover overflow-hidden">
              {/* color stripe */}
              <div
                className="h-2"
                style={
                  account.color
                    ? { backgroundColor: account.color }
                    : undefined
                }
              >
                {!account.color && (
                  <div className={cn('h-2', accountTypeColors[account.type] || 'bg-gray-400')} />
                )}
              </div>

              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg">{account.name}</p>
                    {account.bankName && (
                      <p className="text-sm text-muted-foreground">{account.bankName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {getAccountTypeLabel(account.type)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(account)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(account)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Saldo atual</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    account.currentBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600',
                  )}>
                    {formatCurrency(account.currentBalance)}
                  </p>
                </div>

                {account.currentBalance !== account.initialBalance && (
                  <div className="flex items-center gap-1 mt-2">
                    {account.currentBalance > account.initialBalance ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Inicial: {formatCurrency(account.initialBalance)}
                    </p>
                  </div>
                )}

                {!account.includeInTotal && (
                  <p className="text-xs text-muted-foreground mt-2 italic">Excluída do total</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Total Card */}
          <Card className="card-hover border-primary/30 bg-primary/5">
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[160px]">
              <p className="text-sm font-medium text-muted-foreground">Patrimônio Total</p>
              <div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {accounts.filter(a => a.includeInTotal && a.isActive).length} conta(s) incluída(s)
                </p>
              </div>
              <Button variant="ghost" size="sm" className="w-fit -ml-2 mt-2" onClick={openCreate}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar conta
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create / Edit Modal */}
      {activeGroupId && (
        <AccountModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditAccount(null) }}
          account={editAccount}
          groupId={activeGroupId}
        />
      )}

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          open={!!deleteTarget}
          accountName={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
