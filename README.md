# StepUp Web MVP

Интернет-магазин обуви (MVP): **SPA на JavaScript (Vite)** + **REST API (Express)** + **PostgreSQL**. Фронтенд загружает каталог, авторизацию и заказы с backend; данные хранятся в БД и переживают перезапуск API.

Подробнее по backend: [`backend_documentation.md`](backend_documentation.md). Пошаговые материалы курса: `ШАГ-1.md` … `ШАГ-8.md`.

---

## Архитектура решения

```text
┌─────────────────┐     /api/* (proxy в dev)      ┌──────────────────┐
│  Browser (SPA)  │ ────────────────────────────► │  Express API     │
│  Vite :5173     │         JSON + JWT            │  Node :3001      │
└────────┬────────┘                               └────────┬─────────┘
         │                                                   │
         │  store (корзина, сессия JWT в памяти вкладки)     │  pg (pool)
         │                                                   ▼
         │                                         ┌──────────────────┐
         │                                         │  PostgreSQL 16   │
         │                                         │  Docker :5432    │
         └─────────────────────────────────────────┴──────────────────┘
```

| Слой               | Технологии                                                        | Назначение                                                       |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Frontend**       | Vite, vanilla JS, History API                                     | Страницы каталога, корзины, checkout, заказов, входа             |
| **HTTP-клиент**    | `fetch` (`src/api/http.js`)                                       | Единые запросы к `/api/*`, обработка ошибок                      |
| **Backend**        | Express 4, JWT, bcrypt                                            | REST API, валидация, авторизация                                 |
| **Данные**         | PostgreSQL, `pg`, репозитории `src/server/repositories/postgres/` | Пользователи, товары, виды спорта, заказы                        |
| **Схема БД**       | SQL-миграции `db/migrations/`                                     | DDL и seed (в т.ч. тестовые товары по 4 видам спорта)            |
| **Инфраструктура** | Docker Compose `infra/`                                           | Контейнер Postgres с авто-применением миграций при первом старте |

**Поток покупки (end-to-end):** каталог (`GET /api/products`) → карточка → корзина (локальный `store`) → вход (`POST /api/auth/register|login`) → checkout → создание заказа (`POST /api/orders`) → успех → список заказов (`GET /api/orders`).

**Важно:** при `npm run api:start` используется **только PostgreSQL** (обязателен `DATABASE_URL`). In-memory репозитории — для автотестов Vitest без живой БД.

### Маршруты фронтенда

`/`, `/catalog`, `/product/:id`, `/cart`, `/checkout`, `/order-success`, `/login`, `/account/orders`, `/account/orders/:orderNumber`, `/ai-debug`

### Структура репозитория

```text
db/migrations/           # PostgreSQL: схема и seed
infra/                   # Docker Compose, образ Postgres
src/
  api/                   # http.js, hooks (products, sports, auth, orders)
  server/                # Express: index.js, createServer.js, postgres repos
  pages/                 # UI-страницы SPA
  components/            # UI-компоненты
  router/                # Клиентский роутер
  state/                 # store (корзина, user, lastOrder)
```

---

## Развёртывание

### Требования

- Node.js 20+
- Docker Desktop (для PostgreSQL)
- npm

### 1. PostgreSQL (Docker)

```bash
cd infra
cp .env.postgres.example .env
# Задайте POSTGRES_PASSWORD в infra/.env

docker compose up -d --build
docker exec stepup-postgres pg_isready -U stepup_app -d stepup
```

Если контейнер уже создавался **до** миграций `006`–`008`, примените их вручную из **корня** проекта:

```powershell
Get-Content .\db\migrations\006_auth_api_integration.sql | docker exec -i stepup-postgres psql -U stepup_app -d stepup
Get-Content .\db\migrations\007_seed_catalog_products.sql | docker exec -i stepup-postgres psql -U stepup_app -d stepup
Get-Content .\db\migrations\008_seed_test_products_all_sports.sql | docker exec -i stepup-postgres psql -U stepup_app -d stepup
```

### 2. Backend API

```bash
cd ..   # корень репозитория
npm install
cp .env.example .env
```

Заполните `.env`:

| Переменная         | Пример                                                     |
| ------------------ | ---------------------------------------------------------- |
| `DATABASE_URL`     | `postgresql://stepup_app:ВАШ_ПАРОЛЬ@localhost:5432/stepup` |
| `JWT_SECRET`       | не короче 32 символов                                      |
| `API_PORT`         | `3001`                                                     |
| `API_CORS_ORIGINS` | `http://localhost:5173`                                    |

```bash
npm run api:start
```

Ожидаемо в консоли: `REST API started on http://localhost:3001 (PostgreSQL)`.

### 3. Frontend

В **отдельном** терминале:

```bash
npm run dev
```

Откройте `http://localhost:5173`. Vite проксирует `/api` на порт `3001` (см. `vite.config.js`).

### 4. Тесты

```bash
npm run test
```

### 5. Проверка связки «БД + приложение»

1. `curl http://localhost:3001/api/health` → `{"status":"ok","database":"connected"}`
2. `curl http://localhost:3001/api/products` → товары из таблицы `products`
3. Регистрация на `/login` → строка в `users` (psql)
4. Оформить заказ → перезапустить API → заказ остаётся в `/account/orders` и в таблице `orders`

---

## API Endpoints

Базовый URL: `http://localhost:3001` (в dev фронт ходит на `/api/...` через proxy).

**Формат успеха:** `{ "data": ... }` (кроме `204 No Content`).

**Формат ошибки:** `{ "error": "...", "code": "...", "details": [...]? }`

**Авторизация:** заголовок `Authorization: Bearer <JWT>` для защищённых маршрутов.

### Служебные

| Метод | Путь          | Auth | Описание                      |
| ----- | ------------- | ---- | ----------------------------- |
| `GET` | `/api/health` | —    | Статус API и подключения к БД |

### Справочники и каталог

| Метод    | Путь                | Auth  | Описание                                               |
| -------- | ------------------- | ----- | ------------------------------------------------------ |
| `GET`    | `/api/sports`       | —     | Виды спорта для фильтров (`id` = code, `label` = name) |
| `GET`    | `/api/products`     | —     | Список активных товаров                                |
| `GET`    | `/api/products/:id` | —     | Товар по числовому id                                  |
| `POST`   | `/api/products`     | admin | Создать товар                                          |
| `PUT`    | `/api/products/:id` | admin | Обновить товар                                         |
| `DELETE` | `/api/products/:id` | admin | Удалить товар                                          |

### Аутентификация

| Метод  | Путь                 | Auth | Описание                    |
| ------ | -------------------- | ---- | --------------------------- |
| `POST` | `/api/auth/register` | —    | Регистрация, возвращает JWT |
| `POST` | `/api/auth/login`    | —    | Вход, возвращает JWT        |
| `GET`  | `/api/auth/me`       | user | Текущий пользователь        |

### Заказы

| Метод  | Путь                       | Auth | Описание                             |
| ------ | -------------------------- | ---- | ------------------------------------ |
| `GET`  | `/api/orders`              | user | Список заказов пользователя          |
| `POST` | `/api/orders`              | user | Создать заказ (checkout)             |
| `GET`  | `/api/orders/:orderNumber` | user | Детали заказа (например `SU-123456`) |

---

## Примеры запросов

### Health

```bash
curl -s http://localhost:3001/api/health
```

```json
{ "status": "ok", "database": "connected" }
```

### Список товаров

```bash
curl -s http://localhost:3001/api/products
```

```json
{
  "data": [
    {
      "id": 1,
      "name": "Racer Pro",
      "price": 10990,
      "sport": "running",
      "brand": "StepUp",
      "isActive": true
    }
  ]
}
```

### Виды спорта

```bash
curl -s http://localhost:3001/api/sports
```

### Регистрация

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"buyer@example.com\",\"password\":\"password123\"}"
```

```json
{
  "data": {
    "user": { "id": "uuid-...", "email": "buyer@example.com", "role": "user" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Вход

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"buyer@example.com\",\"password\":\"password123\"}"
```

### Текущий пользователь

```bash
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Создание заказа

```bash
curl -s -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": 1,
        \"productName\": \"Racer Pro (42)\",
        \"quantity\": 1,
        \"unitPrice\": 10990
      }
    ],
    \"contacts\": {
      \"name\": \"Иван\",
      \"phone\": \"+79990000000\",
      \"email\": \"buyer@example.com\"
    },
    \"address\": {
      \"city\": \"Москва\",
      \"street\": \"Ленина\",
      \"house\": \"10\",
      \"apartment\": \"25\",
      \"zip\": \"101000\"
    }
  }"
```

### Список заказов

```bash
curl -s http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Детали заказа

```bash
curl -s http://localhost:3001/api/orders/SU-123456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Ошибка без токена (401)

```bash
curl -s http://localhost:3001/api/orders
```

```json
{ "error": "Authentication required.", "code": "UNAUTHORIZED" }
```

---

## Скрипты npm

| Команда             | Описание                 |
| ------------------- | ------------------------ |
| `npm run dev`       | Frontend (Vite)          |
| `npm run api:start` | Backend API + PostgreSQL |
| `npm run build`     | Сборка фронтенда         |
| `npm run test`      | Тесты (Vitest)           |

---

## Адаптивность (фронтенд)

Проверьте в DevTools на ширинах `360px`, `768px`, `1024px`, `1440px`: `/`, `/catalog`, `/product/1`, `/cart`, `/checkout`, `/login`, `/account/orders`.

---

## Дополнительно

- AI-экран `/ai-debug` — локальные утилиты отладки (не часть REST API магазина).
- Артефакты проверки: каталог `artifacts/`.
