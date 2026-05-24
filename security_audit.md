# Security Audit Report — StepUp Web MVP

**Проект:** StepUp Web MVP  
**Стек:** Vite SPA + Express API + PostgreSQL  
**Дата аудита:** Шаг 2 (урок 25), актуализация — 2026-05-24  
**Методология:** `npm audit`, ESLint, ручной code review, чеклист OWASP Top 10

---

## Резюме

| Критерий                                        | Статус                                |
| ----------------------------------------------- | ------------------------------------- |
| Production-зависимости (`npm audit --omit=dev`) | **0 уязвимостей**                     |
| Dev-зависимости (`npm audit`)                   | **5 moderate** (vite/esbuild/vitest)  |
| OWASP Top 10 (код)                              | Критичные пробелы закрыты             |
| CI                                              | `npm run audit:prod` в каждом push/PR |

Production-сборка (Netlify) и runtime API **не содержат** известных уязвимых prod-зависимостей. Остаточный риск — только dev-toolchain при локальной разработке.

---

## 1. Список найденных уязвимостей

### 1.1. Зависимости npm — до исправлений

Обнаружено **8 moderate** при первичном `npm audit`:

| #   | Пакет       | Severity | Описание                                                       | GHSA / Advisory     | Затронуто            |
| --- | ----------- | -------- | -------------------------------------------------------------- | ------------------- | -------------------- |
| 1   | **qs**      | moderate | DoS при `stringify` с большими массивами                       | GHSA-q8mj-m7cp-5q26 | express (transitive) |
| 2   | **express** | moderate | Зависит от уязвимой версии qs                                  | —                   | runtime API          |
| 3   | **ws**      | moderate | Утечка неинициализированной памяти                             | GHSA-58qx-3vcg-4xpx | dev/test transitive  |
| 4   | **esbuild** | moderate | Dev-сервер: любой сайт может отправлять запросы и читать ответ | GHSA-67mh-4wv8-2f99 | vite (только dev)    |

Пункты 1–3 затрагивали **production** или **runtime**. Пункт 4 — только **локальный dev-сервер** Vite.

---

### 1.2. Зависимости npm — после исправлений (текущее состояние)

| Область    | Команда              | Результат                                          |
| ---------- | -------------------- | -------------------------------------------------- |
| Production | `npm run audit:prod` | **0 vulnerabilities**                              |
| Все        | `npm audit`          | **5 moderate** — цепочка `esbuild → vite → vitest` |

**Оставшиеся dev-only уязвимости:**

| #   | Пакет                                   | Severity | Описание                                         | Риск для production           |
| --- | --------------------------------------- | -------- | ------------------------------------------------ | ----------------------------- |
| 1   | esbuild ≤0.24.2                         | moderate | GHSA-67mh-4wv8-2f99 — утечка ответов dev-сервера | **Нет** — не входит в `dist/` |
| 2–5 | vite, vitest, @vitest/mocker, vite-node | moderate | Transitive через esbuild                         | **Нет** — только dev/test     |

**Принятое решение:** не выполнять `npm audit fix --force` (major vite 8.x) до стабильного обновления; риск ограничен машиной разработчика при `npm run dev`.

---

### 1.3. Уязвимости и риски в коде (до аудита)

| #   | Категория OWASP      | Проблема                                 | Severity | Статус                   |
| --- | -------------------- | ---------------------------------------- | -------- | ------------------------ |
| 1   | A01 Access Control   | JWT без явного алгоритма (alg confusion) | High     | ✅ Исправлено            |
| 2   | A05 Misconfiguration | Нет security headers на API              | Medium   | ✅ Исправлено            |
| 3   | A05 Misconfiguration | CORS `origin: true` без whitelist в prod | Medium   | ✅ Исправлено            |
| 4   | A05 Misconfiguration | Нет rate limiting                        | Medium   | ✅ Исправлено            |
| 5   | A05 Misconfiguration | Нет CSP на Netlify                       | Medium   | ✅ Исправлено            |
| 6   | A03 Injection        | orderNumber без whitelist формата        | Low      | ✅ Исправлено            |
| 7   | A04 Insecure Design  | Нет лимита размера JSON body             | Low      | ✅ Исправлено            |
| 8   | A04 Insecure Design  | Нет лимитов длины строк                  | Low      | ✅ Исправлено            |
| 9   | A07 Auth             | Brute-force login/register               | Medium   | ✅ Смягчено (rate limit) |
| 10  | A09 Logging          | Неструктурированные логи                 | Low      | ✅ Улучшено (Шаг 7)      |

**Не обнаружено:**

- SQL injection (параметризованные запросы везде)
- XSS через `innerHTML` на фронте
- SSRF (server-side fetch по user URL)
- Хранение JWT в HttpOnly cookie (используется Bearer в памяти — иной threat model)

---

### 1.4. Архитектурные ограничения (не уязвимости, но риски)

| #   | Риск                     | Описание                                                                      |
| --- | ------------------------ | ----------------------------------------------------------------------------- |
| 1   | API не на production     | Netlify — только статика; OAuth/API недоступны без отдельного хоста           |
| 2   | Платежи MVP              | Заказ сразу «Оплачен» без payment gateway — не финансовая безопасность        |
| 3   | JWT в localStorage/store | Уязвимость к XSS выше, чем HttpOnly cookie (компенсируется CSP + textContent) |
| 4   | OAuth state in-memory    | При рестарте API state сбрасывается; для multi-instance нужен Redis           |

---

## 2. Описание исправлений

### 2.1. Зависимости

```bash
npm audit fix
```

| Действие                             | Результат                             |
| ------------------------------------ | ------------------------------------- |
| Обновлены express, qs, ws            | Production audit → 0 vulnerabilities  |
| Добавлены helmet, express-rate-limit | Security headers + rate limiting      |
| CI: `npm run audit:prod`             | Блокировка merge при prod-уязвимостях |

---

### 2.2. API — middleware и конфигурация

**Файл:** `src/server/middleware/securityMiddleware.js` (новый)

| Мера                   | Параметры                                            |
| ---------------------- | ---------------------------------------------------- |
| **helmet**             | CSP отключён для API JSON; CORP cross-origin для SPA |
| **Rate limit (общий)** | 300 запросов / 15 мин / IP                           |
| **Rate limit (auth)**  | 20 запросов / 15 мин на login/register/OAuth         |
| **Отключение в test**  | `NODE_ENV=test` — без rate limit в тестах            |

**Файл:** `src/server/createServer.js`

| Мера                    | Реализация                                 |
| ----------------------- | ------------------------------------------ |
| JSON body limit         | `express.json({ limit: '100kb' })`         |
| Security middleware     | Подключён первым после CORS                |
| Order number validation | `isValidOrderNumber()` перед запросом к БД |

**Файл:** `src/server/config/env.js`

| Мера            | Реализация                                              |
| --------------- | ------------------------------------------------------- |
| JWT secret      | Минимум 32 символа                                      |
| CORS production | `API_CORS_ORIGINS` обязателен при `NODE_ENV=production` |

---

### 2.3. Аутентификация и JWT

**Файл:** `src/server/middleware/authMiddleware.js`

```js
jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
jwt.sign(payload, jwtSecret, { algorithm: "HS256", ... });
```

Защита от **algorithm confusion** (`alg: none` / RS256 подмена).

---

### 2.4. Валидация входных данных

**Новый файл:** `src/server/validation/stringLimits.js`

| Поле                          | Лимит   |
| ----------------------------- | ------- |
| email                         | 254     |
| password                      | 128     |
| name, address, product fields | 200–500 |

**Файл:** `src/server/validation/ordersValidation.js`

- `isValidOrderNumber()` — формат `SU-\d{6}` (whitelist перед SQL)
- Тест: `ordersValidation.test.js`

**Файлы:** `authValidation.js`, `productsValidation.js` — max length checks.

---

### 2.5. SQL Injection — параметризация

Все запросы в `src/server/repositories/postgres/*` используют placeholders `$1, $2, ...`. Конкатенация user input в SQL **не применяется**.

---

### 2.6. Frontend и Netlify

**Файл:** `netlify.toml`

| Header                    | Значение                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://mc.yandex.ru; ...` |
| `X-Frame-Options`         | `DENY`                                                            |
| `X-Content-Type-Options`  | `nosniff`                                                         |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                 |
| `Permissions-Policy`      | camera, microphone, geolocation отключены                         |

**Frontend:** вывод данных через `textContent` / `createElement`, без `innerHTML`.

---

### 2.7. Обработка ошибок и логирование

**Файл:** `src/server/middleware/errorMiddleware.js`

- Production 500: `"Internal server error."` без stack trace клиенту
- Структурированные логи (Шаг 7): `logger.warn` / `logger.error` без паролей и токенов

---

### 2.8. OAuth2 (Yandex)

| Мера            | Реализация                                      |
| --------------- | ----------------------------------------------- |
| CSRF protection | `state` parameter, одноразовый, TTL 10 мин      |
| Rate limit      | Auth limiter на `/api/auth/yandex`              |
| Secrets         | Client secret только в `.env`, не в репозитории |

---

### 2.9. Сводная таблица изменённых файлов

| Файл                                          | Изменение                              |
| --------------------------------------------- | -------------------------------------- |
| `package.json`                                | helmet, express-rate-limit, audit:prod |
| `src/server/middleware/securityMiddleware.js` | **новый**                              |
| `src/server/middleware/authMiddleware.js`     | HS256 only                             |
| `src/server/validation/stringLimits.js`       | **новый**                              |
| `src/server/validation/*.js`                  | лимиты, order number                   |
| `src/server/createServer.js`                  | security stack                         |
| `src/server/config/env.js`                    | CORS + JWT validation                  |
| `netlify.toml`                                | security headers                       |
| `.github/workflows/ci-cd.yml`                 | audit:prod в job quality               |

---

## 3. Рекомендации по безопасности

### 3.1. Production (обязательно перед выкладкой API)

```env
NODE_ENV=production
JWT_SECRET=<случайная строка ≥32 символов>
API_CORS_ORIGINS=https://regal-sunflower-1a7fff.netlify.app
DATABASE_URL=postgresql://...
LOG_LEVEL=warn
```

| #   | Рекомендация                                                                         |
| --- | ------------------------------------------------------------------------------------ |
| 1   | **HTTPS only** — TLS на reverse proxy / PaaS                                         |
| 2   | **Не коммитить** `.env`, `.env.local`, токены Netlify/GitHub                         |
| 3   | **Ротация секретов** при утечке: JWT_SECRET, OAuth client secret, NETLIFY_AUTH_TOKEN |
| 4   | **CORS whitelist** — только домены фронтенда, без `*`                                |
| 5   | **Отдельный хост API** — Express + Postgres, не Netlify Functions для MVP            |

---

### 3.2. Разработка

| #   | Рекомендация                                                                              |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | **Не expose** Vite dev server (`npm run dev`) в публичную сеть — риск GHSA-67mh-4wv8-2f99 |
| 2   | Периодически: `npm audit fix` (без `--force` без тестов)                                  |
| 3   | При обновлении vite/vitest — прогон `npm test` и `npm run build`                          |
| 4   | Не хранить production secrets в локальном `.env` на shared machine                        |

---

### 3.3. CI/CD и мониторинг

| #   | Рекомендация                                             |
| --- | -------------------------------------------------------- |
| 1   | Не отключать `npm run audit:prod` в pipeline             |
| 2   | GitHub → Watch repository → failed Actions               |
| 3   | Netlify → Notifications → Deploy failed                  |
| 4   | Анализ логов: `npm run logs:analyze -- --level error`    |
| 5   | Smoke test после deploy — `verify:smoke` (JS/CSS assets) |

---

### 3.4. Аутентификация и OAuth

| #   | Рекомендация                                                     |
| --- | ---------------------------------------------------------------- |
| 1   | Production redirect URI в Yandex OAuth = точный URL API callback |
| 2   | `OAUTH_FRONTEND_SUCCESS_URL` = production URL callback страницы  |
| 3   | Для multi-instance API — вынести OAuth state в Redis             |
| 4   | Рассмотреть refresh tokens / короткий TTL JWT для production     |

---

### 3.5. Платежи (когда будет интеграция)

| #   | Рекомендация                                         |
| --- | ---------------------------------------------------- |
| 1   | Webhook ЮKassa — проверка подписи, idempotency       |
| 2   | Не помечать заказ «Оплачен» до подтверждения webhook |
| 3   | Секреты магазина только server-side                  |
| 4   | Логировать payment events без PAN/ CVV               |

---

### 3.6. Долгосрочные улучшения

| Приоритет | Улучшение                                                      |
| --------- | -------------------------------------------------------------- |
| Высокий   | Hosted API + production CORS/OAuth                             |
| Средний   | HttpOnly Secure cookie для session (если откажетесь от Bearer) |
| Средний   | WAF / Cloudflare перед API                                     |
| Низкий    | Major upgrade vite 8+ после снятия GHSA esbuild                |
| Низкий    | SAST в CI (CodeQL, Semgrep)                                    |
| Низкий    | Dependency Review Action в GitHub                              |

---

## 4. OWASP Top 10 — итоговая матрица

| ID  | Категория                 | До аудита                 | После                            |
| --- | ------------------------- | ------------------------- | -------------------------------- |
| A01 | Broken Access Control     | Риск alg confusion        | ✅ HS256, RBAC, IDOR fix         |
| A02 | Cryptographic Failures    | Частично                  | ✅ bcrypt, JWT secret validation |
| A03 | Injection                 | SQL OK, XSS partial       | ✅ + CSP, validation, limits     |
| A04 | Insecure Design           | Нет body limits           | ✅ 100kb, string limits          |
| A05 | Security Misconfiguration | Headers, CORS, rate limit | ✅ helmet, netlify.toml          |
| A06 | Vulnerable Components     | 8 moderate                | ✅ 0 prod / 5 dev                |
| A07 | Auth Failures             | Brute-force               | ✅ rate limit auth               |
| A08 | Integrity Failures        | —                         | ✅ npm ci + lockfile             |
| A09 | Logging Failures          | Basic logs                | ✅ JSON structured logs          |
| A10 | SSRF                      | N/A                       | ✅ N/A                           |

---

## 5. Команды проверки

```powershell
# Production dependencies — ожидание: 0 vulnerabilities
npm run audit:prod

# Все зависимости — ожидание: 5 moderate (dev only)
npm audit

# Статический анализ и тесты
npm run lint
npm test

# Security-related integration tests
npm run test:api
npm run test:oauth
```

---

## 6. Связанные документы

| Документ                                      | Содержание                           |
| --------------------------------------------- | ------------------------------------ |
| `Шаг 2. Аудит безопасности.md`                | Детальный отчёт шага 2               |
| `integration_documentation.md`                | Сводка интеграций + security summary |
| `Шаг 7. Настройка логирования.md`             | JSON logs, анализ инцидентов         |
| `netlify.toml`                                | CSP и security headers               |
| `src/server/middleware/securityMiddleware.js` | helmet + rate limit                  |

---

_Аудит: production-уязвимости устранены, добавлены слои защиты API и фронта. Dev-цепочка vite/esbuild документирована как принятый остаточный риск._
