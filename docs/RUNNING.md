# Como Executar o Projeto

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Java | **21** (Temurin) | Java 25 instalado? Use `mvn21.bat` |
| Maven | 3.9+ | Incluído via wrapper |
| Node.js | 20+ | Para o frontend |
| PostgreSQL | 15+ | Ou use Supabase |

> **Java 25:** Lombok 1.18.36 não é compatível com Java 25 (`TypeTag.UNKNOWN` removido).
> O projeto inclui `backend/mvn21.bat` e `backend/mvn21.sh` que forçam o uso do JDK 21.

---

## Backend (Spring Boot)

```bash
cd backend

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Compilar (com Java 25 instalado, use mvn21.bat/sh)
./mvn21.sh spring-boot:run    # Linux/Mac
mvn21.bat spring-boot:run     # Windows
```

### Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL=jdbc:postgresql://localhost:5432/familyfinance
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=senha123
JWT_SECRET=sua-chave-jwt-de-64-chars-minimo
ENCRYPTION_KEY=sua-chave-criptografia-32-chars
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Variáveis Opcionais (e-mail)

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seuemail@gmail.com
MAIL_PASSWORD=sua-app-password-gmail
```

> Sem e-mail configurado o sistema funciona normalmente — convites e alertas são apenas logados.

---

## Frontend (React + Vite)

```bash
cd frontend

# Instalar dependências
npm install

# Criar arquivo de ambiente (aponta para o backend local via proxy Vite)
echo "VITE_API_URL=/api/v1" > .env.local

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
```

---

## Banco de Dados

Flyway executa todas as migrações automaticamente ao iniciar o backend:

| Migration | Tabelas criadas |
|---|---|
| V1 | users, family_groups, family_group_members, invites, audit_logs |
| V2 | categories, subcategories, cost_centers, tags, accounts, credit_cards, invoices |
| V3 | transactions, transaction_tags, cc_purchases, budgets, notifications, ai_settings, bank_imports |
| V4 | subscriptions (planos SaaS, trial, status) |
| V5 | coluna `is_system_admin` na tabela users |
| V6 | rename de planos PRO→ESSENCIAL, BUSINESS→PREMIUM |
| V7 | colunas `stripe_*` + tabela payment_events |
| V8 | service_subscriptions + colunas `origin_*` em transactions |
| V9 | recurring_expenses (despesas recorrentes) |
| V10 | coluna `payment_pending` em subscriptions |
| V11 | shopping_purchases, shopping_purchase_items, product_price_history |
| V12 | shopping_lists, shopping_list_items |

### Configurar Admin do Sistema

Após o primeiro deploy, execute no banco para ter acesso ao painel `/admin`:

```sql
UPDATE users SET is_system_admin = true WHERE email = 'admin@seudominio.com';
```

---

## Deploy

| Serviço | Componente |
|---|---|
| Vercel | Frontend (Root Dir: `frontend`) |
| Render | Backend (Docker, free tier) |
| Supabase | PostgreSQL |

### Variáveis Render (Backend)

Obrigatórias: `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`

Opcionais: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` (remetente — obrigatório no Brevo: sender verificado)

> **Não defina `PORT`** — o Render injeta `PORT=10000` automaticamente.

### Variáveis Vercel (Frontend)

```
VITE_API_URL=https://familyfunds-api.onrender.com/api/v1
```

---

## API Endpoints

| Módulo | Prefixo |
|---|---|
| Auth | `POST /api/v1/auth/register`, `/login`, `/forgot-password`, `/reset-password` |
| Profile | `GET /api/v1/users/me` |
| Family Groups | `/api/v1/family-groups/**` |
| Planos | `GET /api/v1/plans` (público) |
| Assinatura | `/{groupId}/subscription/**` |
| Admin sistema | `/api/v1/admin/**` (requer is_system_admin) |
| Accounts | `/{groupId}/accounts/**` |
| Transactions | `/{groupId}/transactions/**` |
| Categories | `/{groupId}/categories/**` |
| Credit Cards | `/{groupId}/credit-cards/**` |
| Budgets | `/{groupId}/budgets/**` |
| Tags | `/{groupId}/tags/**` |
| Notifications | `/{groupId}/notifications/**` |
| AI Settings | `/{groupId}/ai-settings/**` |
| Bank Imports | `/{groupId}/bank-imports/**` |
| Service Subscriptions | `/{groupId}/service-subscriptions/**` |
| Recurring Expenses | `/{groupId}/recurring-expenses/**` |
| Compras Inteligentes | `/{groupId}/shopping/**` (purchases, lists, price-history, receipts) |
| Dashboard | `/{groupId}/dashboard` |

Swagger UI: `http://localhost:8080/swagger-ui.html`

> **Deploy:** push para `main` dispara deploy automático no Render (backend) e Vercel (frontend) via integração nativa do GitHub — não há workflow de deploy. O GitHub Actions roda só o `ci.yml` (build + testes). Para manter o Render free acordado, use um monitor de uptime externo (UptimeRobot/cron-job.org) em `/actuator/health` a cada 5 min.
