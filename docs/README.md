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

### Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (campo `is_system_admin` para acesso ao painel admin) |
| `family_groups` | Grupos familiares (tenant) |
| `family_group_members` | Membros com papel ADMIN/EDITOR/VIEWER |
| `family_group_invites` | Convites por e-mail com token |
| `subscriptions` | Plano e status de cada grupo (FREE/PRO/BUSINESS + TRIAL) |
| `accounts` | Contas bancárias |
| `categories` / `subcategories` | Categorias de lançamentos |
| `transactions` | Lançamentos financeiros |
| `credit_cards` / `credit_card_invoices` | Cartões e faturas |
| `budgets` | Orçamentos mensais |
| `bank_imports` | Importações CSV/OFX/XLSX |
| `notifications` | Notificações internas |
| `ai_settings` | Configurações de IA por grupo |

---

## SaaS Multi-Tenant

### Planos

| Feature | FREE | PRO | BUSINESS |
|---------|------|-----|----------|
| Usuários | 2 | 10 | Ilimitado |
| Contas bancárias | 3 | 15 | Ilimitado |
| Cartões de crédito | 1 | 5 | Ilimitado |
| Lançamentos/mês | 50 | 1.000 | Ilimitado |
| Importações/mês | 0 | 10 | Ilimitado |
| Integração IA | Não | Sim | Sim |
| Relatórios avançados | Não | Sim | Sim |
| Preço | Grátis | R$ 29,90/mês | R$ 79,90/mês |

**Trial:** todo novo grupo ganha automaticamente 14 dias do plano PRO.

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

- **JWT Bearer Token** — todas as rotas exceto `/api/v1/auth/**` e `/api/v1/plans`
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
POST /api/v1/family-groups/{id}/subscription/upgrade?plan=   — upgrade (ADMIN)
POST /api/v1/family-groups/{id}/subscription/cancel          — cancelar (ADMIN)
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

> **Nota:** Não defina `PORT` — o Render injeta `PORT=10000` automaticamente.

### Frontend → Vercel
1. Root Directory: `frontend`
2. `VITE_API_URL=https://familyfunds-api.onrender.com/api/v1`

### Banco → Supabase
As migrações V1–V5 rodam automaticamente via Flyway na primeira inicialização.

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
- [x] **Planos SaaS (FREE / PRO / BUSINESS)** com trial de 14 dias
- [x] **Enforcement de limites** por plano
- [x] **Dashboard de uso** com barras de progresso
- [x] **Painel Admin** do sistema (grupos, stats, MRR)
- [x] **E-mails de convite** e alertas de limite de uso
- [x] Swagger UI documentado
- [x] Dark/Light mode

### Roadmap
- [ ] Pagamento via Stripe (Fase 3)
- [ ] Integração com IA (OpenAI / Claude) — disponível no plano PRO+
- [ ] Relatórios em PDF / Excel
- [ ] Aplicativo Mobile (React Native)
- [ ] Open Finance / PIX
- [ ] Notificações WhatsApp
