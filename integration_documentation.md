# Integration Documentation — StepUp Web MVP

Сводный документ по интеграциям, CI/CD, безопасности, мониторингу и логированию проекта **StepUp Web MVP**.

| Параметр           | Значение                                     |
| ------------------ | -------------------------------------------- |
| Репозиторий        | `konst26-08/lesson25`                        |
| Production branch  | `master`                                     |
| Frontend (Netlify) | `https://regal-sunflower-1a7fff.netlify.app` |
| Backend (local)    | `http://localhost:3001`                      |
| Frontend dev       | `http://localhost:5173`                      |

---

## Содержание

1. [CI/CD — настройки и pipeline](#1-cicd--настройки-и-pipeline)
2. [Интеграция сервисов](#2-интеграция-сервисов)
3. [Отчёт по аудиту безопасности](#3-отчёт-по-аудиту-безопасности)
4. [Мониторинг](#4-мониторинг)
5. [Логирование](#5-логирование)
6. [Примеры конфигураций](#6-примеры-конфигураций)
7. [Карта документов по шагам](#7-карта-документов-по-шагам)

---

## 1. CI/CD — настройки и pipeline

### 1.1. Обзор

Автоматизация через **GitHub Actions** (`.github/workflows/ci-cd.yml`). Production-деплой — **Netlify** (статический SPA из `dist/`).

```text
push / PR (main, master)  │  workflow_dispatch
         │
         ├─► quality              ESLint, Prettier, npm audit (prod)
         │
         ├─► test-oauth           OAuth2 (11 tests)
         ├─► test-analytics       Яндекс.Метрика (6 tests)
         ├─► test-payments        Payments MVP (3 tests)
         ├─► test-logging         JSON logs (10 tests)
         ├─► test-api             REST API (40 tests)
         ├─► test-unit            Utils, AI, structure (7 tests)
         │
         ├─► test (full)          npm test — 77 tests
         │
         ├─► build                vite build + verify:build
         │
         └─► deploy (push only)   Netlify + verify:smoke
```

| Событие                    | Деплой на Netlify         |
| -------------------------- | ------------------------- |
| `push` в `main` / `master` | ✅                        |
| `pull_request`             | ❌ (только проверки)      |
| `workflow_dispatch`        | ✅ если ветка main/master |

**Concurrency:** новый push отменяет предыдущий запуск (`cancel-in-progress: true`).

### 1.2. Jobs и команды

| Job              | Команды                                        | Назначение                       |
| ---------------- | ---------------------------------------------- | -------------------------------- |
| `quality`        | `npm ci`, `lint`, `format:check`, `audit:prod` | Качество кода и prod-зависимости |
| `test-oauth`     | `npm run test:oauth`                           | Yandex OAuth routes + service    |
| `test-analytics` | `npm run test:analytics`                       | Metrika, dataLayer, goals        |
| `test-payments`  | `npm run test:payments`                        | Checkout MVP без шлюза           |
| `test-logging`   | `npm run test:logging`                         | Structured JSON logs             |
| `test-api`       | `npm run test:api`                             | REST API + health handlers       |
| `test-unit`      | `npm run test:unit`, `test:structure`          | Utils, AI, структура проекта     |
| `test`           | `npm test`                                     | Полный прогон (77)               |
| `build`          | `npm run build`, `npm run verify:build`        | Сборка + проверка assets         |
| `deploy`         | Netlify action + `verify-smoke-deploy.mjs`     | Production deploy + smoke        |

### 1.3. Секреты GitHub Actions

**Settings → Secrets and variables → Actions:**

| Secret               | Назначение              | Где взять                                                 |
| -------------------- | ----------------------- | --------------------------------------------------------- |
| `NETLIFY_AUTH_TOKEN` | Deploy из Actions       | Netlify → User settings → Applications → New access token |
| `NETLIFY_SITE_ID`    | ID сайта                | Netlify → Site settings → General → Site ID (UUID)        |
| `NETLIFY_SITE_URL`   | Fallback для smoke test | `https://regal-sunflower-1a7fff.netlify.app`              |

### 1.4. Netlify — рекомендуемые настройки

| Настройка         | Значение                                               |
| ----------------- | ------------------------------------------------------ |
| Production branch | `master` (совпадает с CI: `production-branch: master`) |
| Build command     | **Stop builds** — deploy только из GitHub Actions      |
| Publish directory | `dist` (через action, не через Netlify build)          |
| Notifications     | Email при **Deploy failed**                            |

### 1.5. Локальные команды CI

```powershell
npm run lint
npm run format:check
npm run audit:prod
npm test
npm run test:integrations
npm run build
npm run verify:build
npm run verify:smoke -- https://regal-sunflower-1a7fff.netlify.app
```

---

## 2. Интеграция сервисов

### 2.1. Netlify (хостинг фронтенда)

**Назначение:** production SPA (Vite → `dist/`).

**Инструкция:**

1. Создать сайт на [app.netlify.com](https://app.netlify.com).
2. Добавить секреты в GitHub (см. §1.3).
3. Push в `master` → Actions деплоит `dist/`.
4. Проверить: `/`, `/health.json`, `/assets/index-*.js`.

**Ограничение:** API и OAuth callback **не работают** на Netlify без отдельного хостинга backend.

**Конфиг:** `netlify.toml` (см. §6.2).

---

### 2.2. PostgreSQL (база данных)

**Назначение:** хранение users, products, orders, OAuth accounts.

**Инструкция (local):**

```powershell
cd infra
docker compose up -d
cd ..
# Применить миграции (в т.ч. 009_oauth_yandex.sql)
Get-Content .\db\migrations\009_oauth_yandex.sql | docker exec -i stepup-postgres psql -U stepup_app -d stepup
npm run api:start
```

**Переменные:**

```env
DATABASE_URL=postgresql://stepup_app:password@localhost:5432/stepup
```

**Health check:** `GET /api/health` → `checks.database: "connected"`.

---

### 2.3. OAuth2 — Yandex ID

**Назначение:** вход через Yandex без пароля приложения; после OAuth — стандартный JWT.

**Flow:**

```text
Login → GET /api/auth/yandex → oauth.yandex.ru
     → GET /api/auth/yandex/callback?code&state
     → JWT → redirect /login/oauth/callback?token=
     → fetchMe → /account/orders
```

**Настройка Yandex ID:**

1. [oauth.yandex.ru](https://oauth.yandex.ru/) → создать приложение.
2. Redirect URI: `http://localhost:3001/api/auth/yandex/callback` (prod — URL API-хоста).
3. Права: email, имя/логин.

**Переменные (.env):**

```env
YANDEX_OAUTH_CLIENT_ID=your_client_id
YANDEX_OAUTH_CLIENT_SECRET=your_secret
YANDEX_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/yandex/callback
OAUTH_FRONTEND_SUCCESS_URL=http://localhost:5173/login/oauth/callback
API_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

**Миграция:** `db/migrations/009_oauth_yandex.sql` — таблица `user_oauth_accounts`.

**API:**

| Метод | Путь                        | Описание                       |
| ----- | --------------------------- | ------------------------------ |
| GET   | `/api/auth/yandex`          | Redirect на Yandex             |
| GET   | `/api/auth/yandex/callback` | Code → JWT → redirect на фронт |

**Тесты:** `npm run test:oauth` (11 tests).

**Production:** задать `API_CORS_ORIGINS=https://regal-sunflower-1a7fff.netlify.app` и redirect URI на production API.

---

### 2.4. Яндекс.Метрика (аналитика)

**Назначение:** pageviews SPA, JavaScript-цели, e-commerce через `dataLayer`.

**Счётчик:** `109394182`.

**Переменные:**

```env
VITE_YM_COUNTER_ID=109394182
```

На Netlify — добавить в Environment variables **до сборки** (Vite вшивает на build).

**Модуль:** `src/analytics/metrika.js`

**Цели (`METRIKA_GOALS`):**

| Цель        | Идентификатор          | Где               |
| ----------- | ---------------------- | ----------------- |
| Login       | `login_success`        | LoginPage         |
| Register    | `register_success`     | LoginPage         |
| OAuth       | `oauth_yandex_success` | OAuthCallbackPage |
| Add to cart | `add_to_cart`          | ProductPage       |
| Checkout    | `begin_checkout`       | CartPage          |
| Purchase    | `purchase`             | CheckoutPage      |

**Ручная проверка:**

1. `npm run dev` → DevTools → Network → `metrika`.
2. Отключить AdBlock.
3. [metrika.yandex.ru](https://metrika.yandex.ru/) → «В реальном времени».

**Тесты:** `npm run test:analytics` (6 tests).

**CSP:** в `netlify.toml` разрешён `https://mc.yandex.ru` в `script-src` и `img-src`.

---

### 2.5. Платежи (ЮKassa / MVP)

**Статус:** **не интегрированы** (ЮKassa/Robokassa — регистрация заблокирована).

**Текущее поведение MVP:**

- Checkout создаёт заказ через `POST /api/orders`.
- Статус сразу **«Оплачен»** без внешнего payment gateway.
- Таблица `payments` в PostgreSQL есть в схеме, API-маршрутов `/api/payments` нет.

**Тесты:** `npm run test:payments` — фиксируют MVP-поведение.

**Для будущей инtegrации ЮKassa:**

1. Регистрация магазина → `shopId`, secret key.
2. `POST /api/payments/create` → redirect на YooKassa.
3. Webhook `POST /api/payments/webhook` → обновление `orders.status`.
4. Переменные: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`.

---

### 2.6. GitHub Actions + Netlify (CD)

См. §1. Smoke test после deploy проверяет:

- `/health.json` → `"status": "ok"`
- `/` → HTTP 200
- `/assets/index-*.js` и `/assets/index-*.css` из `index.html`

---

## 3. Отчёт по аудиту безопасности

**Дата аудита:** в рамках Шага 2.  
**Методология:** `npm audit`, ESLint, ручной review по OWASP Top 10.

### 3.1. Зависимости

| Проверка               | Результат                                     |
| ---------------------- | --------------------------------------------- |
| `npm audit --omit=dev` | **0 vulnerabilities** (production)            |
| `npm audit` (все)      | 5 moderate — только dev (vite/esbuild/vitest) |
| CI                     | `npm run audit:prod` в job `quality`          |

**Dev-риск esbuild:** касается локального `npm run dev`, не production на Netlify. Принят как допустимый.

### 3.2. OWASP Top 10 — сводка

| Категория                  | Статус | Ключевые меры                                |
| -------------------------- | ------ | -------------------------------------------- |
| A01 Access Control         | ✅     | JWT + `requireRole`, фильтр orders по userId |
| A02 Cryptographic Failures | ✅     | bcrypt, JWT HS256, secret ≥32 chars          |
| A03 Injection              | ✅     | Parameterized SQL, `textContent`, CSP        |
| A04 Insecure Design        | ✅     | Validation modules, generic 500 in prod      |
| A05 Misconfiguration       | ✅     | helmet, CORS whitelist, rate limit           |
| A06 Vulnerable Components  | ✅     | audit:prod = 0                               |
| A07 Auth Failures          | ✅     | Rate limit auth, password policy             |
| A08 Integrity              | ✅     | `npm ci` + lockfile                          |
| A09 Logging                | ✅     | Structured JSON logs (Шаг 7)                 |
| A10 SSRF                   | ✅     | Server fetch по user URL не используется     |

### 3.3. Защита от атак

| Атака         | Меры                                                  |
| ------------- | ----------------------------------------------------- |
| XSS           | `textContent`, CSP на Netlify                         |
| CSRF          | Bearer JWT (не cookie) + CORS whitelist               |
| SQL Injection | `$1, $2…`, валидация типов                            |
| Brute-force   | 20 req/15min auth, 300 req/15min общий                |
| DoS           | JSON limit 100kb, string length limits                |
| Clickjacking  | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |

### 3.4. Добавленные security-пакеты

| Пакет                | Назначение                  |
| -------------------- | --------------------------- |
| `helmet`             | HTTP security headers (API) |
| `express-rate-limit` | Rate limiting               |

### 3.5. Рекомендации (production)

```env
API_CORS_ORIGINS=https://regal-sunflower-1a7fff.netlify.app
JWT_SECRET=<random 32+ chars>
LOG_LEVEL=warn
```

- Не коммитить `.env`.
- Отозвать токены при утечке.
- HTTPS только (Netlify — по умолчанию).

### 3.6. Команды проверки

```powershell
npm run audit:prod
npm run lint
npm test
```

---

## 4. Мониторинг

### 4.1. Архитектура

```text
GitHub Actions (deploy) → verify:smoke (health + JS/CSS)
Netlify → /health.json, Deploy notifications
Backend → /api/health/live | /ready | /health
```

### 4.2. Frontend (Netlify)

| Endpoint           | Назначение                                       |
| ------------------ | ------------------------------------------------ |
| `GET /health.json` | Статический health check (обновляется при build) |
| `GET /`            | SPA, smoke test HTTP 200                         |

**URL:** `https://regal-sunflower-1a7fff.netlify.app/health.json`

**Генерация:** `scripts/write-health-json.mjs` → `npm run build`.

### 4.3. Backend API

| Endpoint                | БД                | HTTP при ошибке БД |
| ----------------------- | ----------------- | ------------------ |
| `GET /api/health/live`  | Нет               | —                  |
| `GET /api/health/ready` | Да                | 503                |
| `GET /api/health`       | Да + OAuth status | 503                |

**Пример ответа `/api/health`:**

```json
{
  "status": "ok",
  "service": "stepup-api",
  "checks": {
    "database": "connected",
    "oauth": "configured"
  }
}
```

### 4.4. Алерты

| Источник                  | Триггер                          | Куда                   |
| ------------------------- | -------------------------------- | ---------------------- |
| Netlify Notifications     | Deploy failed                    | Email                  |
| GitHub Actions            | Smoke test / test fail           | Email + красный статус |
| UptimeRobot (опционально) | Ping `/health.json` каждые 5 мин | Email                  |

### 4.5. CI smoke test

```powershell
npm run verify:smoke -- https://regal-sunflower-1a7fff.netlify.app
```

Проверяет health, homepage, JS и CSS bundles — предотвращает белый экран при битом deploy.

---

## 5. Логирование

### 5.1. Формат

JSON (JSONL) — одна строка = одно событие:

```json
{
  "timestamp": "2026-05-24T10:00:00.000Z",
  "level": "warn",
  "service": "stepup-api",
  "message": "API 401",
  "method": "POST",
  "path": "/api/auth/login"
}
```

### 5.2. Уровни

| Level   | Примеры                      |
| ------- | ---------------------------- |
| `error` | 500, unhandled, DB down      |
| `warn`  | 401, 403, CORS, invalid JSON |
| `info`  | 404, 422, старт API          |
| `http`  | Каждый HTTP-запрос           |

### 5.3. Хранение

| Куда           | Назначение                            |
| -------------- | ------------------------------------- |
| stdout         | docker logs, терминал, GitHub Actions |
| `logs/api.log` | Централизованный файл (`LOG_FILE`)    |

### 5.4. Анализ

```powershell
npm run logs:analyze
npm run logs:analyze -- --level error
npm run logs:analyze -- --search "PostgreSQL"
```

**Тесты:** `npm run test:logging` (10 tests).

---

## 6. Примеры конфигураций

### 6.1. `.github/workflows/ci-cd.yml` (фрагмент)

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run audit:prod

  test-oauth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:oauth

  deploy:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    steps:
      - uses: nwtgck/actions-netlify@v3.0
        with:
          publish-dir: ./dist
          production-branch: master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
      - run: node ./scripts/verify-smoke-deploy.mjs "$SITE_URL"
```

### 6.2. `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/health.json"
  to = "/health.json"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/health.json"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://mc.yandex.ru; style-src 'self'; img-src 'self' data: https://mc.yandex.ru; connect-src 'self' https:; frame-ancestors 'none'"
```

### 6.3. `.env.example` (полный шаблон)

```env
# API
API_PORT=3001
DATABASE_URL=postgresql://stepup_app:change_me@localhost:5432/stepup
JWT_SECRET=replace_with_strong_secret_at_least_32_chars
JWT_EXPIRES_IN=1d
API_CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# Logging
LOG_LEVEL=info
LOG_SERVICE=stepup-api
LOG_FILE=logs/api.log

# Frontend
VITE_API_BASE_URL=
VITE_YM_COUNTER_ID=109394182

# OAuth Yandex
YANDEX_OAUTH_CLIENT_ID=
YANDEX_OAUTH_CLIENT_SECRET=
YANDEX_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/yandex/callback
OAUTH_FRONTEND_SUCCESS_URL=http://localhost:5173/login/oauth/callback

# CI/CD (optional)
# NETLIFY_SITE_URL=https://regal-sunflower-1a7fff.netlify.app
```

### 6.4. `vite.config.js` (API proxy для dev)

```js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
```

### 6.5. Production CORS (пример)

```env
API_CORS_ORIGINS=https://regal-sunflower-1a7fff.netlify.app
OAUTH_FRONTEND_SUCCESS_URL=https://regal-sunflower-1a7fff.netlify.app/login/oauth/callback
YANDEX_OAUTH_REDIRECT_URI=https://api.your-domain.com/api/auth/yandex/callback
VITE_API_BASE_URL=https://api.your-domain.com
```

### 6.6. `package.json` — скрипты тестирования

```json
{
  "scripts": {
    "test": "vitest run",
    "test:oauth": "vitest run src/server/oauth.routes.test.js src/server/auth/oauth.test.js src/pages/OAuthCallbackPage.test.js",
    "test:analytics": "vitest run src/analytics/metrika.test.js",
    "test:payments": "vitest run src/server/payments/payments.integration.test.js",
    "test:logging": "vitest run src/server/utils/logger.test.js src/server/logging/logScenarios.test.js",
    "test:api": "vitest run src/server/api.integration.test.js src/server/createServer.test.js src/server/health/healthHandlers.test.js src/server/validation/ordersValidation.test.js",
    "test:integrations": "npm run test:oauth && npm run test:analytics && npm run test:payments && npm run test:logging && npm run test:api",
    "verify:build": "node ./scripts/verify-build-assets.mjs",
    "verify:smoke": "node ./scripts/verify-smoke-deploy.mjs"
  }
}
```

### 6.7. Docker Compose (PostgreSQL)

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: stepup-postgres:16
    ports:
      - "5432:5432"
    env_file:
      - .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 6.8. Health check — curl

```powershell
# Frontend (Netlify)
curl https://regal-sunflower-1a7fff.netlify.app/health.json

# Backend (local)
curl http://localhost:3001/api/health/live
curl http://localhost:3001/api/health/ready
curl http://localhost:3001/api/health
```

---

## 7. Карта документов по шагам

| Шаг | Файл                                   | Тема                                    |
| --- | -------------------------------------- | --------------------------------------- |
| 1   | `ШАГ 1 Настройка CD пайплайна.md`      | CI/CD, ESLint, Prettier, Netlify        |
| 2   | `Шаг 2. Аудит безопасности.md`         | OWASP, npm audit, helmet, rate limit    |
| 3   | `Шаг 3. Интеграция OAuth2.md`          | Yandex ID OAuth                         |
| 4   | `Шаг 4. Интеграция аналитики.md`       | Яндекс.Метрика                          |
| 5   | —                                      | Платежи (не завершён)                   |
| 6   | `Шаг 6. Настройка мониторинга.md`      | health.json, /api/health, smoke test    |
| 7   | `Шаг 7. Настройка логирования.md`      | JSON logs, analyze-logs                 |
| 8   | `Шаг 8. Тестирование и оптимизация.md` | Integration tests, CI jobs, оптимизация |

---

## Быстрый чеклист «всё работает»

| #   | Проверка   | Команда / URL                    | Ожидание           |
| --- | ---------- | -------------------------------- | ------------------ |
| 1   | CI/CD      | GitHub Actions                   | Все jobs ✅        |
| 2   | Tests      | `npm test`                       | 77 passed          |
| 3   | Build      | `npm run verify:build`           | assets OK          |
| 4   | Frontend   | `/health.json`                   | `"status":"ok"`    |
| 5   | Smoke      | `npm run verify:smoke -- <URL>`  | JS + CSS 200       |
| 6   | OAuth      | `npm run test:oauth`             | 11 passed          |
| 7   | Metrika    | `npm run test:analytics`         | 6 passed           |
| 8   | Security   | `npm run audit:prod`             | 0 vulnerabilities  |
| 9   | API health | `curl localhost:3001/api/health` | database connected |
| 10  | Logs       | `npm run logs:analyze`           | Summary без error  |

---

_Документ актуален для ветки `master`, production Netlify `regal-sunflower-1a7fff.netlify.app`._
