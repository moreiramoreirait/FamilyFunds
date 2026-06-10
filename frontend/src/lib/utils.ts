import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value)
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd MMM')
}

export function formatMonth(month: number, year: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
    TRANSFER: 'Transferência',
  }
  return labels[type] || type
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
    OPEN: 'Aberta',
    CLOSED: 'Fechada',
  }
  return labels[status] || status
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CHECKING: 'Conta Corrente',
    SAVINGS: 'Poupança',
    WALLET: 'Carteira',
    CASH: 'Dinheiro',
    INVESTMENT: 'Investimento',
    OTHER: 'Outros',
  }
  return labels[type] || type
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    EDITOR: 'Editor',
    VIEWER: 'Visualizador',
  }
  return labels[role] || role
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}
