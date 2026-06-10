@echo off
REM ─── Inicia o ambiente de desenvolvimento local (Windows) ─────────────────
REM Uso: start.bat
REM Requer: Docker Desktop, Java 21 (Temurin), Node 20

echo.
echo ===============================================
echo   FinancasFamilia -- Ambiente Local
echo ===============================================
echo.

REM 1. Sobe o PostgreSQL via Docker
echo [1/3] Subindo PostgreSQL e pgAdmin...
docker compose up -d
echo   PostgreSQL:  localhost:5432
echo   pgAdmin:     http://localhost:5050
echo   Login:       admin@familyfinance.com / admin123
echo.

REM 2. Inicia o backend
echo [2/3] Iniciando backend Spring Boot...
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
start "Backend" cmd /k "cd backend && mvn spring-boot:run"
echo   API:     http://localhost:8080
echo   Swagger: http://localhost:8080/swagger-ui.html
echo.

REM 3. Inicia o frontend
echo [3/3] Iniciando frontend Vite...
start "Frontend" cmd /k "cd frontend && npm run dev"
echo   App: http://localhost:5174
echo.

echo ===============================================
echo   Tudo iniciado!
echo   Feche as janelas de terminal para parar.
echo ===============================================
pause
