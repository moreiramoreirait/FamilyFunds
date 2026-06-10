#!/usr/bin/env bash
# ─── Inicia o ambiente de desenvolvimento local ───────────────────────────────
# Uso: ./start.sh
# Requer: Docker, Java 21 (Temurin), Node 20

set -e

JAVA21="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

echo ""
echo "═══════════════════════════════════════════════"
echo "  FinançasFamília — Ambiente Local"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Sobe o PostgreSQL via Docker
echo "▶ Subindo PostgreSQL e pgAdmin..."
docker compose up -d
echo "  → PostgreSQL:  localhost:5432"
echo "  → pgAdmin:     http://localhost:5050"
echo "    Login:       admin@familyfinance.com / admin123"
echo ""

# 2. Aguarda o banco estar pronto
echo "▶ Aguardando banco de dados..."
for i in $(seq 1 20); do
  if docker compose exec -T postgres pg_isready -U postgres -d familyfinance &>/dev/null; then
    echo "  → Banco pronto!"
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

# 3. Inicia o backend em background
echo "▶ Iniciando backend Spring Boot..."
cd "$BACKEND_DIR"
JAVA_HOME="$JAVA21" PATH="$JAVA21/bin:$PATH" \
  mvn spring-boot:run --quiet &
BACKEND_PID=$!
echo "  → PID backend: $BACKEND_PID"
echo "  → API:         http://localhost:8080"
echo "  → Swagger:     http://localhost:8080/swagger-ui.html"
echo ""

# 4. Inicia o frontend em background
echo "▶ Iniciando frontend Vite..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "  → PID frontend: $FRONTEND_PID"
echo "  → App:          http://localhost:5174"
echo ""

echo "═══════════════════════════════════════════════"
echo "  Tudo rodando! Pressione Ctrl+C para parar."
echo "═══════════════════════════════════════════════"
echo ""

# Aguarda sinal de término
trap "echo ''; echo 'Parando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop; exit 0" INT TERM
wait
