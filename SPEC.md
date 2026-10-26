# SPEC — Техническая спецификация

**Цель:** зафиксировать архитектуру, модели данных, маршруты и правила реализации.

## 1. Стек
- Node.js + TypeScript + Express.
- EJS для HTML-шаблонов; CSS и чистый JavaScript для интерфейса.
- Neon PostgreSQL.
- Prisma ORM и миграции.
- Серверные сессии, bcrypt для паролей, Passport Google OAuth 2.0.
- Zod для серверной валидации.
- Stripe Checkout (тестовый режим) для онлайн-оплаты, подтверждение через подписанный webhook.
- Vitest и Supertest для тестирования.
- Git и GitHub.

Полный магазин с авторизацией, БД и платежами ненадёжно помещать в один `index.html`, поэтому предлагается разделение frontend и серверной логики. Если репозиторий уже существует, сначала изучить его и не переписывать файлы целиком без необходимости.

## 2. Структура проекта
```text
tech-store/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/env.ts
│  ├─ middleware/{auth,error-handler,csrf}.ts
│  ├─ routes/{home,catalog,product,auth,favorites,compare,cart,checkout,payment,account}.routes.ts
│  ├─ services/{catalog,cart,order,auth,payment}.service.ts
│  ├─ db/prisma.ts
│  └─ views/{layouts,partials,pages,errors}/
├─ public/
│  ├─ css/{tokens,base,components,pages}.css
│  ├─ js/{catalog,product,cart,favorites}.js
│  └─ images/
├─ prisma/{schema.prisma,migrations/}
├─ tests/
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ README.md
├─ PRD.md
├─ SPEC.md
├─ TASKS.md
└─ TASKS-GUIDE.md
```

## 3. URL-карта
| Метод | URL | Назначение |
|---|---|---|
| GET | `/` | Главная |
| GET | `/catalog` | Каталог, поиск, фильтры, сортировка |
| GET | `/product/:slug` | Динамическая страница товара |
| GET | `/compare` | Сравнение |
| GET | `/favorites` | Избранное |
| GET | `/cart` | Отдельная корзина |
| GET/POST | `/register` | Регистрация |
| GET/POST | `/login` | Вход |
| POST | `/logout` | Выход |
| GET | `/auth/google` | Начало Google OAuth |
| GET | `/auth/google/callback` | Callback Google |
| POST | `/api/cart/items` | Добавить позицию |
| PATCH | `/api/cart/items/:id` | Изменить количество |
| DELETE | `/api/cart/items/:id` | Удалить позицию |
| POST | `/api/favorites/:productId` | Изменить избранное |
| POST | `/api/compare` | Изменить сравнение |
| GET/POST | `/checkout` | Оформление заказа |
| POST | `/api/orders` (`paymentMethod=online`) | Создать заказ `pending_payment` и Stripe Checkout Session, вернуть `checkoutUrl` |
| POST | `/payments/stripe/webhook` | Webhook Stripe: проверка подписи `Stripe-Signature`, события `checkout.session.*` |
| GET | `/payment/result?session_id=cs_...` | Показать статус, перепроверенный сервером через Stripe API |
| GET | `/account` | Личный кабинет |
| GET | `/account/orders` | Заказы текущего пользователя |

Webhook принимает сырое тело запроса (подключается до `express.json()`). Нельзя принимать `?success=true` или аналогичный параметр браузера за доказательство оплаты.

## 4. Модели данных

### User
`id` UUID, `email` unique, `passwordHash` nullable для OAuth, `name`, `googleId` unique/nullable, `createdAt`, `updatedAt`.

### Category
`id`, `name`, `slug`, `parentId` nullable, `sortOrder`.

### Product
`id`, `name`, `slug` unique, `brand`, `categoryId`, `description`, `priceUzs` integer, `stock` integer, `isActive`, `isFeatured`, `createdAt`, `updatedAt`.

### ProductImage / ProductAttribute
Изображения имеют `productId`, `url`, `sortOrder`. Атрибуты имеют `productId`, `name`, `value`, `unit` nullable, `sortOrder`.

### Favorite
`userId`, `productId`, `createdAt`; уникальный индекс `(userId, productId)`.

### Cart / CartItem
Cart: `id`, `userId` nullable, `sessionId` nullable, timestamps. CartItem: `id`, `cartId`, `productId`, `quantity`, timestamps. Количество не меньше 1; одна позиция на товар в корзине.

### Order / OrderItem
Order: `id`, `userId` nullable при гостевом заказе, `orderNumber` unique, `status`, `currency` (`UZS`), `subtotalUzs`, `deliveryUzs`, `totalUzs`, контакты покупателя и адрес доставки, timestamps.
OrderItem: `id`, `orderId`, `productId` nullable, `productNameSnapshot`, `unitPriceUzs`, `quantity`, `lineTotalUzs`.

### Payment
`id`, `orderId`, `provider`, `providerPaymentId` nullable, `status`, `amountUzs`, `currency`, `idempotencyKey`, timestamps. Не хранить номер карты или CVV.

## 5. Бизнес-правила
- Деньги хранить целыми числами сумов, не `float`.
- `lineTotal = unitPrice * quantity`; `subtotal = сумма lineTotal`; `total = subtotal + delivery - discounts`.
- Сервер повторно читает цены и остатки перед заказом.
- При добавлении уже имеющегося товара увеличивается количество существующей позиции.
- Количество не может превышать доступный остаток.
- Гостевая корзина после входа объединяется с пользовательской с повторной проверкой остатков.
- Создание заказа выполняется транзакционно.
- Снимок названия и цены в OrderItem сохраняет историю.
- Статус `paid` выставляется только после достоверной серверной проверки платёжного результата.
- Обработка уведомлений идемпотентна: одно событие не применяется дважды.
- Изменяющие запросы защищаются от CSRF; доступ к заказам проверяется на сервере.

## 6. Переменные окружения
`.env.example`:
```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=
SESSION_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
STRIPE_UZS_RATE=12700
APP_BASE_URL=http://localhost:3000
```
Реальные значения добавлять только в локальный `.env` или защищённые настройки хостинга. `.env` должен быть в `.gitignore`. Не логировать пароли, токены и платёжные секреты. В production использовать HTTPS, безопасные cookies, rate limiting, серверную валидацию и общую обработку ошибок.

## 7. Дизайн-система
```css
:root {
  color-scheme: dark;
  --bg: #0B0D12;
  --surface: #131720;
  --surface-raised: #1A2030;
  --text: #F5F7FB;
  --muted: #9AA4B2;
  --accent: #7C6CFF;
  --accent-2: #22C7D6;
  --success: #35C98A;
  --danger: #FF647C;
  --border: rgba(255,255,255,0.09);
  --radius-card: 20px;
  --radius-control: 12px;
  --content-width: 1240px;
}
```
Bento-сетка создаёт иерархию, а не делает каждую мелочь карточкой. На телефоне сетка перестраивается в одну колонку. У кнопок есть default, hover, focus, active, disabled и loading состояния. Учитывать `prefers-reduced-motion`, видимый клавиатурный фокус и контраст. Taste skill — проверка визуальной иерархии, ритма, типографики, адаптивности и финальной полировки.

## 8. Критерии приёмки
1. Каталог поддерживает поиск, фильтры и сортировку.
2. Страница по slug показывает конкретный товар; неизвестный slug — 404.
3. Сравнение показывает атрибуты и позволяет удалить товар.
4. Избранное сохраняется после обновления.
5. `/cart` показывает корректные позиции и суммы.
6. Сервер блокирует заказ при недостаточном остатке или устаревшей цене.
7. Email/password и Google login создают корректную сессию.
8. Пользователь не может получить чужие заказы.
9. Тестовая оплата обновляет статус только после серверной проверки.
10. Сценарии ошибок не раскрывают stack trace или секреты.
11. Основные страницы адаптивны от 360 px.
12. Миграции применяются на чистой базе, тесты проходят.

## 9. Не входит в MVP
Реальные платежи до подтверждения учётной записи; хранение карточных данных; сложный складской учёт нескольких филиалов; расширенная админка, промокоды и ML-рекомендации.
