// Lista curada dos principais bancos/instituições do Brasil com a cor de marca.
// Usada para facilitar o preenchimento (autocomplete) e definir a cor padrão de
// contas e cartões. As cores foram escolhidas para funcionar com texto branco.
export interface BankInfo {
  name: string
  color: string
}

export const BANKS: BankInfo[] = [
  { name: 'Nubank', color: '#820ad1' },
  { name: 'Itaú', color: '#ec7000' },
  { name: 'Bradesco', color: '#cc092f' },
  { name: 'Banco do Brasil', color: '#003f8f' },
  { name: 'Santander', color: '#ec0000' },
  { name: 'Caixa', color: '#0070af' },
  { name: 'Inter', color: '#ff7a00' },
  { name: 'C6 Bank', color: '#1d1d1b' },
  { name: 'BTG Pactual', color: '#00223d' },
  { name: 'PagBank', color: '#00a868' },
  { name: 'Mercado Pago', color: '#009ee3' },
  { name: 'PicPay', color: '#11c76f' },
  { name: 'Banco Pan', color: '#2d2e83' },
  { name: 'Banco Original', color: '#00a651' },
  { name: 'Neon', color: '#00b0b9' },
  { name: 'Next', color: '#2fc25b' },
  { name: 'Sicoob', color: '#003641' },
  { name: 'Sicredi', color: '#3fa535' },
  { name: 'Banrisul', color: '#0072ce' },
  { name: 'Safra', color: '#002b5c' },
  { name: 'BV', color: '#e6007e' },
  { name: 'XP', color: '#0a0a0a' },
  { name: 'Will Bank', color: '#3a2d7d' },
  { name: 'Banco BMG', color: '#f47920' },
  { name: 'Daycoval', color: '#0a3d62' },
  { name: 'Ame Digital', color: '#eb0045' },
  { name: 'Banco BS2', color: '#004b8d' },
  { name: 'Banco Modal', color: '#111827' },
]

export function findBank(name?: string | null): BankInfo | undefined {
  if (!name) return undefined
  const n = name.trim().toLowerCase()
  return BANKS.find(b => b.name.toLowerCase() === n)
}
