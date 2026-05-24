# Шаг 1. Настройка CI/CD пайплайна

Документ описывает настройку автоматизации проверок и деплоя проекта **StepUp Web MVP** через **GitHub Actions** на хостинг **Netlify**.

---

## Цель

1. Создать конфигурационный файл pipeline GitHub Actions.
2. Настроить этапы: **установка зависимостей → проверка качества → тестирование → сборка → деплой**.
3. Добавить проверки качества кода: **линтинг (ESLint)** и **форматирование (Prettier)**.
4. Настроить **автоматический деплой** при push в ветки `main` / `master` на Netlify.

---

## Архитектура pipeline

```text
push / pull_request (main, master)  │  workflow_dispatch (ручной запуск)
                │
                ├─► quality (Lint & Format)     — npm ci → lint → format:check → audit:prod
                │
                ├─► test (Tests)                — npm ci → test → test:structure
                │         (параллельно с quality)
                │
                └─► build (Build)               — npm ci → vite build → upload artifact dist/
                          needs: [quality, test]
                                │
                                └─► deploy (Deploy to Netlify)
                                      needs: build
                                      if: push в main/master (не на PR)
                                      download dist/ → nwtgck/actions-netlify
```

**На pull request** выполняются jobs `quality`, `test` и `build`. Job **Deploy to Netlify** пропускается — деплой только при **push** в `main` или `master`.

**Concurrency:** при новом push в ту же ветку предыдущий запуск pipeline отменяется (`cancel-in-progress: true`).

---

## Конфигурационный файл: `.github/workflows/ci-cd.yml`

Единый workflow **CI/CD** заменяет прежний `.github/workflows/ci-tests.yml` (удалён, чтобы не дублировать проверки при push).

### Триггеры

| Событие              | Ветки              | Деплой |
| -------------------- | ------------------ | ------ |
| `push`               | `main`, `master`   | Да     |
| `pull_request`       | `main`, `master`   | Нет    |
| `workflow_dispatch`  | любая              | Да*, если ветка main/master |

### Общие настройки

| Параметр        | Значение                          |
| --------------- | --------------------------------- |
| Runner          | `ubuntu-latest`                   |
| Node.js         | `20` (с кешем `npm`)              |
| Permissions     | `contents: read`                  |
| Timeout jobs    | 10–15 минут                       |

---

## Этапы pipeline (jobs)

### 1. `quality` — Lint & Format

Проверка качества кода и зависимостей.

| Шаг                         | Команда                 | Назначение                                      |
| --------------------------- | ----------------------- | ----------------------------------------------- |
| Checkout                    | `actions/checkout@v4`   | Клонирование репозитория                        |
| Setup Node.js               | `actions/setup-node@v4` | Node 20 + cache npm                             |
| Install dependencies        | `npm ci`                | Чистая установка по `package-lock.json`         |
| Lint                        | `npm run lint`          | ESLint по всему проекту                         |
| Format check                | `npm run format:check`  | Prettier без изменения файлов                  |
| Dependency audit (production)| `npm run audit:prod`   | `npm audit --omit=dev` — уязвимости prod-зависимостей |

### 2. `test` — Tests

| Шаг                  | Команда                    | Назначение                                           |
| -------------------- | -------------------------- | ---------------------------------------------------- |
| Install dependencies | `npm ci`                   | Установка зависимостей                               |
| Run tests            | `npm run test`             | Vitest: unit + integration (API, OAuth, analytics…) |
| Structure test       | `npm run test:structure`   | Проверка обязательных файлов структуры MVP           |

Скрипт `scripts/check-project-structure.mjs` проверяет наличие ключевых файлов (`main.js`, страницы, router, store и т.д.).

### 3. `build` — Build

Запускается **после успешного** `quality` и `test` (`needs: [quality, test]`).

| Шаг                  | Команда                      | Назначение                    |
| -------------------- | ---------------------------- | ----------------------------- |
| Install dependencies | `npm ci`                     | Установка зависимостей        |
| Build                | `npm run build`              | Vite → каталог `dist/`        |
| Upload artifact      | `actions/upload-artifact@v4` | Сохранение `dist/` на 7 дней  |

Артефакт передаётся в job deploy — сборка выполняется один раз, деплой использует готовый `dist/`.

### 4. `deploy` — Deploy to Netlify

| Условие     | `github.event_name == 'push'` и ветка `refs/heads/main` или `refs/heads/master` |
| ----------- | ------------------------------------------------------------------------------- |
| Зависимость | `needs: build`                                                                  |

| Шаг               | Действие                                                         |
| ----------------- | ---------------------------------------------------------------- |
| Download artifact | `actions/download-artifact@v4` → `dist/`                         |
| Deploy            | `nwtgck/actions-netlify@v3.0`                                  |

**Параметры деплоя:**

| Параметр                      | Значение                              |
| ----------------------------- | ------------------------------------- |
| `publish-dir`                 | `./dist`                              |
| `production-branch`           | `main`                                |
| `deploy-message`              | `Deploy <commit-sha>`                 |
| `enable-commit-comment`       | `true` — комментарий в commit         |
| `enable-pull-request-comment` | `false`                               |
| `NETLIFY_AUTH_TOKEN`          | secret GitHub                         |
| `NETLIFY_SITE_ID`             | secret GitHub                         |

---

## Секреты GitHub Actions

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret               | Где взять                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → New access token               |
| `NETLIFY_SITE_ID`    | Netlify → Site settings → Site details → **Site ID** (UUID)             |

Без этих секретов job deploy завершится ошибкой на push в main/master.

---

## Проверки качества кода (локальная настройка)

### `package.json` — новые скрипты и dev-зависимости

**Dev-зависимости:**

- `eslint`, `@eslint/js`, `globals`
- `prettier`

**Скрипты:**

| Скрипт           | Команда                    | Использование              |
| ---------------- | -------------------------- | -------------------------- |
| `lint`           | `eslint .`                 | CI + локально              |
| `lint:fix`       | `eslint . --fix`           | Автоисправление ESLint     |
| `format`         | `prettier --write .`       | Форматирование файлов      |
| `format:check`   | `prettier --check .`       | CI — только проверка       |
| `audit:prod`     | `npm audit --omit=dev`     | CI — audit prod-зависимостей |

### `eslint.config.js` (новый)

Flat-config ESLint для ESM-проекта:

- Базовый набор `@eslint/js` recommended
- Окружение: browser + Node (`globals`)
- ECMAScript 2022, `sourceType: "module"`
- Правило `no-unused-vars` с `argsIgnorePattern: "^_"` (неиспользуемые аргументы с `_` допустимы)
- Игнор: `dist/`, `node_modules/`, `coverage/`

### `.prettierrc` и `.prettierignore` (новые)

**`.prettierrc`:**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "none",
  "printWidth": 100
}
```

**`.prettierignore`:** `dist`, `node_modules`, `package-lock.json`, `artifacts`.

### Исправление под ESLint

В `src/server/createServer.js` параметр `next` в обработчике `/api/health` переименован в `_next` — соответствие правилу неиспользуемых аргументов.

---

## Конфигурация Netlify: `netlify.toml`

Файл в корне репозитория — используется Netlify при сборке и при деплое из Actions.

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Redirect `/* → /index.html`** — обязателен для SPA (History API): прямые ссылки `/catalog`, `/cart`, `/login` отдают `index.html`, а не 404.

**Security headers** (добавлены в рамках аудита безопасности, применяются на production):

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Content-Security-Policy` (в т.ч. разрешение `https://mc.yandex.ru` для Метрики)

---

## Настройка Netlify (вне репозитория)

1. Создать сайт на [netlify.com](https://www.netlify.com/) и привязать к GitHub-репозиторию.
2. Добавить в GitHub secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
3. **Рекомендуется:** в Netlify → **Build settings** → **Stop builds** — чтобы production-деплой шёл **только из GitHub Actions**, без дублирования при push.
4. (Опционально) Environment variables в Netlify для сборки frontend, например `VITE_YM_COUNTER_ID`, `VITE_API_BASE_URL`.

**Production URL:** `https://regal-sunflower-1a7fff.netlify.app` (или ваш домен / Site name).

---

## Локальная проверка перед push

Повторяет шаги CI локально:

```powershell
npm ci
npm run lint
npm run format:check
npm run audit:prod
npm run test
npm run test:structure
npm run build
```

Исправление стиля кода:

```powershell
npm run lint:fix
npm run format
```

---

## Как проверить после push

### Pull request (без деплоя)

1. **GitHub → Actions → CI/CD** — jobs **Lint & Format**, **Tests**, **Build** зелёные.
2. Job **Deploy to Netlify** **не запускается** (или skipped).

### Push в `main` / `master` (с деплоем)

1. **GitHub → Actions** — все 4 job успешны, включая **Deploy to Netlify**.
2. **Netlify → Deploys** — новый production deploy с сообщением `Deploy <sha>`.
3. Открыть URL сайта, проверить:
   - главная страница загружается;
   - навигация SPA (`/catalog`, `/cart`, `/login`) без 404;
   - статика (CSS, JS) отдаётся корректно.

### Ручной запуск

**Actions → CI/CD → Run workflow** — полный прогон; deploy выполнится, если выбрана ветка `main` или `master`.

---

## Ограничения деплоя на Netlify

Netlify раздаёт **только статику** (`dist/` после `vite build`).

| Компонент              | Netlify | Локально (dev)        |
| ---------------------- | ------- | --------------------- |
| SPA (Vite frontend)    | ✅      | ✅ `npm run dev`      |
| Express API            | ❌      | ✅ `npm run api:start`|
| PostgreSQL             | ❌      | ✅ Docker Compose     |
| OAuth Yandex callback  | ❌*     | ✅ `:3001`            |
| Proxy `/api` → backend | ❌      | ✅ Vite dev proxy     |

\* Для OAuth и API на production нужен отдельный хостинг backend и переменная `VITE_API_BASE_URL` при сборке.

---

## Использование AI при настройке

Примеры промптов для отчёта:

1. *«Создай GitHub Actions workflow: lint, test, build, deploy на Netlify при push в main»*
2. *«Добавь ESLint и Prettier в проект, скрипты lint и format:check»*
3. *«Напиши netlify.toml для SPA с redirect на index.html»*

AI использовался для: проектирования структуры jobs, генерации `ci-cd.yml`, настройки ESLint/Prettier, `netlify.toml` и документации.

---

## Сводка: требования и реализация

| Требование                              | Реализация                                              |
| --------------------------------------- | ------------------------------------------------------- |
| Конфигурационный файл pipeline          | `.github/workflows/ci-cd.yml`                           |
| Установка зависимостей                  | `npm ci` в каждом job                                   |
| Линтинг                                 | `npm run lint` (job `quality`)                          |
| Форматирование                          | `npm run format:check` (job `quality`)                    |
| Audit prod-зависимостей                 | `npm run audit:prod` (job `quality`)                    |
| Тестирование                            | `npm run test` + `npm run test:structure` (job `test`)  |
| Сборка                                  | `npm run build` → artifact `dist/` (job `build`)        |
| Деплой при push в main/master           | job `deploy` + `nwtgck/actions-netlify@v3.0`            |
| Деплой не на PR                         | `if: github.event_name == 'push'`                       |
| Хостинг                                 | Netlify (`regal-sunflower-1a7fff.netlify.app`)           |
| SPA routing на production               | `netlify.toml` redirects                                |

---

## Изменённые и добавленные файлы

| Файл                              | Тип изменения                                      |
| --------------------------------- | -------------------------------------------------- |
| `.github/workflows/ci-cd.yml`     | **Новый** — единый CI/CD pipeline                  |
| `.github/workflows/ci-tests.yml`  | **Удалён** — логика перенесена в `ci-cd.yml`       |
| `package.json`                    | Скрипты lint/format/audit, devDependencies         |
| `eslint.config.js`                | **Новый** — конфиг ESLint                          |
| `.prettierrc`                     | **Новый** — правила Prettier                       |
| `.prettierignore`                 | **Новый** — исключения форматирования              |
| `netlify.toml`                    | **Новый** — build, publish, SPA redirect, headers  |
| `src/server/createServer.js`      | `_next` вместо `next` (ESLint)                     |
