# Backend — документация

REST API интернет-магазина (MVP): **Node.js**, **Express**, аутентификация **JWT**, данные каталога, пользователей и заказов в **PostgreSQL** (`pg`). Схема и миграции — `db/migrations/`, запуск БД — `infra/` (Docker).

---

## Порядок работы с AI

Полный пошаговый порядок работ (данные, VPS, Docker, API, безопасность, фронт, ошибки, тесты и отладка с ИИ) описан в документах:

**`ШАГ-1.md`** … **`ШАГ-8.md`** (читать по номерам по порядку).

### Артефакты проверки работоспособности

Скриншоты, логи прогона тестов и другие материалы, подтверждающие работоспособность API, БД, фронта и смежных шагов, лежат в каталоге **`artifacts/`** в корне репозитория.

---

## Архитектура

### Стек

| Компонент | Технология                                              |
| --------- | ------------------------------------------------------- |
| Runtime   | Node.js (ES modules, `type: "module"`)                  |
| HTTP      | Express 4                                               |
| Auth      | JWT (`jsonwebtoken`), пароли `bcryptjs`                 |
| CORS      | `cors` (список origin из `API_CORS_ORIGINS`)            |
| Логи      | `morgan` (access) + модуль `src/server/utils/logger.js` |
| Тесты     | Vitest, supertest                                       |

### Структура каталогов (сервер)

```text
src/server/
  index.js                 # Точка входа: validateEnv, listen
  createServer.js          # Сборка приложения Express, маршруты /api/*
  config/env.js            # dotenv, валидация переменных окружения
  errors/httpErrors.js     # AppError и типизированные HTTP-ошибки + code
  middleware/
    authMiddleware.js      # JWT, requireAuth, requireRole
    errorMiddleware.js     # Централизованный errorHandler
    requestLogMiddleware.js
  db/
    pool.js
    orderStatus.js
  repositories/
    postgres/              # users, products, sports, orders
    inMemory*.js           # только для unit-тестов (supertest)
  validation/
    authValidation.js
    productsValidation.js
  utils/
    asyncHandler.js
    logger.js
```

### Поток запроса

1. **Access-log** (morgan) → **CORS** → **JSON body** (`express.json()`).
2. Маршрут или цепочка **middleware** (`requireAuth`, `requireRole("admin")`).
3. Валидация входных данных; при ошибке — `next(ValidationError)` и т.д.
4. Обработчик отдаёт JSON (`{ data: ... }` или пустое тело для **204**).
5. Неизвестный маршрут → **404** через `NotFoundError`.
6. **errorHandler** приводит ошибки к единому JSON: `{ error, code?, details? }`.

### Данные

- **PostgreSQL** — единственное хранилище при `npm run api:start` (пул `pg`, репозитории в `repositories/postgres/`).
- Миграции `001`–`008` в `db/migrations/` (в т.ч. `006_auth_api_integration.sql`, `007`/`008` — тестовые товары по всем видам спорта).
- **In-memory** репозитории остаются для **Vitest/supertest** без живой БД.
- Запуск БД: `infra/docker-compose.yml` (см. **`ШАГ-2.md`**, **`ШАГ-3.md`**).

### Безопасность (кратко)

- Секреты только в **`.env`** (не коммитить); шаблон — **`.env.example`**.
- **`JWT_SECRET`**: минимум 32 символа (проверка при старте).
- Запись **товаров** (POST/PUT/DELETE) — только роль **`admin`**. Регистрация создаёт пользователя с ролью **`user`**. Для локальных тестов админ задаётся в тестах; в проде нужен механизм выдачи роли admin (отдельно от MVP).

---

## Развёртывание

### Локально

1. Установить зависимости: `npm install`.
2. Скопировать **`.env.example`** → **`.env`** в корне проекта и заполнить (обязательно сильный **`JWT_SECRET`**).
3. Запуск API:

   ```bash
   npm run api:start
   ```

   По умолчанию сервер слушает порт из **`API_PORT`** (часто **3001**).

### Переменные окружения (API)

| Переменная         | Назначение                                          |
| ------------------ | --------------------------------------------------- |
| `API_PORT`         | Порт HTTP                                           |
| `JWT_SECRET`       | Подпись JWT (≥ 32 символов)                         |
| `JWT_EXPIRES_IN`   | Срок жизни токена (например `1d`)                   |
| `API_CORS_ORIGINS` | Список origin через запятую для фронта              |
| `LOG_LEVEL`        | `error` \| `warn` \| `info` \| `debug`              |
| `LOG_HTTP_FORMAT`  | Опционально: формат строки morgan                   |
| `DATABASE_URL`     | Строка подключения PostgreSQL (обязательно для API) |
| `NODE_ENV`         | `production` — скрывает детали 500 в ответе клиенту |

### Docker и VPS

- **PostgreSQL** в контейнере: **`infra/docker-compose.yml`**, переменные — **`infra/.env`** (пример **`infra/.env.postgres.example`**).
- Подробные шаги для VPS и Docker — **`ШАГ-2.md`**, **`ШАГ-3.md`**.

### CI

- **`npm run test`** — unit/integration тесты API (в т.ч. **`src/server/api.integration.test.js`**).
- Workflow: **`.github/workflows/ci-tests.yml`**.

---

## Быстрый старт: приложение, фронт, PostgreSQL и проверка

Ниже — минимальная последовательность команд. Нужны **Node.js** (рекомендуется 20.x) и **Docker** с **Docker Compose**.

### 1. PostgreSQL в Docker

Из **корня репозитория**:

```bash
cd infra
cp .env.postgres.example .env
```

В **PowerShell** из корня проекта: `Copy-Item infra\.env.postgres.example infra\.env`.

Отредактируйте **`infra/.env`**: задайте надёжный **`POSTGRES_PASSWORD`** (и при необходимости **`POSTGRES_PORT`**, если порт 5432 занят).

Поднимите контейнер (образ собирается с миграциями из **`db/migrations/`**; скрипты выполняются **только при первом создании пустого volume**):

```bash
docker compose up -d --build
docker compose ps
```

Проверка готовности БД:

```bash
docker exec stepup-postgres pg_isready -U stepup_app -d stepup
```

### 2. Проверка таблиц в базе

Подключение к **`psql`** (подставьте пользователя/БД из **`infra/.env`**):

```bash
docker exec -it stepup-postgres psql -U stepup_app -d stepup -c "\dt"
```

Ожидаемые таблицы в схеме **`public`** (после всех миграций):

`users`, `sports`, `brands`, `materials`, `technologies`, `products`, `product_images`, `product_technologies`, `sizes`, `product_variants`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `payments`, `shipments`.

Быстрая проверка seed-данных:

```bash
docker exec -it stepup-postgres psql -U stepup_app -d stepup -c "SELECT code, name FROM sports ORDER BY id;"
```

Если контейнер уже запускался раньше со **старым** volume, повторная инициализация **`/docker-entrypoint-initdb.d`** не выполнится. Тогда либо удалите volume и поднимите заново (данные пропадут), либо примените SQL вручную через **`psql -f`** (см. **`ШАГ-1.md`**).

### 3. Backend API (Node)

В **корне репозитория**:

```bash
npm install
cp .env.example .env
```

Заполните **`.env`**: **`DATABASE_URL`**, **`JWT_SECRET`** (не короче 32 символов), **`API_PORT`**, при работе фронта на другом origin — **`API_CORS_ORIGINS`**.

Пример **`DATABASE_URL`** (пароль как в `infra/.env`):

```env
DATABASE_URL=postgresql://stepup_app:your_password@localhost:5432/stepup
```

Перед API поднимите PostgreSQL (`cd infra && docker compose up -d --build`). При **первом** запуске контейнера применяются миграции из `db/migrations/`. Если volume уже был создан без `006`/`007`, выполните их вручную через `psql -f`.

```bash
npm run api:start
```

Проверка API:

```bash
curl -s http://localhost:3001/api/health
```

Ожидаемо: `{"status":"ok","database":"connected"}`. Товары: `curl -s http://localhost:3001/api/products` (seed `007` / `008`: по одному товару на Бег, Зал, Фитнес, Повседневная).

### 4. Frontend (Vite, опционально)

В **отдельном терминале** из корня:

```bash
npm run dev
```

Откройте URL из вывода Vite (часто `http://localhost:5173`). Для прокси **`/api`** на backend в **`vite.config.js`** должен быть указан тот же порт, что и **`API_PORT`** (по умолчанию прокси на `3001`).

### 5. Автотесты API

```bash
npm run test
```

---

## API Endpoints

Базовый URL: `http://localhost:<API_PORT>` (ниже в примерах — **3001**).

Общие правила ответов:

- Успех с телом: **`{ "data": ... }`** (кроме **204 No Content**).
- Ошибка: **`{ "error": "...", "code": "SNAKE_CASE", "details": [...] }`** (поля `code` и `details` — по ситуации).

### Таблица маршрутов

| Метод  | Путь                 | Auth                       | Описание                |
| ------ | -------------------- | -------------------------- | ----------------------- |
| GET    | `/api/health`        | Нет                        | Проверка живости        |
| GET    | `/api/sports`        | Нет                        | Справочник видов спорта |
| GET    | `/api/products`      | Нет                        | Список товаров          |
| GET    | `/api/products/:id`  | Нет                        | Товар по числовому id   |
| POST   | `/api/auth/register` | Нет                        | Регистрация             |
| POST   | `/api/auth/login`    | Нет                        | Вход                    |
| GET    | `/api/auth/me`       | Bearer JWT                 | Текущий пользователь    |
| POST   | `/api/products`      | Bearer JWT, роль **admin** | Создать товар           |
| PUT    | `/api/products/:id`  | Bearer JWT, **admin**      | Обновить товар          |
| DELETE | `/api/products/:id`  | Bearer JWT, **admin**      | Удалить товар           |

Коды ошибок (примеры): `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `INVALID_JSON`, `CORS_FORBIDDEN`, `INTERNAL_ERROR` — см. **`ШАГ-7.md`**.

---

## Примеры запросов (curl)

### Health

```bash
curl -s http://localhost:3001/api/health
```

Ожидаемо: `{"status":"ok"}`

### Список видов спорта

```bash
curl -s http://localhost:3001/api/sports
```

### Список товаров

```bash
curl -s http://localhost:3001/api/products
```

### Товар по id

```bash
curl -s http://localhost:3001/api/products/1
```

### Регистрация

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"buyer@example.com\",\"password\":\"StrongPass123\"}"
```

### Вход

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"buyer@example.com\",\"password\":\"StrongPass123\"}"
```

Сохраните **`token`** из `data.token`.

### Текущий пользователь

```bash
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### Создание товара (только admin)

```bash
curl -s -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Trail Max\",\"price\":12990,\"sport\":\"running\",\"brand\":\"StepUp\"}"
```

### Обновление товара (admin)

```bash
curl -s -X PUT http://localhost:3001/api/products/3 \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"price\":11990,\"isActive\":true}"
```

### Удаление товара (admin)

```bash
curl -w "\nHTTP_CODE:%{http_code}\n" -X DELETE http://localhost:3001/api/products/3 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Ожидаемо: пустое тело и **HTTP 204**.

---

## Связанные документы

| Файл       | Содержание                               |
| ---------- | ---------------------------------------- |
| `ШАГ-1.md` | Модель данных, миграции PostgreSQL       |
| `ШАГ-2.md` | VPS, обоснование PostgreSQL в Docker     |
| `ШАГ-3.md` | Dockerfile, compose, `.env`, проверка БД |
| `ШАГ-4.md` | REST API, CRUD, тесты CI                 |
| `ШАГ-5.md` | Auth, middleware, CORS, секреты          |
| `ШАГ-6.md` | Подключение фронтенда к API              |
| `ШАГ-7.md` | Ошибки и логирование                     |
| `ШАГ-8.md` | Полное тестирование API, отладка с ИИ    |

---

## Версия документа

Актуально для структуры репозитория с сервером в **`src/server/`** и тестами в **`src/server/*.test.js`**. Обзор развёртывания и примеры curl — в корневом **`README.md`**.
