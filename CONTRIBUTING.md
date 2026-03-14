# المساهمة في Borsa

## بيئة التطوير

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in required values
4. `npx prisma migrate dev`
5. `npm run dev`

## بنية الكود

راجع [ARCHITECTURE.md](./ARCHITECTURE.md) لشرح مفصل للبنية.

## قواعد الكود

### Backend
- كل service تعمل `throw new AppError(...)` — لا ترجع `{ error }` أبداً
- كل DB access عبر repositories — الـ services لا تستورد prisma
- كل route فيها request validation بـ Zod schemas عبر `validate()` middleware
- كل controller يستخدم `sendSuccess()` و `sendError()` — لا ترسل `res.json()` مباشرة

### Frontend
- كل list فاضية تعرض `<EmptyState>` بـ icon + عنوان عربي + CTA
- كل page لها skeleton component خاص بها
- كل input في form لها `<label>` و `aria-required`
- لا تستخدم `as any` — صفر `any` في الكود

### الاختبارات
- `npm run test` — يشغل كل الاختبارات
- `npm run test:watch` — وضع المراقبة
- Integration tests في `server/tests/`
- Schema tests و component tests في `src/test/`

### Commits
- الصيغة: `fix(scope): description` أو `feat(scope): description`
- أمثلة: `fix(auth): remove pepper default`, `feat(predictions): add like endpoint`
