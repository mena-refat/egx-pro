# قائمة تحقق شاملة — .cursor/rules + Responsiveness + i18n + Dark/Light

## 1. مطابقة .cursor/rules (components.mdc / api.mdc)

### Frontend (components.mdc)
| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Page ≤ 200 سطر، orchestration فقط | ⚠️ | بعض الصفحات (MarketPage, DashboardPage, AuthPage) تتجاوز أو تحتوي logic |
| 2 | كل component معه *.module.scss | ⚠️ | كثير من المكونات تستخدم Tailwind في className؛ القاعدة: ممنوع Tailwind — استخدام SCSS modules |
| 3 | ممنوع style={{ }} إلا قيم ديناميكية | ⚠️ | ProfileGuardModal كان يستخدم inline styles — تم إصلاحه |
| 4 | ممنوع Tailwind utility classes | ❌ | Modal, StockFilters, MarketIndicesGrid, DiscoverPage, StockAnalysis, DangerZoneTab، وغيرها تستخدم Tailwind |
| 5 | الألوان عبر var(--bg-card), var(--text-primary) فقط | ✅ | index.css يعرّف :root و .dark؛ الملفات التي تستخدم var() متوافقة |
| 6 | Data logic في custom hooks | ✅ | useGoals, usePortfolio, useAIPlan, useProfileGuard، إلخ |
| 7 | Loading / Error / Empty states | ✅ | صفحات AI والـ goals تعرضها |
| 8 | AbortController في useEffect مع fetch | ✅ | معتمد في الـ hooks |
| 9 | i18n عبر t() بدون نصوص ثابتة | ✅ | استخدم t('key') في الواجهات |
| 10 | Props مكتوبة بـ interface | ✅ | المكونات الجديدة (AI, ProfileGuard) typed |

### Backend (api.mdc)
| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Route = method + path + middleware + controller | ✅ | analysis, goals, portfolio، إلخ |
| 2 | Controller بدون business logic ولا prisma | ✅ | |
| 3 | Service = business logic؛ Repository = DB | ✅ | |
| 4 | Response: { data } / { items, pagination } / { error } | ✅ | |
| 5 | authenticate على المسارات المحمية | ✅ | |
| 6 | Zod لتحقق المدخلات | ✅ | |
| 7 | AppError + معالجة أخطاء مركّزة | ✅ | |

---

## 2. Responsiveness

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | صفحات AI (AIPage, AIAnalyze, AICompare, AIRecommendations) | ✅ | AIPage: grid 1 col موبايل، 3 أعمدة من 768px؛ padding مناسب |
| 2 | استخدام @media أو mixins للـ breakpoints | ✅ | صفحات AI وindex.css تستخدم @media؛ Tailwind md/sm في المكونات |
| 3 | safe-area و padding-bottom للـ mobile | ✅ | index.css: .safe-area-inset-bottom؛ viewport-fit=cover في index.html |
| 4 | BottomNav / Sidebar يختفون أو يتكيفون | ✅ | Sidebar: hidden md:flex؛ BottomNav: md:hidden |
| 5 | منع overflow أفقي عالمي | ✅ | html, body overflow-x: hidden؛ .main-content min-width: 0؛ App wrapper max-w-[100vw] overflow-x-hidden |
| 6 | Main content padding responsive | ✅ | main: p-4 sm:p-6 md:p-8 |
| 7 | Header title responsive | ✅ | text-lg sm:text-xl md:text-2xl مع truncate وmin-w-0 |
| 8 | Settings tabs scroll على الموبايل | ✅ | overflow-x-auto مع -mx-1 px-1 |
| 9 | Touch وtap highlight للموبايل | ✅ | @media (max-width: 767px) مع -webkit-tap-highlight-color و touch-action |

---

## 3. الترجمات (ar / en)

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | نفس المفاتيح في ar/common.json و en/common.json | ✅ | تمت إضافة المفاتيح الناقصة: ar ← dashboard.connecting, showIndicators, hideIndicators؛ error.generic, invalid_email, invalid_phone, network, password_too_short, passwords_no_match, phone_11_digits. en ← achievements.congrats, newAchievement, tabLabel. |
| 2 | مفاتيح ai.* كاملة في اللغتين | ✅ | profileRequiredTitle, profileRequiredBody, goToProfile، إلخ |
| 3 | placeholders ورسائل الخطأ مترجمة | ✅ | |

---

## 4. Dark / Light Mode

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Design tokens في :root (light) و .dark | ✅ | index.css يعرّف --bg-primary, --text-primary، إلخ للوضعين |
| 2 | useTheme يطبّق class "dark" على documentElement | ✅ | useTheme.ts يضيف/يزيل .dark |
| 3 | المكونات تستخدم var(--*) وليس ألوان ثابتة | ✅ | حيث يُستخدم var() الـ theme يعمل تلقائياً |
| 4 | إعدادات الثيم (light/dark/system) في الواجهة | ✅ | PreferencesTab يعرض الخيارات |

---

## 5. إجراءات مُنفّذة في هذه المراجعة

- إصلاح **ProfileGuardModal**: نقل الـ styles من `style={{}}` إلى `ProfileGuardModal.module.scss` تماشياً مع القاعدة (ممنوع inline styles).
- **الترجمات**: إضافة المفاتيح الناقصة في ar و en لتحقيق التطابق (dashboard.*, error.*, achievements.*).
- إنشاء وتحديث هذه القائمة.

---

## 6. توصيات لاحقة (غير مُنفّذة في هذه الجلسة)

1. **Tailwind**: المشروع يستورد `tailwindcss` في index.css وكثير من المكونات تستخدم classes مثل `flex`, `rounded-xl`, `text-lg`. القاعدة في components.mdc: "ممنوع استخدام Tailwind utility classes". للامتثال الكامل يُفضّل نقل هذه المكونات تدريجياً إلى SCSS modules مع استخدام var() فقط.
2. **حجم الملفات**: تقسيم الصفحات والمكونات التي تتجاوز 200 سطر (مثلاً StockAnalysis، OnboardingWizard) إلى مكونات فرعية.
3. **Mixins للـ breakpoints**: إنشاء `src/styles/_mixins.scss` مع `@mixin mobile { }` و `@mixin tablet { }` واستخدامها في كل الـ *.module.scss للتوحيد.

---

## 7. مراجعة عميقة — ربط الفرونت والباكند (آخر تحديث)

### ربط الفرونت والباكند
| البند | الحالة | ملاحظات |
|--------|--------|----------|
| Auth: GET /api/auth/me يعيد `{ data: { user, accessToken } }` | ✅ | الفرونت (App.tsx) يستخرجها ويستدعي setAuth فقط عند وجود الاثنين |
| Token: setAuth تستدعي setAccessToken من lib/auth/tokens | ✅ | apiClient (client.ts) و api (api.ts) يستخدمان التوكن بعد التحديث |
| أخطاء API: رموز موحّدة UPPERCASE | ✅ | تم توحيد 401 → UNAUTHORIZED، 404 → NOT_FOUND في الـ middleware والـ controllers |
| استجابة الأخطاء: { error: "CODE" } بدون كشف تفاصيل داخلية | ✅ | معالجة أخطاء مركّزة في server.ts مع AppError و ZodError |

### إصلاحات تمت في هذه الجلسة
1. **Backend — توحيد رموز الأخطاء (api.mdc)**  
   - `auth.middleware.ts`: `unauthorized` / `invalid_token` → `UNAUTHORIZED`  
   - `plan.middleware.ts`: `unauthorized` → `UNAUTHORIZED`  
   - `profile.ts`: `Unauthorized` → `UNAUTHORIZED`  
   - `auth.controller.ts`: كل 401 → `error: 'UNAUTHORIZED'`  
   - `server.ts`: 404 لمسارات API غير معروفة → `error: 'NOT_FOUND'`  
   - `stocks.controller.ts`: 404 للسهم → `error: 'NOT_FOUND'` (بدلاً من "Ticker not found")

2. **Backend — أخطاء TypeScript/استيراد**  
   - `billing.service.ts`: إزالة استيراد مكرر لـ UserRepository  
   - `user.service.ts`: إضافة `import { prisma } from '../lib/prisma.ts'`  
   - `stockQuote.service.ts`: استبدال `CAIRO_TZ` بـ `MARKET_DATA.CAIRO_TZ`

3. **Frontend — أمان وتوافق**  
   - `App.tsx`: استدعاء setAuth فقط عند وجود `user` و `accessToken` (تفادي حالة جزئية)  
   - `App.tsx` و `authStore.ts`: حماية `console.error` بـ `import.meta.env.DEV` (ممنوع console في الإنتاج)  
   - `App.tsx`: حماية `console.error` في handleThemeChange بـ DEV

### أخطاء TypeScript المتبقية (لا تزال مفتوحة)
- `predictionStats` غير موجود على نوع User في Prisma (predictions/social services)  
- مكوّن Skeleton: `key` غير معرف في SkeletonProps (Dashboard، GoalsPage، MarketGainersLosers)  
- `useStockScreener`: مقارنة مع 'ultra' | 'ultra_yearly' تحتاج تحديث نوع Plan  
- `GoalsPage`: نوع TFunction من i18next  
- `useDiscoverAutocomplete`: namespace React  
- `DashboardMarketOverview` / `DashboardWatchlistList`: أنواع البيانات من الـ API

يُفضّل معالجة هذه النقاط في جلسة لاحقة مع مراجعة schema Prisma وأنواع المكونات المشتركة.
