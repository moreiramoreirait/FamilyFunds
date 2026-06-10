import apiClient from './client'

export interface CreditCard {
  id: string
  name: string
  brand: string
  lastFourDigits: string
  creditLimit: number
  availableLimit: number
  closingDay: number
  dueDay: number
  color: string | null
  icon: string | null
  isActive: boolean
}

export interface CreditCardInvoice {
  id: string
  creditCardId: string
  creditCardName: string
  referenceMonth: number
  referenceYear: number
  closingDate: string
  dueDate: string
  totalAmount: number
  status: string
  paidAt: string | null
  paymentAccountId: string | null
}

export interface CreditCardPayload {
  name: string
  brand: string
  lastFourDigits: string
  creditLimit: number
  closingDay: number
  dueDay: number
  color?: string
  icon?: string
}

export const creditCardsApi = {
  list: (groupId: string) =>
    apiClient.get<CreditCard[]>(`/family-groups/${groupId}/credit-cards`).then(r => r.data),

  create: (groupId: string, data: CreditCardPayload) =>
    apiClient.post<CreditCard>(`/family-groups/${groupId}/credit-cards`, data).then(r => r.data),

  update: (groupId: string, id: string, data: CreditCardPayload) =>
    apiClient.put<CreditCard>(`/family-groups/${groupId}/credit-cards/${id}`, data).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/credit-cards/${id}`),

  getInvoices: (groupId: string, cardId: string) =>
    apiClient.get<CreditCardInvoice[]>(`/family-groups/${groupId}/credit-cards/${cardId}/invoices`).then(r => r.data),

  payInvoice: (groupId: string, invoiceId: string, paymentAccountId: string, paymentDate?: string) =>
    apiClient.post<CreditCardInvoice>(
      `/family-groups/${groupId}/credit-cards/invoices/${invoiceId}/pay`,
      null,
      { params: { paymentAccountId, ...(paymentDate ? { paymentDate } : {}) } }
    ).then(r => r.data),
}
