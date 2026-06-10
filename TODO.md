# FamilyFunds — Arquitetura, Roadmap e Fases

> Documento de referência: arquitetura atual, o que foi entregue e o que vem a seguir.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                     │
│  React 18 + TypeScript + Vite + Tailwind + Shadcn/UI    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST JSON
┌────────────────────────▼────────────────────────────────┐
│                   Render (Backend)                       │
│          Spring Boot 3 / Java 21 — Docker               │
│    JWT Auth · CORS · Bean Validation · Flyway           │
└────────────────────────┬────────────────────────────────┘
                         │ JDBC (Supabase Session Pooler)
┌────────────────────────▼────────────────────────────────┐
│                 Supabase (PostgreSQL 15)                 │
│        Multi-tenant por family_group_id                 │
└─────────────────────────────────────────────────────────┘
```

### Modelo Multi-Tenant

Cada **FamilyGroup** é um tenant isolado. Todo acesso a dados é filtrado por `family_group_id`. Membros têm papel **ADMIN / EDITOR / VIEWER** — verificado no backend antes de qualquer operação.

---

## Backend — Estrutura de Pacotes

```
com.familyfinance/
├── controller/        Endpoints REST (@RestController)
│   ├── AuthController
│   ├── UserController
│   ├── FamilyGroupController
│   ├── AccountController
│   ├── TransactionController
│   ├── CategoryController
│   ├── CreditCardController
│   ├── BudgetController
│   ├── TagController
│   ├── CostCenterController
│   ├── NotificationController
│   ├── BankImportController
│   ├── AiSettingController
│   ├── DashboardController
│   ├── PlanController          ← Fase 1
│   ├── SubscriptionController  ← Fase 1 (+ checkout/portal Fase 3)
│   ├── AdminController         ← Fase 2
│   ├── ReportController        ← Fase 5 (Excel/PDF)
│   └── StripeWebhookController ← Fase 3
│
├── service/           Regras de negócio
│   ├── AuthService
│   ├── CategoryService
│   ├── AccountService          ← limit check Fase 1
│   ├── TransactionService      ← limit check Fase 1
│   ├── CreditCardService       ← limit check Fase 1
│   ├── FamilyGroupService      ← trial + invite email Fase 1/2
│   ├── BankImportService       ← limit check Fase 1
│   ├── BudgetService
│   ├── NotificationService
│   ├── DashboardService
│   ├── TagService
│   ├── AiSettingService
│   ├── EncryptionService
│   ├── EmailService            ← Fase 2 (async)
│   ├── SubscriptionService     ← Fase 1 (limites + trial)
│   ├── AdminService            ← Fase 2
│   ├── StripeService           ← Fase 3 (checkout, portal, webhooks)
│   └── ReportService           ← Fase 5 (Apache POI + OpenPDF)
│
├── entity/            JPA Entities
│   ├── User (+ isSystemAdmin)
│   ├── FamilyGroup
│   ├── FamilyGroupMember
│   ├── FamilyGroupInvite
│   ├── Account
│   ├── Transaction
│   ├── Category / Subcategory
│   ├── CreditCard / CreditCardInvoice / CreditCardPurchase
│   ├── Budget
│   ├── Tag / CostCenter
│   ├── BankImport / BankImportItem
│   ├── Notification
│   ├── AuditLog
│   ├── AiSetting
│   ├── Subscription            ← Fase 1 (+ stripe_customer_id Fase 3)
│   ├── PlanType (enum)         ← Fase 1
│   ├── SubscriptionStatus (enum) ← Fase 1
│   └── PaymentEvent            ← Fase 3 (auditoria de webhooks)
│
├── repository/        Spring Data JPA
├── dto/               Request/Response records
├── security/          JWT filter + UserDetailsService
├── exception/         GlobalExceptionHandler
└── config/            OpenApiConfig, FlywayConfig (repair+migrate)
```

### Migrations Flyway

| Versão | Conteúdo |
|--------|----------|
| V1 | users, family_groups, members, invites, audit_logs |
| V2 | accounts, categories, subcategories, tags, cost_centers, credit_cards, invoices |
| V3 | transactions, budgets, notifications, ai_settings, bank_imports |
| V4 | subscriptions (Fase 1) |
| V5 | users.is_system_admin (Fase 2) |
| V6 | rename plan PRO→ESSENCIAL, BUSINESS→PREMIUM (Fase 3) |
| V7 | subscriptions.stripe_* + tabela payment_events (Fase 3) |

---

## Frontend — Estrutura de Páginas

```
src/
├── pages/
│   ├── auth/           LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│   ├── dashboard/      DashboardPage (KPIs, gráficos, resumo mensal)
│   ├── transactions/   TransactionsPage (lista paginada + filtros)
│   ├── accounts/       AccountsPage (CRUD contas)
│   ├── cards/          CardsPage (cartões + faturas)
│   ├── categories/     CategoriesPage (CRUD categorias + ícones)
│   ├── budget/         BudgetPage (orçamentos mensais)
│   ├── imports/        ImportsPage (upload CSV/OFX/XLSX)
│   ├── reports/        ReportsPage (gráficos avançados)
│   ├── family/         FamilyPage (membros, convites, papéis)
│   ├── settings/       SettingsPage (perfil, preferências)
│   ├── plans/          PlansPage ← Fase 1 (cards de preço, upgrade)
│   ├── usage/          UsagePage ← Fase 2 (barras de uso vs limites)
│   └── admin/          AdminPage ← Fase 2 (painel admin sistema)
│
├── components/
│   ├── layout/         AppLayout, Sidebar, Header, SubscriptionBanner
│   ├── transactions/   TransactionModal (criar/editar lançamento)
│   └── ui/             Shadcn components (Button, Card, Badge, etc.)
│
├── api/                Clientes HTTP (axios)
│   ├── client.ts       Instância axios + interceptor JWT
│   ├── auth.ts
│   ├── accounts.ts
│   ├── transactions.ts
│   ├── categories.ts
│   ├── subscriptions.ts ← Fase 1/2
│   └── admin.ts        ← Fase 2
│
├── store/              Zustand
│   └── authStore.ts    user, token, currentGroupId
│
└── types/              TypeScript interfaces compartilhadas
```

---

## Fases Entregues

### ✅ Fase 0 — MVP (base)
- Auth JWT (login, cadastro, recuperação de senha)
- Grupos familiares + convites (token via link)
- RBAC: ADMIN / EDITOR / VIEWER
- Dashboard com KPIs e gráficos (Recharts)
- Contas bancárias (CRUD + saldo automático)
- Lançamentos: receitas, despesas, transferências
- Parcelamento + marcar como pago
- Categorias com ícones e subcategorias padrão
- Centros de custo e Tags
- Cartões de crédito + faturas
- Importação CSV / OFX / XLSX
- Orçamentos mensais com alertas
- Notificações internas (vencimentos, D-3)
- Configurações de IA por grupo
- Swagger UI
- Deploy: Render + Vercel + Supabase

### ✅ Fase 1 — SaaS Multi-Tenant: Planos + Limites
- `PlanType` enum: FREE / ESSENCIAL / PREMIUM com limites embutidos
- `Subscription` entity + trial automático de 14 dias ao criar grupo
- `SubscriptionService`: limit checks para contas, cartões, membros, lançamentos, importações e IA
- Cron diário (03h) para expirar trials vencidos
- `GET /api/v1/plans` (público)
- `GET|POST /api/v1/family-groups/{id}/subscription`
- Frontend: `PlansPage` com cards de preço, badge de plano na sidebar, `SubscriptionBanner` (alerta nos últimos 7 dias de trial)
- Flyway V4: tabela `subscriptions`

### ✅ Fase 2 — Dashboard de Uso + Admin + Email
- `EmailService` async: convite por e-mail ao adicionar membro, alerta ao admin a 80% do limite
- `UsageResponse` DTO: uso atual vs limites por recurso
- `GET /api/v1/family-groups/{id}/subscription/usage`
- `AdminService` + `AdminController`: lista grupos, stats (MRR, trials), força mudança de plano
- `is_system_admin` na tabela users; `/api/v1/admin/**` restrito a sys admins
- Frontend: `UsagePage` (barras de progresso coloridas), `AdminPage` (stats grid + tabela de grupos com ações inline)
- Flyway V5: coluna `users.is_system_admin`

### ✅ Fase 3 — Pagamentos (Stripe)
- `StripeService` (Stripe Java SDK 24.3.0): Checkout Session, Billing Portal e processamento de webhooks
- Webhooks idempotentes (`stripe_event_id` único): `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- `getOrCreateCustomer()` reaproveita o `stripe_customer_id` salvo na assinatura
- `PaymentEvent` entity — auditoria de todos os eventos recebidos
- Degradação graciosa: sem `STRIPE_SECRET_KEY`, lança `BusinessException` amigável (não quebra o app)
- `POST /subscription/checkout?plan=` e `POST /subscription/portal` (ADMIN)
- `POST /api/v1/webhooks/stripe` (público, valida assinatura)
- Frontend: `PlansPage` redireciona ao Stripe Checkout e expõe link "Gerenciar faturamento" (portal)
- Flyway V6 (rename) + V7 (`stripe_customer_id`, `stripe_subscription_id`, tabela `payment_events`)
- **Pendente de configuração:** criar conta Stripe, produtos (Essencial/Premium) e definir as 4 env vars `STRIPE_*` no Render

### ✅ Fase 5 — Relatórios Avançados
- `ReportService`: geração de **Excel (.xlsx)** via Apache POI 5.2.5 e **PDF** via OpenPDF 1.3.43
- Relatório de **fluxo de caixa mensal** (receitas vs despesas vs saldo, por mês)
- Relatório **por categoria** (detalhamento de gastos no ano)
- Acesso restrito ao plano PREMIUM via `checkAdvancedReportsAccess()`
- 4 endpoints: `/reports/cash-flow/{excel,pdf}` e `/reports/categories/{excel,pdf}` (param `year` opcional, default ano atual)
- Frontend: `ReportsPage` com botões Excel/PDF contextuais por aba ativa (download via blob)

---

## Roadmap — Próximas Fases

### 🔲 Fase 4 — Integração com IA
- `AiSetting` já existe no banco (provider, api_key criptografado, model)
- Disponível apenas para o plano PREMIUM (`checkAiAccess()` já implementado)
- Features a implementar:
  - Categorização automática de lançamentos importados
  - Análise de gastos: "você gastou 30% mais em restaurantes este mês"
  - Sugestão de orçamento baseado no histórico
  - Chat financeiro (perguntas em linguagem natural sobre os dados)
- Providers planejados: OpenAI GPT-4o, Claude claude-sonnet-4-6, Gemini

### 🔲 Fase 6 — Aplicativo Mobile
- React Native + Expo
- Compartilha a mesma API REST
- Features core: lançamentos, dashboard, notificações push
- Autenticação biométrica (Face ID / digital)
- Câmera: fotografar comprovante e anexar ao lançamento
- Notificações push (Expo + FCM/APNs)

### 🔲 Fase 7 — Open Finance / Conexão Bancária
- Integrar com Belvo ou Pluggy (agregadores Open Finance Brasil)
- Sincronização automática de extratos
- Conciliação automática com lançamentos existentes
- Suporte a PIX (identificação de transações via chave)
- Nova migration: tabela `bank_connections`

### 🔲 Fase 8 — Notificações Externas
- WhatsApp via Twilio ou Z-API
  - Alerta de vencimento ("Conta de luz vence amanhã: R$ 150")
  - Resumo semanal de gastos
- Push notifications web (Web Push API)
- Configuração granular por usuário (quais alertas, qual canal)

---

## Débitos Técnicos e Melhorias Pontuais

### Backend
- [ ] Rate limiting (Spring + Bucket4j ou Redis)
- [ ] Paginação em todos os endpoints de listagem (alguns ainda retornam lista)
- [ ] Cache com Redis para dashboard e relatórios pesados
- [ ] Testes de integração (Spring Boot Test + Testcontainers)
- [ ] Auditoria: popular `audit_logs` nos CRUDs sensíveis
- [ ] Refresh token endpoint (`POST /api/v1/auth/refresh`)
- [ ] Soft-delete consistente em todas as entidades
- [ ] Validação de e-mail no cadastro (envio de link de confirmação)

### Frontend
- [ ] Testes unitários (Vitest + Testing Library)
- [ ] Error boundaries por página
- [ ] Skeleton loading states nos cards e tabelas
- [ ] Filtros avançados em TransactionsPage (por conta, categoria, período)
- [ ] Infinite scroll ou paginação na lista de lançamentos
- [ ] PWA (manifest + service worker para uso offline parcial)
- [ ] i18n — base PT-BR ok, preparar para EN/ES

### Infra / DevOps
- [ ] GitHub Actions: CI (build + testes) em PRs
- [ ] Ambiente de staging separado (Render + Vercel preview)
- [ ] Variáveis de ambiente via Render Secret Files para configs sensíveis
- [ ] Logs estruturados (JSON) + integração com Datadog ou Grafana Cloud
- [ ] Backup automático do Supabase configurado e testado
