# FinançasFamília — Sistema de Gestão Financeira Familiar

Sistema completo de gestão financeira pessoal e familiar, inspirado em Mobills, Nubank e Inter.

---

## 🏗️ Arquitetura

```
/
├── backend/          # Java Spring Boot 3 API REST
├── frontend/         # React + TypeScript + Vite + Tailwind
└── docs/             # Documentação
```

## 🚀 Stack Tecnológico

### Backend
- **Java 21** + **Spring Boot 3.2**
- **PostgreSQL** via Supabase
- **Flyway** — migrações de banco
- **JWT** — autenticação stateless
- **Swagger/OpenAPI** — documentação da API
- **BCrypt** — hash de senhas
- **MapStruct** + **Lombok** — redução de boilerplate
- Deploy: **Render**

### Frontend
- **React 18** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** + **Shadcn/UI** — design system
- **React Query** — cache e sincronização de dados
- **Zustand** — estado global
- **React Hook Form** + **Zod** — formulários
- **Recharts** — gráficos
- **Axios** — cliente HTTP
- Deploy: **Vercel**

---

## ⚡ Setup Local

### Pré-requisitos
- Java 21+
- Node.js 18+
- PostgreSQL 14+ (ou conta Supabase)
- Maven 3.8+

### Backend

```bash
cd backend

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Criar banco de dados
createdb familyfinance

# Compilar e rodar
./mvnw spring-boot:run
```

A API ficará disponível em: `http://localhost:8080`
Swagger UI: `http://localhost:8080/swagger-ui.html`

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local

# Iniciar em desenvolvimento
npm run dev
```

A aplicação ficará disponível em: `http://localhost:5173`

---

## 🗄️ Banco de Dados

### Migrations (Flyway)
As migrações são executadas automaticamente ao iniciar o backend:

- `V1__create_users_and_families.sql` — Usuários e grupos familiares
- `V2__create_financial_core.sql` — Contas, categorias, cartões
- `V3__create_transactions.sql` — Lançamentos, faturas, orçamentos

### Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `family_groups` | Grupos familiares |
| `family_group_members` | Membros de cada grupo |
| `family_group_invites` | Convites pendentes |
| `accounts` | Contas bancárias |
| `categories` | Categorias de lançamentos |
| `subcategories` | Subcategorias |
| `tags` | Tags para lançamentos |
| `cost_centers` | Centros de custo |
| `transactions` | Lançamentos financeiros |
| `transaction_tags` | Relacionamento transação-tag |
| `credit_cards` | Cartões de crédito |
| `credit_card_invoices` | Faturas dos cartões |
| `credit_card_purchases` | Compras no cartão |
| `budgets` | Orçamentos mensais |
| `bank_imports` | Importações de extrato |
| `bank_import_items` | Itens de importação |
| `notifications` | Notificações internas |
| `ai_settings` | Configurações de IA |
| `audit_logs` | Log de auditoria |

---

## 🔐 Segurança

- **JWT Bearer Token** — todas as rotas protegidas exceto `/api/v1/auth/**`
- **BCrypt** — hash de senhas
- **CORS** configurado por variável de ambiente
- **Rate limiting** — proteção contra abuso
- **Input validation** — Bean Validation no backend + Zod no frontend
- **Isolamento por família** — todos dados filtrados por `family_group_id`
- **RBAC** — Admin / Editor / Viewer com verificação no backend

---

## 📡 API Endpoints

### Auth
```
POST /api/v1/auth/register    — Cadastro
POST /api/v1/auth/login       — Login
```

### Usuário
```
GET  /api/v1/users/me         — Perfil atual
```

### Grupos Familiares
```
GET    /api/v1/family-groups
POST   /api/v1/family-groups
GET    /api/v1/family-groups/{id}
PUT    /api/v1/family-groups/{id}
POST   /api/v1/family-groups/{id}/invite
POST   /api/v1/family-groups/invites/{token}/accept
```

### Dashboard
```
GET /api/v1/family-groups/{groupId}/dashboard
```

### Contas
```
GET    /api/v1/family-groups/{groupId}/accounts
POST   /api/v1/family-groups/{groupId}/accounts
GET    /api/v1/family-groups/{groupId}/accounts/{id}
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

### Categorias
```
GET    /api/v1/family-groups/{groupId}/categories
POST   /api/v1/family-groups/{groupId}/categories
PUT    /api/v1/family-groups/{groupId}/categories/{id}
DELETE /api/v1/family-groups/{groupId}/categories/{id}
```

### Centros de Custo
```
GET    /api/v1/family-groups/{groupId}/cost-centers
POST   /api/v1/family-groups/{groupId}/cost-centers
PUT    /api/v1/family-groups/{groupId}/cost-centers/{id}
DELETE /api/v1/family-groups/{groupId}/cost-centers/{id}
```

---

## 🚢 Deploy

### Frontend → Vercel
1. Conectar repositório no Vercel
2. Configurar: `VITE_API_URL=https://sua-api.onrender.com/api/v1`
3. Build command: `npm run build`
4. Output dir: `dist`

### Backend → Render
1. Novo Web Service no Render
2. Build command: `mvn clean package -DskipTests`
3. Start command: `java -jar target/family-finance-api-1.0.0.jar`
4. Configurar variáveis de ambiente (`.env.example`)

### Banco → Supabase
1. Criar projeto no Supabase
2. Copiar connection string para `DATABASE_URL`
3. As migrações Flyway rodam automaticamente na primeira inicialização

---

## 🎯 MVP — Funcionalidades Implementadas

- [x] Autenticação JWT (login / cadastro)
- [x] Grupos familiares (criar, editar, convidar membros)
- [x] Permissões por papel (ADMIN / EDITOR / VIEWER)
- [x] Dashboard com KPIs e gráficos
- [x] Contas bancárias (CRUD)
- [x] Lançamentos — Receitas e Despesas (CRUD + paginação)
- [x] Parcelamento de lançamentos
- [x] Marcar como pago
- [x] Categorias com subcategorias (CRUD + categorias padrão)
- [x] Centros de custo (CRUD)
- [x] Tags
- [x] Interface Responsiva (Dark/Light mode)
- [x] Swagger UI documentado

## 🔮 Próximas Evoluções

- [ ] Cartões de crédito + Faturas
- [ ] Importação CSV/OFX/XLSX
- [ ] Integração com IA (OpenAI, Claude, Gemini)
- [ ] Orçamento mensal com alertas
- [ ] Relatórios detalhados (PDF, Excel)
- [ ] Notificações por e-mail / WhatsApp
- [ ] Aplicativo Mobile (React Native)
- [ ] Open Finance / PIX
