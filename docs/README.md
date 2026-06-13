# FamilyFunds — Sistema de Gestão Financeira Familiar SaaS

Sistema completo de gestão financeira pessoal e familiar, multi-tenant SaaS com planos e limites de uso. Inspirado em Mobills, Nubank e Inter.

**Produção:**
- Frontend: https://family-funds-eight.vercel.app
- Backend API: https://familyfunds-api.onrender.com/api/v1
- Swagger UI: https://familyfunds-api.onrender.com/swagger-ui.html

---

## Arquitetura

```
/
├── backend/          # Java 21 + Spring Boot 3 — API REST
├── frontend/         # React 18 + TypeScript + Vite + Tailwind
└── docs/             # Documentação
```

O sistema é **multi-tenant por grupo familiar** (`family_group_id`). Cada grupo tem seu próprio conjunto de dados (contas, lançamentos, categorias) e uma assinatura de plano.

---

## Stack

### Backend
- **Java 21** + **Spring Boot 3.2**
- **PostgreSQL** via Supabase (Session Pooler, porta 5432)
- **Flyway** — migrações automáticas
- **JWT** stateless + **BCrypt**
- **Spring Mail** (SMTP) — convites e alertas
- **Stripe Java SDK** — checkout, billing portal e webhooks
- **Apache POI** (Excel) + **OpenPDF** (PDF) — relatórios avançados
- **Swagger/OpenAPI** — docs interativa
- **Lombok** + **Validation (Bean)**
- Deploy: **Render** (Docker, free tier 512 MB)

### Frontend
- **React 18** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** + **Shadcn/UI**
- **React Query** — cache e sincronização
- **Zustand** — estado global (auth + grupo atual)
- **React Hook Form** + **Zod** — formulários tipados
- **Recharts** — gráficos
- **Axios** — cliente HTTP
- Deploy: **Vercel**

---

## Setup Local

### Pré-requisitos
- Java 21 (Temurin recomendado)
- Node.js 20+
- PostgreSQL 15+ ou conta Supabase
- Maven 3.9+ (wrapper incluído)

### Backend

```bash
cd backend
cp .env.example .env   # editar com suas configurações
./mvnw spring-boot:run
# API: http://localhost:8080
# Swagger: http://localhost:8080/swagger-ui.html
```

> Com Java 25 instalado use `mvn21.bat` (Windows) ou `mvn21.sh` (Linux/Mac) — Lombok não é compatível com Java 25.

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=/api/v1" > .env.local
npm run dev
# App: http://localhost:5173
```

---

## Banco de Dados

### Migrações Flyway (automáticas na inicialização)

| Migration | Conteúdo |
|-----------|----------|
| `V1` | users, family_groups, family_group_members, family_group_invites, audit_logs |
| `V2` | categories, subcategories, cost_centers, tags, accounts, credit_cards, invoices |
| `V3` | transactions, transaction_tags, cc_purchases, budgets, notifications, ai_settings, bank_imports |
| `V4` | **subscriptions** (planos SaaS, status, trial) |
| `V5` | `is_system_admin` na tabela users |
| `V6` | rename de planos PRO→ESSENCIAL, BUSINESS→PREMIUM |
| `V7` | colunas `stripe_*` em subscriptions + tabela **payment_events** |
| `V8` | **service_subscriptions** + colunas `origin_type`/`origin_id`/`recurrence_reference_date` em transactions |
| `V9` | **recurring_expenses** (despesas recorrentes, incl. recorrência BIWEEKLY) |
| `V10` | coluna `payment_pending` em subscriptions (cobrança Stripe em re-tentativa) |
| `V11` | **shopping_purchases**, **shopping_purchase_items**, **product_price_history** (Compras Inteligentes) |
| `V12` | **shopping_lists** + **shopping_list_items** (listas/checklist) |

### Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (campo `is_system_admin` para acesso ao painel admin) |
| `family_groups` | Grupos familiares (tenant) |
| `family_group_members` | Membros com papel ADMIN/EDITOR/VIEWER |
| `family_group_invites` | Convites por e-mail com token |
| `subscriptions` | Plano e status de cada grupo (FREE/ESSENCIAL/PREMIUM + TRIAL) |
| `accounts` | Contas bancárias |
| `categories` / `subcategories` | Categorias de lançamentos |
| `transactions` | Lançamentos financeiros |
| `credit_cards` / `credit_card_invoices` | Cartões e faturas |
| `budgets` | Orçamentos mensais |
| `bank_imports` | Importações CSV/OFX/XLSX |
| `notifications` | Notificações internas |
| `ai_settings` | Configurações de IA por grupo |
| `payment_events` | Auditoria de eventos de webhook do Stripe |
| `service_subscriptions` | Assinaturas de serviços recorrentes (Netflix, Spotify…) que geram lançamentos |
| `recurring_expenses` | Despesas fixas recorrentes (aluguel, energia, escola…) |
| `shopping_purchases` / `shopping_purchase_items` | Compras de supermercado e seus itens (Compras Inteligentes) |
| `product_price_history` | Histórico de preços por produto (alimentado pelos itens de compra) |
| `shopping_lists` / `shopping_list_items` | Listas de compras (checklist) — não geram despesa |

---

## SaaS Multi-Tenant

### Planos

| Feature | FREE | ESSENCIAL | PREMIUM |
|---------|------|-----------|---------|
| Usuários | 2 | 5 | Ilimitado |
| Contas bancárias | 2 | 10 | Ilimitado |
| Cartões de crédito | 1 | 5 | Ilimitado |
| Lançamentos/mês | 50 | 500 | Ilimitado |
| Importações/mês | 1 | 5 | Ilimitado |
| Integração IA | Não | Não | Sim |
| Relatórios avançados | Não | Não | Sim |
| Preço | Grátis | R$ 14,90/mês | R$ 29,90/mês |

**Trial:** todo novo grupo ganha automaticamente 14 dias do plano PREMIUM.

### Limites enforcement
- `SubscriptionService` verifica limites antes de criar contas, cartões, membros e lançamentos
- Ao atingir 80% do limite mensal de lançamentos, o admin do grupo recebe e-mail de aviso (async)
- Cron diário (03h) expira trials vencidos

### Tornar um usuário administrador do sistema
```sql
UPDATE users SET is_system_admin = true WHERE email = 'admin@seudominio.com';
```

---

## Segurança

- **JWT Bearer Token** — todas as rotas exceto `/api/v1/auth/**`, `/api/v1/plans` e `/api/v1/webhooks/**`
- **Webhook Stripe** — autenticado por assinatura HMAC (`Stripe-Signature`), não por JWT; eventos processados de forma idempotente
- **BCrypt** — hash de senhas
- **CORS** configurado via variável de ambiente `CORS_ALLOWED_ORIGINS`
- **Bean Validation** no backend + **Zod** no frontend
- **Isolamento por tenant** — todos os dados filtrados por `family_group_id`
- **RBAC** — ADMIN / EDITOR / VIEWER, verificado no backend
- **Admin do sistema** — rotas `/api/v1/admin/**` exigem `is_system_admin = true`

---

## API Endpoints

### Auth (público)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### Usuário
```
GET  /api/v1/users/me
```

### Grupos Familiares
```
GET    /api/v1/family-groups
POST   /api/v1/family-groups
GET    /api/v1/family-groups/{id}
PUT    /api/v1/family-groups/{id}
POST   /api/v1/family-groups/{id}/invite           — envia e-mail de convite
POST   /api/v1/family-groups/invites/{token}/accept
```

### Planos e Assinaturas
```
GET  /api/v1/plans                                           — lista planos (público)
GET  /api/v1/family-groups/{id}/subscription                 — assinatura do grupo
GET  /api/v1/family-groups/{id}/subscription/usage           — uso atual vs limites
POST /api/v1/family-groups/{id}/subscription/upgrade?plan=   — upgrade manual (ADMIN)
POST /api/v1/family-groups/{id}/subscription/cancel          — cancelar (ADMIN)
POST /api/v1/family-groups/{id}/subscription/checkout?plan=  — Stripe Checkout (ADMIN)
POST /api/v1/family-groups/{id}/subscription/portal          — portal de faturamento (ADMIN)
```

### Pagamentos — Stripe (Fase 3)
```
POST /api/v1/webhooks/stripe   — recebe eventos do Stripe (público, valida assinatura)
```

### Relatórios Avançados (Fase 5 — plano PREMIUM)
```
GET /api/v1/family-groups/{id}/reports/cash-flow/excel?year=    — fluxo de caixa (.xlsx)
GET /api/v1/family-groups/{id}/reports/cash-flow/pdf?year=      — fluxo de caixa (.pdf)
GET /api/v1/family-groups/{id}/reports/categories/excel?year=   — por categoria (.xlsx)
GET /api/v1/family-groups/{id}/reports/categories/pdf?year=     — por categoria (.pdf)
```

### Admin do Sistema (requer is_system_admin)
```
GET  /api/v1/admin/groups
GET  /api/v1/admin/stats
POST /api/v1/admin/groups/{id}/plan?plan=
```

### Dashboard
```
GET /api/v1/family-groups/{groupId}/dashboard
```

### Contas
```
GET    /api/v1/family-groups/{groupId}/accounts
POST   /api/v1/family-groups/{groupId}/accounts
PUT    /api/v1/family-groups/{groupId}/accounts/{id}
DELETE /api/v1/family-groups/{groupId}/accounts/{id}
```

### Lançamentos
```
GET    /api/v1/family-groups/{groupId}/transactions?page=0&size=20
POST   /api/v1/family-groups/{groupId}/transactions
POST   /api/v1/family-groups/{groupId}/transactions/installments
GET    /api/v1/family-groups/{groupId}/transactions/{id}
PUT    /api/v1/family-groups/{groupId}/transactions/{id}
PATCH  /api/v1/family-groups/{groupId}/transactions/{id}/pay
DELETE /api/v1/family-groups/{groupId}/transactions/{id}
```

### Categorias / Subcategorias
```
GET    /api/v1/family-groups/{groupId}/categories
POST   /api/v1/family-groups/{groupId}/categories
PUT    /api/v1/family-groups/{groupId}/categories/{id}
DELETE /api/v1/family-groups/{groupId}/categories/{id}
```

### Cartões de Crédito
```
GET    /api/v1/family-groups/{groupId}/credit-cards
POST   /api/v1/family-groups/{groupId}/credit-cards
PUT    /api/v1/family-groups/{groupId}/credit-cards/{id}
GET    /api/v1/family-groups/{groupId}/credit-cards/{id}/invoices
```

### Assinaturas de Serviços (recorrentes que geram lançamento)
```
GET    /api/v1/family-groups/{groupId}/service-subscriptions
POST   /api/v1/family-groups/{groupId}/service-subscriptions
GET    /api/v1/family-groups/{groupId}/service-subscriptions/summary
PUT    /api/v1/family-groups/{groupId}/service-subscriptions/{id}
PATCH  /api/v1/family-groups/{groupId}/service-subscriptions/{id}/{pause|cancel|activate}
POST   /api/v1/family-groups/{groupId}/service-subscriptions/generate   — gera lançamentos devidos
```

### Despesas Recorrentes (despesas fixas)
```
GET    /api/v1/family-groups/{groupId}/recurring-expenses
POST   /api/v1/family-groups/{groupId}/recurring-expenses
GET    /api/v1/family-groups/{groupId}/recurring-expenses/summary
PUT    /api/v1/family-groups/{groupId}/recurring-expenses/{id}
POST   /api/v1/family-groups/{groupId}/recurring-expenses/generate
```

### Compras Inteligentes (supermercado, NFC-e, histórico de preços)
```
GET    /api/v1/family-groups/{groupId}/shopping/purchases
POST   /api/v1/family-groups/{groupId}/shopping/purchases/manual
GET    /api/v1/family-groups/{groupId}/shopping/purchases/{id}
PUT    /api/v1/family-groups/{groupId}/shopping/purchases/{id}
DELETE /api/v1/family-groups/{groupId}/shopping/purchases/{id}
POST   /api/v1/family-groups/{groupId}/shopping/purchases/{id}/finalize
POST   /api/v1/family-groups/{groupId}/shopping/purchases/{id}/generate-transaction  — gera 1 despesa (valor total)
POST   /api/v1/family-groups/{groupId}/shopping/receipts/import-from-url    — NFC-e por link (Jsoup)
POST   /api/v1/family-groups/{groupId}/shopping/receipts/import-from-qrcode — NFC-e por QR Code
GET    /api/v1/family-groups/{groupId}/shopping/summary
GET    /api/v1/family-groups/{groupId}/shopping/price-history[/{normalizedName}]
GET    /api/v1/family-groups/{groupId}/shopping/lists
POST   /api/v1/family-groups/{groupId}/shopping/lists
PUT    /api/v1/family-groups/{groupId}/shopping/lists/{id}
DELETE /api/v1/family-groups/{groupId}/shopping/lists/{id}
POST   /api/v1/family-groups/{groupId}/shopping/lists/{id}/items
PUT    /api/v1/family-groups/{groupId}/shopping/lists/{id}/items/{itemId}
DELETE /api/v1/family-groups/{groupId}/shopping/lists/{id}/items/{itemId}
POST   /api/v1/family-groups/{groupId}/shopping/lists/{id}/convert-to-purchase  — cria compra RASCUNHO (sem despesa)
```
> **Regra-chave (Compras Inteligentes):** uma compra gera **no máximo um** lançamento em `transactions`, com o **valor total**. Os preços por item ficam apenas no módulo (`shopping_purchase_items` + `product_price_history`). Listas são checklists e **não** geram despesa.

### Outros módulos
```
/{groupId}/cost-centers/**     — Centros de custo
/{groupId}/budgets/**          — Orçamentos mensais
/{groupId}/tags/**             — Tags
/{groupId}/notifications/**    — Notificações internas
/{groupId}/ai-settings/**      — Config. de IA
/{groupId}/bank-imports/**     — Importação CSV/OFX/XLSX
```

---

## Deploy

### Variáveis de Ambiente — Render (Backend)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | JDBC URL Supabase (Session Pooler) |
| `DATABASE_USERNAME` | Sim | Usuário do banco |
| `DATABASE_PASSWORD` | Sim | Senha do banco |
| `FLYWAY_URL` | Sim | Mesma que DATABASE_URL (conexão direta) |
| `FLYWAY_USER` | Sim | Mesmo que DATABASE_USERNAME |
| `FLYWAY_PASSWORD` | Sim | Mesmo que DATABASE_PASSWORD |
| `JWT_SECRET` | Sim | Gerado pelo Render |
| `ENCRYPTION_KEY` | Sim | Gerado pelo Render |
| `FRONTEND_URL` | Sim | URL do Vercel |
| `CORS_ALLOWED_ORIGINS` | Sim | URLs permitidas pelo CORS |
| `MAIL_HOST` | Não | smtp.gmail.com |
| `MAIL_PORT` | Não | 587 |
| `MAIL_USERNAME` | Não | E-mail para envio |
| `MAIL_PASSWORD` | Não | App password Gmail |
| `STRIPE_SECRET_KEY` | Não* | Chave secreta da API Stripe (Fase 3) |
| `STRIPE_WEBHOOK_SECRET` | Não* | Secret de assinatura do webhook |
| `STRIPE_PRICE_ESSENCIAL` | Não* | Price ID do plano Essencial |
| `STRIPE_PRICE_PREMIUM` | Não* | Price ID do plano Premium |

> **Nota:** Não defina `PORT` — o Render injeta `PORT=10000` automaticamente.
>
> *As variáveis `STRIPE_*` são opcionais: sem elas o app sobe normalmente e as rotas de checkout retornam um erro amigável. São necessárias apenas para habilitar pagamentos reais.

### Frontend → Vercel
1. Root Directory: `frontend`
2. `VITE_API_URL=https://familyfunds-api.onrender.com/api/v1`

### Banco → Supabase
As migrações V1–V12 rodam automaticamente via Flyway na inicialização. O `FlywayConfig` executa `repair()` antes de `migrate()`, limpando registros de migrations falhas antes de reaplicar.

### Deploy automático (CI/CD)
- **Push para `main` → deploy automático**: Render (backend) e Vercel (frontend) usam a integração nativa com o GitHub. Não há workflow de deploy próprio.
- **GitHub Actions** roda apenas o `ci.yml` (build + testes de backend e frontend) em pushes e PRs — não dispara deploy.
- **Manter o Render acordado:** o plano free hiberna após ~15 min ocioso. O agendamento `schedule` do GitHub Actions é atrasado demais para isso, então use um **monitor de uptime externo** (UptimeRobot / cron-job.org, free) pingando `https://familyfunds-api.onrender.com/actuator/health` a cada 5 min. O `/actuator/health` retorna HTTP 200 mesmo com status DOWN, então o ping sempre acorda o serviço.

---

## Funcionalidades

### Implementadas
- [x] Autenticação JWT (login / cadastro / recuperação de senha)
- [x] Grupos familiares com convites por e-mail
- [x] RBAC: ADMIN / EDITOR / VIEWER
- [x] Dashboard com KPIs e gráficos
- [x] Contas bancárias (CRUD)
- [x] Lançamentos — receitas, despesas, transferências
- [x] Parcelamento de lançamentos
- [x] Marcar como pago + atualização de saldo
- [x] Categorias com ícones e subcategorias
- [x] Centros de custo e Tags
- [x] Cartões de crédito e faturas
- [x] Importação CSV / OFX / XLSX
- [x] Orçamentos mensais com alertas
- [x] Notificações internas (vencimentos)
- [x] **Planos SaaS (FREE / ESSENCIAL / PREMIUM)** com trial de 14 dias
- [x] **Enforcement de limites** por plano
- [x] **Dashboard de uso** com barras de progresso
- [x] **Painel Admin** do sistema (grupos, stats, MRR)
- [x] **E-mails de convite** e alertas de limite de uso
- [x] **Pagamento via Stripe** — Checkout, portal de faturamento e webhooks (Fase 3)
- [x] **Relatórios avançados em PDF / Excel** — fluxo de caixa e por categoria (Fase 5)
- [x] **Assinaturas de serviços** — recorrentes (Netflix, Spotify…) com geração de lançamentos e resumo
- [x] **Despesas recorrentes** — fixas (aluguel, energia, escola…), incl. recorrência quinzenal (BIWEEKLY)
- [x] **Compras Inteligentes** — compras de supermercado (manual / NFC-e por link ou QR Code via Jsoup), itens, **histórico de preços**, listas de compras (checklist) e geração de **despesa única** com o valor total
- [x] **Insights de compras** — básico para todos; análises avançadas/IA reservadas ao plano PREMIUM
- [x] Swagger UI documentado
- [x] Dark/Light mode

### Roadmap
- [ ] Integração com IA (OpenAI / Claude) — disponível no plano PREMIUM (Fase 4)
- [ ] Aplicativo Mobile (React Native) — Fase 6
- [ ] Open Finance / PIX — Fase 7
- [ ] Notificações WhatsApp — Fase 8
