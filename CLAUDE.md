# FamilyFunds — Guia para Claude Code

## Estrutura do Projeto

```
backend/   Spring Boot 3 / Java 21
frontend/  React 18 + TypeScript + Vite
docs/      README.md, RUNNING.md
```

## Backend — Padrões

**Tenant isolation:** todo acesso a dados filtra por `family_group_id`. Nunca omitir esse filtro.

**Service pattern:**
- Controller recebe `@AuthenticationPrincipal User currentUser`
- Controller chama `familyGroupService.assertMember(groupId, currentUser.getId())` antes de qualquer operação
- Service faz a lógica de negócio
- Repository é Spring Data JPA — usar derived queries ou `@Query`

**Relacionamentos ManyToOne:** usar referências por ID sem carregar a entidade:
```java
FamilyGroup group = new FamilyGroup();
group.setId(familyGroupId);
```
Campos primitivos (`int`, `boolean`) nunca recebem `null` — usar null check antes de auto-unboxing de Integer/Boolean.

**Exceções:**
- `BusinessException` → 422 (violação de regra de negócio)
- `ResourceNotFoundException` → 404
- `UnauthorizedException` → 401
- Não lançar Exception genérica — o GlobalExceptionHandler a mapeia para 500

**Planos SaaS:** antes de criar conta, cartão, membro ou lançamento, chamar o método correspondente em `SubscriptionService`. Não pular esse passo.

**E-mail:** usar `EmailService` (async, não bloqueia). Já tem try-catch interno — nunca deixar falha de e-mail afetar o fluxo principal.

**Flyway:** migrations em `src/main/resources/db/migration/V{n}__descricao.sql`. Sempre incrementar o número. Nunca alterar migration já aplicada.

## Frontend — Padrões

**Auth state:** `useAuthStore()` expõe `user`, `token`, `currentGroupId`. Usar `currentGroupId` em todas as queries de grupo.

**API calls:** sempre via `src/api/*.ts` usando `apiClient` (Axios com baseURL do env). Nunca fazer fetch/axios diretamente no componente.

**React Query:** key pattern é `['recurso', groupId]`. Invalidar `queryClient.invalidateQueries` após mutações.

**Forms:** React Hook Form + Zod. Schema em `z.object({})`, resolver via `zodResolver`. Campos opcionais com `.optional()` — não deixar campo `z.string()` receber undefined.

**Rotas:** `App.tsx` — rotas públicas sem `<ProtectedRoute>`, privadas dentro do wrapper. Páginas em `src/pages/{modulo}/`.

**Componentes UI:** usar shadcn/ui de `@/components/ui/`. Não criar botões/inputs do zero.

## Deploy

- **Backend:** Render (Docker) — push para `main` → deploy automático
- **Frontend:** Vercel — push para `main` → deploy automático
- **DB:** Supabase PostgreSQL — Flyway roda na inicialização do backend
- **Render port:** sempre `PORT=10000` (não sobrescrever via env var)
- **Health check:** `/actuator/health` — mapeado para HTTP 200 mesmo com status DOWN
- **CI/CD:** deploy é nativo do Render/Vercel (integração GitHub) — **não há workflow de deploy**. O GitHub Actions roda só `ci.yml` (build + testes). Não recriar `deploy.yml`/`keep-alive.yml` (removidos: secrets nunca configurados e `schedule` atrasado demais).
- **Keep-warm:** Render free hiberna após ~15 min — usar monitor de uptime externo (UptimeRobot/cron-job.org) em `/actuator/health` a cada 5 min, não GitHub Actions.

## Workflow de Desenvolvimento

1. Implementar e testar localmente
2. Commitar com mensagem descritiva + `Co-Authored-By: Claude Sonnet 4.6`
3. **Pedir permissão ao usuário antes de fazer push**
4. Push após aprovação

## Variáveis de Ambiente

Backend (Render): `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`

Frontend (Vercel): `VITE_API_URL=https://familyfunds-api.onrender.com/api/v1`
