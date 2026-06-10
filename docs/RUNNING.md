# Como Executar o Projeto

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Java | **21** (Temurin) | Java 25 instalado? Use `mvn21.bat` |
| Maven | 3.9+ | Incluído via wrapper |
| Node.js | 20+ | Para o frontend |
| PostgreSQL | 15+ | Ou use Supabase |

> **Importante sobre Java**: Lombok 1.18.36 não é compatível com Java 25 (`TypeTag.UNKNOWN` removido).
> O projeto inclui `backend/mvn21.bat` e `backend/mvn21.sh` que forçam o uso do JDK 21.

---

## Backend (Spring Boot)

```bash
cd backend

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Compilar (com Java 25 instalado, use mvn21.bat)
./mvn21.sh compile           # Linux/Mac
mvn21.bat compile            # Windows

# Rodar
./mvn21.sh spring-boot:run
```

### Variáveis de Ambiente Obrigatórias

```env
DB_URL=jdbc:postgresql://localhost:5432/familyfinance
DB_USERNAME=postgres
DB_PASSWORD=senha123
JWT_SECRET=sua-chave-jwt-de-64-chars
ENCRYPTION_KEY=sua-chave-criptografia-32-chars
```

---

## Frontend (React + Vite)

```bash
cd frontend

# Instalar dependências
npm install

# Criar arquivo de ambiente
echo "VITE_API_URL=/api/v1" > .env.local

# Rodar em desenvolvimento (usa proxy para localhost:8080)
npm run dev

# Build de produção
npm run build
```

---

## Banco de Dados

O Flyway executa as migrações automaticamente ao iniciar o backend:

| Migration | Tabelas |
|---|---|
| V1 | users, family_groups, family_group_members, invites, audit_logs |
| V2 | categories, subcategories, cost_centers, tags, accounts, credit_cards, invoices |
| V3 | transactions, transaction_tags, cc_purchases, budgets, notifications, ai_settings, bank_imports |

---

## Deploy

| Serviço | Componente |
|---|---|
| Vercel | Frontend |
| Render | Backend (Free tier) |
| Supabase | PostgreSQL |

### Secrets necessários (GitHub Actions)

```
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
RENDER_DEPLOY_HOOK_URL
VITE_API_URL (ex: https://api.familyfinance.render.com/api/v1)
```

---

## API Endpoints

| Módulo | Prefixo |
|---|---|
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` |
| Profile | `GET /api/v1/users/me` |
| Family | `/api/v1/family-groups/**` |
| Accounts | `/{groupId}/accounts/**` |
| Transactions | `/{groupId}/transactions/**` |
| Categories | `/{groupId}/categories/**` |
| Credit Cards | `/{groupId}/credit-cards/**` |
| Budgets | `/{groupId}/budgets/**` |
| Tags | `/{groupId}/tags/**` |
| Notifications | `/{groupId}/notifications/**` |
| AI Settings | `/{groupId}/ai-settings/**` |
| Dashboard | `/{groupId}/dashboard` |

Swagger UI: `http://localhost:8080/swagger-ui.html`
