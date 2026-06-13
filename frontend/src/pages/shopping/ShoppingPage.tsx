import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Link2, Camera, Wallet, CalendarClock, Package, ListChecks,
  TrendingUp, TrendingDown, Minus, Sparkles, Lock, Store,
} from 'lucide-react'
import { shoppingApi } from '@/api/shopping'
import { subscriptionsApi } from '@/api/subscriptions'
import { familyGroupsApi } from '@/api/familyGroups'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ShoppingPurchase, PurchaseStatus, ShoppingList, PriceHistory } from '@/types'
import { ManualPurchaseModal } from '@/components/shopping/ManualPurchaseModal'
import { PasteNfceLinkModal } from '@/components/shopping/PasteNfceLinkModal'
import { QrScanModal } from '@/components/shopping/QrScanModal'
import { PurchaseDetailModal } from '@/components/shopping/PurchaseDetailModal'
import { ShoppingListModal } from '@/components/shopping/ShoppingListModal'

const statusMap: Record<PurchaseStatus, { label: string; variant: any }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'pending' },
  FINALIZADA: { label: 'Finalizada', variant: 'default' },
  LANCADA_NO_FINANCEIRO: { label: 'Lançada', variant: 'paid' },
  CANCELADA: { label: 'Cancelada', variant: 'cancelled' },
}
const listStatusMap: Record<string, { label: string; variant: any }> = {
  ABERTA: { label: 'Aberta', variant: 'default' },
  EM_COMPRA: { label: 'Em compra', variant: 'pending' },
  FINALIZADA: { label: 'Finalizada', variant: 'paid' },
  CONVERTIDA_EM_COMPRA: { label: 'Convertida', variant: 'paid' },
  CANCELADA: { label: 'Cancelada', variant: 'cancelled' },
}

export default function ShoppingPage() {
  const { currentGroupId } = useAuthStore()
  const { data: groups } = useQuery({ queryKey: ['family-groups'], queryFn: familyGroupsApi.list })
  const groupId = currentGroupId || groups?.[0]?.id

  const [manualOpen, setManualOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [editList, setEditList] = useState<ShoppingList | null>(null)

  const { data: summary } = useQuery({
    queryKey: ['shopping-summary', groupId], queryFn: () => shoppingApi.summary(groupId!), enabled: !!groupId,
  })
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ['shopping-purchases', groupId], queryFn: () => shoppingApi.listPurchases(groupId!), enabled: !!groupId,
  })
  const { data: lists = [], isLoading: loadingLists } = useQuery({
    queryKey: ['shopping-lists', groupId], queryFn: () => shoppingApi.listLists(groupId!), enabled: !!groupId,
  })
  const { data: priceHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['shopping-price-history', groupId], queryFn: () => shoppingApi.priceHistory(groupId!), enabled: !!groupId,
  })
  const { data: subscription } = useQuery({
    queryKey: ['subscription', groupId], queryFn: () => subscriptionsApi.getSubscription(groupId!), enabled: !!groupId,
  })
  const isPremium = !!subscription?.aiEnabled

  const openDetail = (p: ShoppingPurchase) => setDetailId(p.id)

  if (!groupId) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Nenhum grupo familiar encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compras Inteligentes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Supermercado, NFC-e, listas e histórico de preços</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setQrOpen(true)}><Camera className="h-4 w-4" /> Escanear QR</Button>
          <Button variant="outline" className="gap-2" onClick={() => setPasteOpen(true)}><Link2 className="h-4 w-4" /> Colar link</Button>
          <Button className="gap-2" onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /> Nova compra</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} title="Gasto no mês" value={formatCurrency(summary?.monthTotal ?? 0)}
          sub={`${summary?.monthPurchaseCount ?? 0} compra(s)`} color="text-emerald-600" />
        <SummaryCard icon={CalendarClock} title="Última compra" value={summary?.lastPurchaseStore || '—'}
          sub={summary?.lastPurchaseDate ? `${formatDate(summary.lastPurchaseDate)} · ${formatCurrency(summary.lastPurchaseAmount ?? 0)}` : undefined}
          color="text-blue-600" />
        <SummaryCard icon={Package} title="Produtos no histórico" value={String(summary?.trackedProducts ?? 0)}
          sub="Com preço acompanhado" color="text-purple-600" />
        <SummaryCard icon={ListChecks} title="Listas ativas" value={String(lists.filter(l => l.status === 'ABERTA' || l.status === 'EM_COMPRA').length)}
          sub={`${lists.length} no total`} color="text-amber-600" />
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="lists">Listas</TabsTrigger>
          <TabsTrigger value="history">Histórico de preços</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Insights</TabsTrigger>
        </TabsList>

        {/* ─── Compras ─── */}
        <TabsContent value="purchases" className="mt-4">
          {loadingPurchases ? (
            <SkeletonList />
          ) : purchases.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nenhuma compra registrada"
              text="Cadastre uma compra manual, cole o link da NFC-e ou escaneie o QR Code do cupom."
              action={<Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova compra</Button>} />
          ) : (
            <Card><CardContent className="p-0 divide-y divide-border">
              {purchases.map(p => {
                const st = statusMap[p.status]
                return (
                  <button key={p.id} onClick={() => openDetail(p)} className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Store className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{p.storeName}</p>
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        {p.financialTransactionId && <Badge variant="paid" className="text-xs">Despesa lançada</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(p.purchaseDate)} · {p.items.length} item(ns)
                      </p>
                    </div>
                    <p className="text-sm font-bold flex-shrink-0">{formatCurrency(p.totalAmount ?? 0)}</p>
                  </button>
                )
              })}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── Listas ─── */}
        <TabsContent value="lists" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditList(null); setListOpen(true) }}>
              <Plus className="h-4 w-4" /> Nova lista
            </Button>
          </div>
          {loadingLists ? (
            <SkeletonList />
          ) : lists.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nenhuma lista"
              text="Crie uma lista de compras (checklist). Ela não gera despesa — depois você pode convertê-la em compra."
              action={<Button onClick={() => { setEditList(null); setListOpen(true) }}><Plus className="h-4 w-4 mr-2" /> Nova lista</Button>} />
          ) : (
            <Card><CardContent className="p-0 divide-y divide-border">
              {lists.map(l => {
                const st = listStatusMap[l.status] || listStatusMap.ABERTA
                const checked = l.items.filter(i => i.checked).length
                return (
                  <button key={l.id} onClick={() => { setEditList(l); setListOpen(true) }} className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <ListChecks className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {checked}/{l.items.length} itens · est. {formatCurrency(l.estimatedTotal ?? 0)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── Histórico de preços ─── */}
        <TabsContent value="history" className="mt-4">
          {loadingHistory ? (
            <SkeletonList />
          ) : priceHistory.length === 0 ? (
            <EmptyState icon={Package} title="Sem histórico ainda"
              text="Os preços dos itens das suas compras aparecem aqui para você comparar ao longo do tempo." />
          ) : (
            <Card><CardContent className="p-0 divide-y divide-border">
              {priceHistory.map(ph => <PriceHistoryRow key={ph.normalizedProductName} ph={ph} />)}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── Insights ─── */}
        <TabsContent value="insights" className="mt-4">
          <InsightsPanel priceHistory={priceHistory} isPremium={isPremium} />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {manualOpen && <ManualPurchaseModal open={manualOpen} onClose={() => setManualOpen(false)} groupId={groupId} />}
      {pasteOpen && <PasteNfceLinkModal open={pasteOpen} onClose={() => setPasteOpen(false)} groupId={groupId} onImported={p => setDetailId(p.id)} />}
      {qrOpen && <QrScanModal open={qrOpen} onClose={() => setQrOpen(false)} groupId={groupId} onImported={p => setDetailId(p.id)} />}
      {detailId && <PurchaseDetailModal open={!!detailId} onClose={() => setDetailId(null)} groupId={groupId} purchaseId={detailId} />}
      {listOpen && <ShoppingListModal open={listOpen} onClose={() => { setListOpen(false); setEditList(null) }} groupId={groupId} list={editList} onConverted={id => setDetailId(id)} />}
    </div>
  )
}

function PriceHistoryRow({ ph }: { ph: PriceHistory }) {
  const trend = ph.lastPrice != null && ph.minPrice != null && ph.maxPrice != null
    ? (ph.lastPrice >= ph.maxPrice ? 'up' : ph.lastPrice <= ph.minPrice ? 'down' : 'mid')
    : 'mid'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-rose-600' : trend === 'down' ? 'text-emerald-600' : 'text-muted-foreground'
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ph.productName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ph.records} registro(s) · mín {formatCurrency(ph.minPrice ?? 0)} · máx {formatCurrency(ph.maxPrice ?? 0)}
          {ph.lastStoreName && ` · ${ph.lastStoreName}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold flex items-center gap-1 justify-end">
          <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
          {formatCurrency(ph.lastPrice ?? 0)}
        </p>
        {ph.lastPurchaseDate && <p className="text-xs text-muted-foreground">{formatDate(ph.lastPurchaseDate)}</p>}
      </div>
    </div>
  )
}

function InsightsPanel({ priceHistory, isPremium }: { priceHistory: PriceHistory[]; isPremium: boolean }) {
  // Insight básico (todos): produtos que mais subiram de preço (último vs mínimo)
  const topRisers = useMemo(() => {
    return priceHistory
      .filter(p => p.lastPrice != null && p.minPrice != null && p.minPrice > 0 && p.lastPrice > p.minPrice)
      .map(p => ({ ...p, pct: ((p.lastPrice! - p.minPrice!) / p.minPrice!) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
  }, [priceHistory])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-rose-600" /> Produtos que mais subiram</h3>
          {topRisers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há variação de preço suficiente para comparar.</p>
          ) : (
            <div className="space-y-2">
              {topRisers.map(p => (
                <div key={p.normalizedProductName} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.productName}</span>
                  <span className="font-medium text-rose-600 flex-shrink-0">
                    +{p.pct.toFixed(0)}% ({formatCurrency(p.minPrice ?? 0)} → {formatCurrency(p.lastPrice ?? 0)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avançado / IA — gated Premium */}
      <Card className={cn(!isPremium && 'opacity-95')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" /> Análises avançadas com IA</h3>
            {!isPremium && <Badge variant="default" className="gap-1"><Lock className="h-3 w-3" /> Premium</Badge>}
          </div>
          {isPremium ? (
            <p className="text-sm text-muted-foreground">
              Recomendações de economia, melhor mercado por produto e previsão de gastos chegam aqui em breve com base no seu histórico.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Desbloqueie comparativos entre mercados, alertas de economia e previsões inteligentes de gastos com o plano Premium.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/plans'}>Ver planos</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ icon: Icon, title, value, sub, color }: {
  icon: React.ElementType; title: string; value: string; sub?: string; color: string
}) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={cn('text-lg font-bold mt-1 truncate', color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-muted"><Icon className={cn('h-5 w-5', color)} /></div>
      </div>
    </CardContent></Card>
  )
}

function SkeletonList() {
  return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
}

function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="p-4 bg-muted rounded-full"><Icon className="h-8 w-8 text-muted-foreground" /></div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-sm">{text}</p>
      {action}
    </div>
  )
}
