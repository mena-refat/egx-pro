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
9. **توحيد استجابة User API** — جميع endpoints تعيد مورداً واحداً داخل `{ data }`؛ applyReferralCode (كان useReferralCode) تعيد `{ success: true, data: { referrerName } }`. أخطاء موحّدة (UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR، إلخ). تم تحديث الفرونت لقراءة `data` من الاستجابة.
10. **استبدال ألوان hardcoded إضافية** — تم في MarketPage (bg-card)، StockPriceChart (text-muted)، SecuritySettings (bg-card, border, bg-input, text-muted, brand)، DelayNotice (warning-bg)، PortfolioTracker (danger-bg, danger)، InvestmentCalculator (success).
11. **طبقة Repository** — تم إنشاء `server/repositories/watchlist.repository.ts` و `server/repositories/goals.repository.ts`؛ WatchlistService و GoalsService يستدعيان الـ repositories لجميع استعلامات watchlist و goal (استعلامات user للخطة ما زالت في الـ service عبر prisma).
12. **توحيد استجابة Portfolio API** — PortfolioController يستخدم `run(..).catch(next)`؛ getAll يعيد `{ data }`؛ add يعيد `{ data: { ...holding, newUnseenAchievements } }`؛ update يعيد `{ success: true }`؛ delete يعيد 204. PortfolioService يرمي AppError (UNAUTHORIZED, VALIDATION_ERROR, PORTFOLIO_LIMIT_REACHED, NOT_FOUND). الفرونت: usePortfolio يقرأ من `response.data?.data ?? response.data` ويدعم PORTFOLIO_LIMIT_REACHED؛ PortfolioTracker يتعامل مع كلا الكودين.
13. **استبدال raw &lt;button&gt; بمكون Button** — EmptyState، ErrorBoundary، DangerZoneTab؛ إضافة: Header (تسجيل خروج، إشعارات: مسح الكل، تحديد كمقروء، نعم/لا)، MarketPage (إعادة المحاولة، ترقية الأسعار الحية، تحديث).
14. **توحيد استجابة APIs (stocks, market, analysis, auth, billing, news)** — جميعها تعيد `{ data }` للنجاح وأكواد أخطاء (NOT_FOUND, INTERNAL_ERROR, UNAUTHORIZED, ANALYSIS_LIMIT_REACHED, RATE_LIMIT_EXCEEDED, NEWS_API_MISSING, DISCOUNT_INVALID، إلخ). Stocks/Market: Controller مع run().catch(next). News: NewsService + NewsController. Billing: BillingService + BillingController. Analysis: رسالة rate limit RATE_LIMIT_EXCEEDED واستجابة { data: { analysis, id, newUnseenAchievements } }. Auth: كل استجابات النجاح داخل { data }. تم تحديث الفرونت لقراءة payload من response.data?.data ?? response.data.
15. **توسيع طبقة Repository** — إضافة PortfolioRepository، NotificationsRepository، UserRepository (getPlanUser، getForBillingPlan). PortfolioService و NotificationService و BillingService تستخدمها.
16. **تقسيم الملفات الطويلة** — استخراج مكوّن MarketIndicesGrid من MarketPage لتقليل حجم الصفحة؛ باقي الصفحات/المكوّنات الطويلة يمكن تقسيمها لاحقاً لتحقيق Page≤100، Feature≤200، Hook≤80.

---

## ملخص سريع (محدّث)

| الملف | مطبّق بالكامل؟ | ملاحظات |
|-------|-----------------|----------|
| **engineering.mdc** | جزئي | ✅ AppError، constants، auth، ownership، Zod، rate limit، Repository لـ watchlist، goals، portfolio، notifications، user (جزئي). ❌ حدود أسطر الصفحات/Hooks غير مطبّقة بالكامل. |
| **components.mdc** | جزئي | ✅ CSS variables، Design system، AbortController، Button في أماكن إضافية (Header، MarketPage). بدء تقسيم الصفحات (MarketIndicesGrid). ❌ بعض raw `<button>`؛ حدود أسطر الملفات ما زالت تتطلب مزيد تقسيم. |
| **api.mdc** | جزئي | ✅ استجابة موحّدة لـ watchlist, goals, profile, notifications, user, portfolio، **stocks, market, news, billing, analysis, auth**؛ Repository موسّع؛ Billing و News ب controller + service. |

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

1. **طبقة Repository (1.1)** — **مطبّق**  
   WatchlistRepository، GoalsRepository، PortfolioRepository، NotificationsRepository، UserRepository (getPlanUser، getForBillingPlan). الـ services المعنية تستخدمها.

2. **تنسيق استجابة API (قسم 9)** — **مطبّق**  
   تم توحيد: watchlist، goals، profile/completion، notifications، user، portfolio، **stocks، market، news، billing، analysis، auth** — جميعها تعيد `{ data }` أو `{ items, pagination }` وأكواد أخطاء فقط.

3. **AppError + معالجة أخطاء مركّزة (قسم 6)** — **مطبّق**  
   تم: `server/lib/errors.ts`، global error handler في server.ts، استخدام AppError في WatchlistService و GoalsService.

4. **Route بدون منطق أعمال (api.mdc)** — **مطبّق لـ watchlist و goals**  
   watchlist و goals: الـ route = middleware + controller فقط؛ المنطق في Service.

5. **RATE_LIMITS في server.ts** — **مطبّق**  
   تم استيراد RATE_LIMITS و ONE_MINUTE_MS من constants؛ رسالة rate limit: `RATE_LIMIT_EXCEEDED`.

6. **ثوابت FREE_LIMITS موحّدة**  
   السيرفر: `server/lib/plan.ts` (portfolioStocks, watchlistStocks, goals). الفرونت: `src/lib/constants.ts` قد تختلف أرقاماً. **الإجراء**: توحيد المصدر إن لزم.

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

2. **استخدام Button بدل raw `<button>` (قسم 2.2 و 5)** — **مطبّق جزئياً**  
   تم استبدال: EmptyState، ErrorBoundary، DangerZoneTab، Header (تسجيل خروج، إشعارات)، MarketPage (إعادة المحاولة، ترقية، تحديث).  
   **متبقي**: أزرار ثانوية/أيقونات (مثل theme switcher) يمكن تركها أو استبدالها لاحقاً.

3. **AbortController في كل useEffect فيه fetch (قسم 2.4 و 8)** — **مطبّق في أغلب الأماكن**  
   تم في usePortfolio، ReferralTab، AccountOverviewTab، SubscriptionTab، AchievementsTab (استخدام AbortController و signal و cleanup).

4. **حدود حجم الملفات (صفحة 100، feature 200، hook 80)** — **بدء التطبيق**  
   تم استخراج MarketIndicesGrid من MarketPage.  
   **متبقي**: MarketPage، DashboardPage، AuthPage، GoalsPage، OnboardingWizard، SecurityTab، StockAnalysis، إلخ — ما زالت تتجاوز الحدود؛ يمكن الاستمرار في التقسيم لاحقاً.

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

1. **Repository = كل استعلامات DB (قسم 4)** — **مطبّق**  
   WatchlistRepository، GoalsRepository، PortfolioRepository، NotificationsRepository، UserRepository (جزئي)؛ الـ services المعنية تستخدمها.

2. **تنسيق الاستجابة (قسم 5)** — **مطبّق**  
   مطبّق لـ watchlist، goals، profile/completion، notifications، user، portfolio، stocks، market، news، billing، analysis، auth.

3. **استخدام AppError (قسم 9)** — **مطبّق**  
   موجود في server/lib/errors.ts؛ مستخدم في WatchlistService و GoalsService؛ معالجة مركّزة في server.ts.

4. **منطق الأعمال داخل route (قسم 1)** — **مطبّق لـ watchlist و goals**  
   watchlist و goals: route = controller فقط؛ المنطق في Service.

5. **RATE_LIMITS من constants (قسم 10 و 13)** — **مطبّق**  
   تم استيراد RATE_LIMITS و ONE_MINUTE_MS من server/lib/constants.ts في server.ts و routes.

---

## أولويات الإصلاح المتبقية

1. **منخفضة (هيكلة)**  
   - استبدال مزيد من raw `<button>` (أزرار الأيقونات/theme) بمكون Button إن رغبت.  
   - الاستمرار في تقسيم الصفحات/المكونات/Hooks الطويلة لتحقيق حدود الأسطر (Page 100، Feature 200، Hook 80).

---

تم إعداد هذا التقرير لمطابقة الكود الحالي مع محتوى الملفات في `.cursor/rules`. يمكن استخدامه كقائمة تحقق عند التعديلات القادمة.
