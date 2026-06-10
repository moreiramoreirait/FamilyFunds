import apiClient from './client'

async function downloadFile(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: String(response.headers['content-type'] ?? 'application/octet-stream') })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export const reportsApi = {
  downloadCashFlowExcel: (groupId: string, year: number) =>
    downloadFile(`/family-groups/${groupId}/reports/cash-flow/excel?year=${year}`, `fluxo-de-caixa-${year}.xlsx`),

  downloadCashFlowPdf: (groupId: string, year: number) =>
    downloadFile(`/family-groups/${groupId}/reports/cash-flow/pdf?year=${year}`, `fluxo-de-caixa-${year}.pdf`),

  downloadCategoryExcel: (groupId: string, year: number) =>
    downloadFile(`/family-groups/${groupId}/reports/categories/excel?year=${year}`, `categorias-${year}.xlsx`),

  downloadCategoryPdf: (groupId: string, year: number) =>
    downloadFile(`/family-groups/${groupId}/reports/categories/pdf?year=${year}`, `categorias-${year}.pdf`),
}
