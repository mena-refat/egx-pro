# تقرير تطبيق قواعد .cursor/rules — EGX Pro

تاريخ المراجعة: بناءً على الكود الحالي.

---

## ✅ تم تنفيذه (آخر تحديث)

1. **استيراد RATE_LIMITS و ONE_* من constants** — `server.ts` يستخدم `RATE_LIMITS` من `server/lib/constants.ts`؛ و`watchlist` و`goals` routes تستخدم `ONE_MINUTE_MS`. رسالة الـ rate limit موحّدة: `RATE_LIMIT_EXCEEDED`.
2. **AbortController في كل useEffect فيه fetch** — تم في `usePortfolio`، `ReferralTab`، `AccountOverviewTab`، `SubscriptionTab`، `AchievementsTab`.
3. **استبدال ألوان hardcoded بـ CSS variables** — في `StockNameDisplay`، `PortfolioTracker`، `DelayNotice`، `PortfolioPerformanceChart`، `InvestmentCalculator`، `OnboardingWizard`، `SecuritySettings`.
4. **إنشاء AppError + error middleware** — تم إنشاء `server/lib/errors.ts` (كلاس `AppError`) وتحديث الـ global error handler في `server.ts` ليعيد `{ error: err.code }` لـ AppError و `VALIDATION_ERROR` لـ ZodError و `INTERNAL_ERROR` للأخطاء غير المعالجة.
5. **Watchlist: Controller + Service** — تم نقل كل منطق الـ watchlist من `server/routes/watchlist.ts` إلى `WatchlistService` و`WatchlistController`؛ الـ route يقتصر على تسجيل middleware + controller. استخدام `AppError` (UNAUTHORIZED, WATCHLIST_LIMIT_REACHED, PRICE_ALERTS_PRO, ALREADY_IN_WATCHLIST) وتمرير الأخطاء للـ global handler عبر `run(..).catch(next)`. rate limit: `RATE_LIMIT_EXCEEDED`.
6. **توحيد استجابة API للـ watchlist** — قائمة: `{ items, pagination }`؛ مورد واحد (إضافة): `{ data: { ...item, newUnseenAchievements } }`؛ أخطاء: `{ error: 'CODE' }`. تم تحديث الفرونت لاستخدام `response.data.items` وقيد `WATCHLIST_LIMIT_REACHED`.
7. **توحيد استجابة API للـ goals** — GoalsService يرمي `AppError` (UNAUTHORIZED, GOAL_LIMIT_REACHED, NOT_FOUND). GoalsController يستخدم `run(..).catch(next)` ويعيد: قائمة `{ items, pagination }`؛ موارد مفردة `{ data: goal }` أو `{ data: { ...goal, newUnseenAchievements } }`؛ أخطاء عبر الـ global handler. rate limit: `RATE_LIMIT_EXCEEDED`. الفرونت: GoalFormModal (GOAL_LIMIT_REACHED)، GoalTracker (data.data.newUnseenAchievements).
8. **توحيد استجابة profile/completion و notifications** — profile completion: `{ data: { percentage, missing } }`؛ أخطاء UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR. notifications: أكواد أخطاء UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR. الفرونت: useProfileCompletion و AccountOverviewTab يدعمان الصيغة الجديدة مع رجوع للصيغة القديمة.
9. **توحيد استجابة User API** — جميع endpoints تعيد مورداً واحداً داخل `{ data }`: getProfile, updateProfile, getProfileStats, checkUsername, getUnseenAchievements, getAchievements, getReferral, getSecurity, getSessions؛ redeemReferral و uploadAvatar و deleteAccount تعيد `{ data: ... }`؛ useReferralCode تعيد `{ success: true, data: { referrerName } }`. أخطاء موحّدة: UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR, EMAIL_ALREADY_EXISTS, PHONE_ALREADY_EXISTS, USERNAME_TAKEN, USERNAME_COOLDOWN, INVALID_PHONE, VALIDATION_ERROR, REWARD_ALREADY_CLAIMED, NOT_ENOUGH_REFERRALS, REFERRAL_CODE_ALREADY_USED, INVALID_REFERRAL_CODE, OWN_REFERRAL_CODE, INVALID_IMAGE_FORMAT, INVALID_CONFIRM, PASSWORD_REQUIRED, INVALID_ACCOUNT, WRONG_PASSWORD. revokeAllOtherSessions: `{ success: true }`. تم تحديث الفرونت: ProfilePage، App، AuthPage، AccountTab، SecurityTab، ReferralTab، AchievementsTab، DangerZoneTab، OnboardingWizard لقراءة `data` من الاستجابة.

---

## ملخص سريع

| الملف | مطبّق بالكامل؟ | ملاحظات |
|-------|-----------------|----------|
| **engineering.mdc** | جزئي | نقص طبقة Repository، تنسيق Response، AppError |
| **components.mdc** | جزئي | ألوان hardcoded، بعض raw `<button>`، بعض useEffect بدون AbortController |
| **api.mdc** | جزئي | لا توجد طبقة Repository، تنسيق Response غير موحّد، watchlist فيه logic في الـ route |

---

## 1. engineering.mdc

### ✅ مطبّق

- **Auth middleware**: المسارات المحمية تستخدم `authenticate` (ما عدا GET /me عن قصد).
- **Ownership**: استعلامات الـ goal/portfolio/notification تتضمن `userId` في الـ where.
- **Constants**: وجود `src/lib/constants.ts` و `server/lib/constants.ts` واستخدام PLAN_PRICES, TIMEOUTS, ONE_HOUR_MS وغيرها.
- **لا non-null بدون guard**: تم استبدال `!` بتحققات وoptional chaining.
- **AuthRequest**: استخدام `(req as AuthRequest).user?.id` في المسارات.
- **Zod + max()**: وجود حدود طول للنصوص في الـ schemas (مثل max(500), max(255)).
- **Rate limiting**: وجود rate limit لـ watchlist, goals, analysis.
- **Prisma @@index([userId])**: النماذج ذات الاستعلام بـ userId تحتوي على indexes.
- **React.lazy**: الصفحات الثقيلة محمّلة بـ lazy + Suspense.
- **Zustand + عدم prop drilling**: استخدام useAuthStore و useNavigate بدل تمرير accessToken/onNavigate عبر مستويات.
- **Winston + لا console في السيرفر**: لا يوجد `console.*` في مجلد server.
- **i18n**: النصوص الظاهرة للمستخدم عبر `t()` من useTranslation.

### ❌ غير مطبّق أو جزئي

1. **طبقة Repository (1.1)**  
   القاعدة: "repositories/ ← ALL database queries live here".  
   الواقع: لا يوجد مجلد `server/repositories/`؛ الـ services تستدعي `prisma` مباشرة.  
   **الإجراء**: إما إضافة طبقة repositories ونقل كل استعلامات Prisma إليها، أو تحديث القاعدة لتعكس الواقع الحالي (services تستدعي prisma).

2. **تنسيق استجابة API (قسم 9)**  
   القاعدة: Single item → `res.status(200).json({ data: goal })`، List → `{ items, pagination }`.  
   الواقع: كثير من المسارات ترجع `res.json(goal)` أو `res.json(data)` بدون غلاف `{ data: ... }`، وبعض الأخطاء ترجع `message` مع `error`.  
   **أمثلة**: portfolio controller يرجع `res.json(data)`، goals يرجع `res.json(data)`، auth يرجع `res.status(400).json({ error: '...', message: '...' })`.

3. **AppError + معالجة أخطاء مركّزة (قسم 6)**  
   القاعدة: استخدام `throw new AppError('CODE', status)` ومعالجة موحّدة في server.  
   الواقع: لا يوجد `server/lib/errors.ts` ولا كلاس `AppError`؛ الأخطاء تُعالج بـ try/catch في الـ controllers وتُرجع نصوص مختلفة.  
   **الإجراء**: إنشاء `AppError` واستخدامه في الـ services، وإضافة middleware للأخطاء في server.ts يطبّق التنسيق الموحّد.

4. **Route بدون منطق أعمال (api.mdc)**  
   القاعدة: الـ route = method + path + middleware + controller فقط.  
   الواقع: `server/routes/watchlist.ts` يحتوي على منطق أعمال (استدعاء prisma، تحقق isPro، إنشاء إشعارات) داخل الـ route بدل نقله إلى controller + service.  
   **الإجراء**: نقل منطق الـ watchlist إلى WatchlistController + WatchlistService (وإن أردت، WatchlistRepository لاحقاً).

5. **RATE_LIMITS في server.ts**  
   القاعدة (api.mdc): استيراد من constants.  
   الواقع: في server.ts أرقام الـ rate limit مكتوبة يدوياً (مثل 15*60*1000, max: 5).  
   **الإجراء**: استيراد RATE_LIMITS (أو ONE_MINUTE_MS) من `server/lib/constants.ts` واستخدامها في تعريف الـ limiters.

6. **ثوابت FREE_LIMITS موحّدة**  
   القاعدة: وجود FREE_LIMITS في constants.  
   الواقع: السيرفر يستخدم `server/lib/plan.ts` (مثلاً portfolioStocks: 10, watchlistStocks: 20) والفرونت يستخدم `src/lib/constants.ts` (portfolio: 5, watchlist: 10).  
   **الإجراء**: توحيد المصدر (مثلاً تعريف الحدود في مكان واحد واستخدامها من السيرفر والفرونت إن لزم).

---

## 2. components.mdc

### ✅ مطبّق

- **Design system**: استخدام Button, Input, EmptyState, PageLoader, ErrorBoundary في أغلب الواجهات.
- **استخدام CSS variables**: كثير من المكونات تستخدم `var(--bg-card)`, `var(--text-primary)`, `var(--brand)` وغيرها.
- **تنظيف timers/listeners**: وجود cleanup لـ setTimeout و addEventListener في عدة مكونات (مثل ReferralTab, AccountTab, DangerZoneTab).
- **AbortController في عدة أماكن**: StockDetailPage, DashboardPage, useStockScreener, MarketPage, FinancialGoalsSidebar, useGoals, GoalTracker, useStockAnalysis, PortfolioTracker.
- **react-hook-form + Zod**: النماذج الرئيسية (مثل الـ goals والـ auth) تستخدمها.
- **Loading / Error / Empty**: معالجة في صفحات مثل Goals والـ Portfolio والـ Dashboard.
- **Zustand + عدم prop drilling**: الاعتماد على useAuthStore و useNavigate بدل تمرير الـ props عبر مستويات.
- **i18n**: الاعتماد على `t()` للنصوص.
- **TypeScript للـ props**: واجهات واضحة للمكونات (مثل ProfileTabProps, StockCardProps).
- **Constants**: استيراد TIMEOUTS و FREE_LIMITS من `src/lib/constants.ts`.

### ❌ غير مطبّق أو جزئي

1. **ممنوع ألوان hardcoded (قسم 2.3 و 4)**  
   القاعدة: كل الألوان من CSS variables.  
   الواقع: وجود classes مثل `text-slate-500`, `text-emerald-500`, `text-red-500`, `bg-violet-500`, `bg-slate-800` في ملفات مثل:  
   - StockNameDisplay.tsx  
   - PortfolioPerformanceChart.tsx  
   - SecuritySettings.tsx  
   - DelayNotice.tsx  
   - OnboardingWizard.tsx  
   - InvestmentCalculator.tsx  
   - PortfolioTracker.tsx  
   **الإجراء**: استبدالها بـ `var(--success)`, `var(--danger)`, `var(--brand)` وغيرها حسب الدلالة.

2. **استخدام Button بدل raw `<button>` (قسم 2.2 و 5)**  
   القاعدة: كل الأزرار عبر مكون Button.  
   الواقع: استخدام `<button type="button" ...>` في Header, StockAnalysis, GoalTracker, MarketPage, SecurityTab, SecuritySettings لأزرار ثانوية (theme, notifications, close).  
   **الإجراء**: استبدال الأزرار التي هي "أكشن" واضح بمكون `<Button>`؛ يمكن الاستثناء لأزرار أيقونة صغيرة فقط إن وُضِع ذلك في القاعدة.

3. **AbortController في كل useEffect فيه fetch (قسم 2.4 و 8)**  
   القاعدة: أي useEffect يستدعي fetch أو api.get يجب أن يستخدم AbortController و cleanup.  
   الواقع:  
   - usePortfolio: `useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);` بدون AbortController.  
   - ReferralTab: استخدام `cancelled` flag مع api.get بدون signal (مقبول وظيفياً لكن لا يلائم نص القاعدة).  
   - AccountOverviewTab, AchievementsTab, SubscriptionTab: يفضل مراجعة وجود إما AbortController أو على الأقل إلغاء الطلب عند الـ unmount.  
   **الإجراء**: إضافة AbortController وتمرير `signal` لـ api.get في هذه الـ hooks واستدعاء abort في الـ cleanup.

4. **حدود حجم الملفات (صفحة 100، feature 200، hook 80)**  
   القاعدة: Page ≤100 سطر، Feature ≤200، Hook ≤80.  
   الواقع: بعض الملفات أطول (مثل OnboardingWizard، MarketPage، PortfolioTracker، StockAnalysis).  
   **الإجراء**: تقسيم الملفات التي تتجاوز الحد إلى مكونات أو hooks أصغر حسب القائمة في components.mdc.

---

## 3. api.mdc

### ✅ مطبّق

- **Route = method + middleware + controller**: أغلب المسارات (goals, portfolio, notifications, user) تتبع هذا النمط.
- **Controller لا يستدعي prisma مباشرة**: الـ controllers تستدعي services.
- **Service فيه business logic**: الـ services تحتوي على التحقق من الخطة والحدود والتحقق من الملكية.
- **Zod للـ input**: استخدام schemas من validations في الـ watchlist والـ goals والـ portfolio.
- **authenticate على المسارات المحمية**: موجود على goals, portfolio, watchlist, user, billing, notifications, profile.
- **Ownership في الاستعلامات**: استخدام where: { id, userId } أو findFirst({ where: { id, userId } }) في goals وportfolio وnotifications.
- **Logger بدل console**: استخدام logger في السيرفر.
- **TypeScript و AuthRequest**: استخدام نوع AuthRequest في المسارات المحمية.
- **Rate limiting**: وجود limiters لـ watchlist وgoals وanalysis.

### ❌ غير مطبّق أو جزئي

1. **Repository = كل استعلامات DB (قسم 4)**  
   لا يوجد طبقة Repository؛ الـ services تستدعي prisma مباشرة. (نفس النقطة في engineering.mdc.)

2. **تنسيق الاستجابة (قسم 5)**  
   المطلوب: `res.status(200).json({ data: goal })` و `res.status(400).json({ error: 'VALIDATION_ERROR' })` بدون كشف تفاصيل داخلية.  
   الواقع: استجابات بدون غلاف `data`، وبعض الأخطاء ترجع `message` أو نصوص مفصّلة. (نفس النقطة في engineering.mdc.)

3. **استخدام AppError (قسم 9)**  
   لا يوجد AppError ولا معالجة أخطاء موحّدة حسب القاعدة. (نفس النقطة في engineering.mdc.)

4. **منطق الأعمال داخل route (قسم 1)**  
   watchlist.ts يحتوي على تحقق isPro، عدّ الـ watchlist، إنشاء achievements وnotifications داخل الـ route. المطلوب: استدعاء controller فقط، والمنطق في service (وربما repository).

5. **RATE_LIMITS من constants (قسم 10 و 13)**  
   في server.ts أرقام الـ rate limit غير مستوردة من server/lib/constants.  
   **الإجراء**: استيراد ONE_MINUTE_MS و ONE_HOUR_MS و RATE_LIMITS من constants واستخدامها في server.ts.

---

## أولويات الإصلاح المقترحة

1. **عالية (أمان واتساق)**  
   - توحيد تنسيق استجابة API (وخاصة الأخطاء) وعدم كشف تفاصيل داخلية.  
   - استيراد واستخدام ثوابت الـ rate limit من server/lib/constants في server.ts.

2. **متوسطة (توافق مع القواعد)**  
   - استبدال الألوان Hardcoded في الفرونت بـ CSS variables.  
   - إضافة AbortController في usePortfolio وأي useEffect آخر يستدعي fetch بدون إلغاء.  
   - نقل منطق watchlist من الـ route إلى WatchlistController + WatchlistService.

3. **منخفضة (هيكلة)**  
   - إدخال طبقة Repository إن رغبت بالتوافق الكامل مع النص الحالي للقواعد.  
   - إدخال AppError و error middleware في server.ts.  
   - تقسيم الصفحات/المكونات الطويلة لتحقيق حدود الأسطر.

---

تم إعداد هذا التقرير لمطابقة الكود الحالي مع محتوى الملفات في `.cursor/rules`. يمكن استخدامه كقائمة تحقق عند التعديلات القادمة.
