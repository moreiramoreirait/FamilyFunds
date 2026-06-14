# Configuração do Stripe — FamilyFunds

Guia passo a passo para ativar os pagamentos (planos Essencial e Premium).
Comece **sempre no modo de teste** — é 100% gratuito e não cobra ninguém.

No fim você terá 4 valores para configurar no Render:

| Variável | Formato | De onde vem |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook endpoint |
| `STRIPE_PRICE_ESSENCIAL` | `price_...` | Produto Essencial |
| `STRIPE_PRICE_PREMIUM` | `price_...` | Produto Premium |

> O backend já está pronto: checkout em **modo assinatura (recorrente)**, moeda **BRL**, webhook idempotente. Sem essas variáveis o app sobe normal, só as rotas de pagamento retornam um aviso amigável.

---

## 1. Criar a conta (grátis)

1. Acesse https://dashboard.stripe.com/register e crie a conta (e-mail + senha).
2. Não precisa preencher dados bancários/empresa para usar o **modo de teste**.
3. No topo do dashboard, deixe o botão **"Modo de teste" (Test mode)** LIGADO. Tudo abaixo é feito em test mode.

---

## 2. STRIPE_SECRET_KEY

1. Menu **Desenvolvedores → Chaves de API** (Developers → API keys).
   - Link direto: https://dashboard.stripe.com/test/apikeys
2. Em **Chave secreta (Secret key)**, clique em **Revelar** e copie o valor `sk_test_...`.
3. Guarde → será o `STRIPE_SECRET_KEY`.

⚠️ A chave secreta é sigilosa — nunca a coloque no frontend nem no Git.

---

## 3. Produtos e Price IDs (Essencial e Premium)

Crie **2 produtos**, cada um com um **preço recorrente mensal em BRL**.

1. Menu **Catálogo de produtos → Adicionar produto** (Product catalog → Add product).
   - Link direto: https://dashboard.stripe.com/test/products
2. **Produto 1 — Essencial:**
   - Nome: `Plano Essencial`
   - Modelo de preço: **Recorrente (Recurring)**
   - Valor: **14,90** · Moeda: **BRL** · Período: **Mensal (Monthly)**
   - Salvar.
3. **Produto 2 — Premium:**
   - Nome: `Plano Premium`
   - Recorrente · **29,90** · **BRL** · **Mensal** · Salvar.
4. Em cada produto, na seção **Preços (Pricing)**, copie o **ID do preço** (`price_...` — clique nos `...` → "Copiar ID do preço").
   - O do Essencial → `STRIPE_PRICE_ESSENCIAL`
   - O do Premium → `STRIPE_PRICE_PREMIUM`

> Use o **Price ID** (`price_...`), não o Product ID (`prod_...`).

---

## 4. STRIPE_WEBHOOK_SECRET

O Stripe avisa o backend quando um pagamento é concluído/cancelado/falha.

1. Menu **Desenvolvedores → Webhooks → Adicionar endpoint** (Add endpoint).
   - Link direto: https://dashboard.stripe.com/test/webhooks
2. **URL do endpoint:**
   ```
   https://familyfunds-api.onrender.com/api/v1/webhooks/stripe
   ```
3. Em **Selecionar eventos**, marque exatamente estes 4 (são os que o backend trata):
   - `checkout.session.completed`
   - `customer.subscription.updated`  ← liga/desliga o aviso de "Pagamento pendente" (past_due/unpaid)
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Criar endpoint.
5. Na página do endpoint, em **Signing secret (Segredo de assinatura)**, clique em **Revelar** e copie o `whsec_...`.
   - Guarde → será o `STRIPE_WEBHOOK_SECRET`.

---

## 5. Configurar no Render

1. Render → seu serviço **familyfunds-api** → aba **Environment**.
2. Adicione as 4 variáveis:
   ```
   STRIPE_SECRET_KEY       = sk_test_...
   STRIPE_WEBHOOK_SECRET   = whsec_...
   STRIPE_PRICE_ESSENCIAL  = price_...   (Essencial)
   STRIPE_PRICE_PREMIUM    = price_...   (Premium)
   ```
3. **Save changes** → o Render reinicia o backend automaticamente.
4. Confirme no log de inicialização a mensagem `Stripe initialized`.

---

## 6. Testar (modo de teste, sem dinheiro real)

1. No app, vá em **Planos** e clique em **Fazer Upgrade** no Essencial ou Premium → você será redirecionado ao Checkout do Stripe.
2. Use um **cartão de teste**:
   - Número: `4242 4242 4242 4242`
   - Validade: qualquer data futura (ex: `12/34`) · CVC: qualquer 3 dígitos (ex: `123`) · CEP: qualquer
3. Conclua o pagamento → volta para `/plans?success=true`.
4. Verifique:
   - O plano do grupo virou Essencial/Premium (o webhook `checkout.session.completed` ativa).
   - Em **Planos**, o link **"Gerenciar faturamento"** abre o portal do Stripe.
   - No dashboard do Stripe (test), em Webhooks, o evento aparece com resposta **200**.

Outros cartões de teste úteis: `4000 0000 0000 9995` (saldo insuficiente), `4000 0000 0000 0341` (falha na cobrança recorrente).

---

## 7. Ir para produção (quando estiver pronto)

No modo **Live** (test mode desligado), você precisa **refazer**:
- Ativar a conta (dados da empresa/bancários para receber de verdade).
- Pegar a **Secret key live** (`sk_live_...`).
- Recriar os **2 produtos/preços** no modo live (os Price IDs são diferentes).
- Criar o **webhook** no modo live (novo `whsec_...`), mesma URL e mesmos 3 eventos.
- Atualizar as 4 variáveis no Render com os valores **live**.

> Test mode e Live mode são totalmente separados no Stripe — chaves, produtos e webhooks não se misturam.

---

## (Opcional) Testar webhooks localmente com o Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
# o CLI imprime um whsec_... temporário → use como STRIPE_WEBHOOK_SECRET local
stripe trigger checkout.session.completed
```
