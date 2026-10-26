# TashTech — магазин техники в Ташкенте

Node.js + TypeScript + Express + EJS, Neon PostgreSQL через Prisma, вход по email/паролю и Google OAuth, тестовая онлайн-оплата через Stripe Checkout.

## Локальный запуск

```bash
npm install
cp .env.example .env   # заполнить DATABASE_URL, SESSION_SECRET, ключи Google и Stripe
npm run prisma:push
npm run prisma:seed
npm run dev            # http://localhost:3000
```

Тесты (Vitest + Supertest):

```bash
npm test
```

## Оплата Stripe (тестовый режим)

1. В [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) включите **Test mode** и скопируйте `Secret key` (`sk_test_...`) в `STRIPE_SECRET_KEY`.
2. Для локальной проверки webhook установите [Stripe CLI](https://docs.stripe.com/stripe-cli) и запустите:
   ```bash
   stripe listen --forward-to localhost:3000/payments/stripe/webhook
   ```
   CLI выведет `whsec_...` — это значение `STRIPE_WEBHOOK_SECRET`.
3. На странице оформления выберите «Онлайн картой — Stripe» и оплатите тестовой картой `4242 4242 4242 4242` (любая будущая дата, любой CVC).

Как это работает:

- Заказ создаётся со статусом `pending_payment`, товары резервируются на складе.
- Покупатель переходит на страницу Stripe Checkout. Сумма в UZS конвертируется в `STRIPE_CURRENCY` по курсу `STRIPE_UZS_RATE`.
- Статус меняется только по серверно проверенным данным: подписанному webhook `POST /payments/stripe/webhook` или запросу Checkout Session через Stripe API на странице `/payment/result`. Параметры в адресной строке браузера оплатой не считаются.
- `paid`: оплата подтверждена. `payment_failed`: сессия истекла или платёж отклонён, резерв возвращается на склад.
- Повторная доставка webhook ничего не меняет: переходы статусов условные (`pending_payment → paid` выполняется ровно один раз).

## Деплой на Vercel

1. Подключите репозиторий к Vercel (конфигурация в `vercel.json`).
2. В **Settings → Environment Variables** (окружение Production) задайте:
   `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://<домен>/auth/google/callback`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL=https://<домен>`.
3. В Stripe Dashboard → **Developers → Webhooks** добавьте endpoint `https://<домен>/payments/stripe/webhook` с событиями:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
   Его `Signing secret` — это `STRIPE_WEBHOOK_SECRET` для production.
4. В Google Cloud Console добавьте `https://<домен>/auth/google/callback` в Authorized redirect URIs.
5. После изменения переменных сделайте **Redeploy**: новые значения применяются только к новому деплою.
