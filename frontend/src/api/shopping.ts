import apiClient from './client'
import type {
  ShoppingPurchase, ShoppingSummary, PriceHistory, ShoppingList,
  TransactionStatus,
} from '@/types'

const base = (groupId: string) => `/family-groups/${groupId}/shopping`

export interface PurchaseItemPayload {
  productName: string
  category?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  totalPrice?: number
  brand?: string
  productCode?: string
}

export interface PurchasePayload {
  storeName: string
  storeCnpj?: string
  purchaseDate: string
  totalAmount?: number
  paymentMethod?: string
  accountId?: string
  creditCardId?: string
  categoryId?: string
  notes?: string
  qrCodeUrl?: string
  items?: PurchaseItemPayload[]
}

export interface GenerateTransactionPayload {
  status: TransactionStatus
  accountId?: string
  creditCardId?: string
  categoryId?: string
}

export interface ListItemPayload {
  productName: string
  category?: string
  quantity?: number
  unit?: string
  estimatedUnitPrice?: number
  preferredStore?: string
  checked?: boolean
  realUnitPrice?: number
}

export interface ListPayload {
  name: string
  description?: string
  items?: ListItemPayload[]
}

export interface ConvertListPayload {
  storeName?: string
  purchaseDate?: string
  paymentMethod?: string
  accountId?: string
  creditCardId?: string
  categoryId?: string
}

export const shoppingApi = {
  // ─── Compras ───────────────────────────────────────────────
  listPurchases: (groupId: string) =>
    apiClient.get<ShoppingPurchase[]>(`${base(groupId)}/purchases`).then(r => r.data),

  getPurchase: (groupId: string, id: string) =>
    apiClient.get<ShoppingPurchase>(`${base(groupId)}/purchases/${id}`).then(r => r.data),

  createManual: (groupId: string, data: PurchasePayload) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/purchases/manual`, data).then(r => r.data),

  updatePurchase: (groupId: string, id: string, data: PurchasePayload) =>
    apiClient.put<ShoppingPurchase>(`${base(groupId)}/purchases/${id}`, data).then(r => r.data),

  deletePurchase: (groupId: string, id: string) =>
    apiClient.delete<void>(`${base(groupId)}/purchases/${id}`).then(r => r.data),

  finalizePurchase: (groupId: string, id: string) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/purchases/${id}/finalize`).then(r => r.data),

  generateTransaction: (groupId: string, id: string, data: GenerateTransactionPayload) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/purchases/${id}/generate-transaction`, data).then(r => r.data),

  // ─── NFC-e ─────────────────────────────────────────────────
  importFromUrl: (groupId: string, url: string) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/receipts/import-from-url`, { url }).then(r => r.data),

  importFromQrCode: (groupId: string, url: string) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/receipts/import-from-qrcode`, { url }).then(r => r.data),

  // ─── Resumo / Histórico ────────────────────────────────────
  summary: (groupId: string) =>
    apiClient.get<ShoppingSummary>(`${base(groupId)}/summary`).then(r => r.data),

  priceHistory: (groupId: string) =>
    apiClient.get<PriceHistory[]>(`${base(groupId)}/price-history`).then(r => r.data),

  priceHistoryDetail: (groupId: string, normalizedName: string) =>
    apiClient.get<PriceHistory>(`${base(groupId)}/price-history/${encodeURIComponent(normalizedName)}`).then(r => r.data),

  // ─── Listas ────────────────────────────────────────────────
  listLists: (groupId: string) =>
    apiClient.get<ShoppingList[]>(`${base(groupId)}/lists`).then(r => r.data),

  getList: (groupId: string, id: string) =>
    apiClient.get<ShoppingList>(`${base(groupId)}/lists/${id}`).then(r => r.data),

  createList: (groupId: string, data: ListPayload) =>
    apiClient.post<ShoppingList>(`${base(groupId)}/lists`, data).then(r => r.data),

  updateList: (groupId: string, id: string, data: ListPayload) =>
    apiClient.put<ShoppingList>(`${base(groupId)}/lists/${id}`, data).then(r => r.data),

  deleteList: (groupId: string, id: string) =>
    apiClient.delete<void>(`${base(groupId)}/lists/${id}`).then(r => r.data),

  addListItem: (groupId: string, listId: string, data: ListItemPayload) =>
    apiClient.post<ShoppingList>(`${base(groupId)}/lists/${listId}/items`, data).then(r => r.data),

  updateListItem: (groupId: string, listId: string, itemId: string, data: ListItemPayload) =>
    apiClient.put<ShoppingList>(`${base(groupId)}/lists/${listId}/items/${itemId}`, data).then(r => r.data),

  deleteListItem: (groupId: string, listId: string, itemId: string) =>
    apiClient.delete<ShoppingList>(`${base(groupId)}/lists/${listId}/items/${itemId}`).then(r => r.data),

  convertList: (groupId: string, listId: string, data?: ConvertListPayload) =>
    apiClient.post<ShoppingPurchase>(`${base(groupId)}/lists/${listId}/convert-to-purchase`, data ?? {}).then(r => r.data),
}
