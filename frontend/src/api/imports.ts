import apiClient from './client'

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type ImportItemStatus = 'PENDING' | 'IMPORTED' | 'SKIPPED' | 'DUPLICATE'
export type FileType = 'CSV' | 'OFX' | 'XLSX'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface BankImportItem {
  id: string
  description: string
  amount: number
  transactionDate: string
  type: TransactionType
  categoryId?: string
  categoryName?: string
  status: ImportItemStatus
  transactionId?: string
  rawData?: string
}

export interface BankImport {
  id: string
  accountId?: string
  accountName?: string
  fileName: string
  fileType: FileType
  totalRecords: number
  importedRecords: number
  skippedRecords: number
  status: ImportStatus
  errorMessage?: string
  createdAt: string
  items: BankImportItem[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export const importsApi = {
  list: (groupId: string, page = 0, size = 20) =>
    apiClient
      .get<PageResponse<BankImport>>(`/family-groups/${groupId}/imports`, {
        params: { page, size },
      })
      .then(r => r.data),

  get: (groupId: string, importId: string) =>
    apiClient
      .get<BankImport>(`/family-groups/${groupId}/imports/${importId}`)
      .then(r => r.data),

  upload: (groupId: string, accountId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('accountId', accountId)
    return apiClient
      .post<BankImport>(`/family-groups/${groupId}/imports/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  confirm: (groupId: string, importId: string, itemIds: string[]) =>
    apiClient
      .post<BankImport>(`/family-groups/${groupId}/imports/${importId}/confirm`, {
        itemIds,
      })
      .then(r => r.data),

  delete: (groupId: string, importId: string) =>
    apiClient.delete(`/family-groups/${groupId}/imports/${importId}`),
}
