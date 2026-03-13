# قائمة تحقق تطبيق .cursor/rules — 100%

تم إنشاؤها للمطابقة الكاملة مع engineering.mdc و api.mdc و components.mdc.

**تحديث**: تم توحيد الرولز مع الكود — مراجع Yahoo في engineering.mdc و api.mdc استُبدلت بـ market data / Twelve Data. سكربتات `server/scripts/` تستخدم console للخرج (مقبول).

---

## engineering.mdc

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Backend: routes بدون logic | ✅ | watchlist, goals, portfolio, billing, news = controller فقط |
| 2 | Backend: controllers بدون business logic ولا prisma | ✅ | كل الـ controllers تستدعي services أو UserRepository |
| 3 | Backend: services تحتوي كل الـ business logic | ✅ | |
| 4 | Backend: repositories تحتوي كل استعلامات DB | ✅ | UserRepository يغطي كل استعلامات User؛ watchlist, goals, portfolio, notifications. |
| 5 | Auth middleware على المسارات المحمية | ✅ | |
| 6 | Ownership (userId في الاستعلامات) | ✅ | |
| 7 | Constants من lib/constants | ✅ | |
| 8 | AppError + معالجة أخطاء مركّزة | ✅ | |
| 9 | لا non-null بدون guard | ✅ | |
| 10 | Zod + max() في الـ schemas | ✅ | |
| 11 | Rate limiting (watchlist, goals, analysis) | ✅ | |
| 12 | RATE_LIMITS من constants | ✅ | |
| 13 | Winston ولا console في السيرفر | ✅ | |
| 14 | React.lazy للصفحات الثقيلة | ✅ | |
| 15 | Zustand + عدم prop drilling | ✅ | |
| 16 | i18n عبر t() | ✅ | |
| 17 | توحيد FREE_LIMITS (مصدر واحد أو متطابق) | ✅ | تم: الفرونت `src/lib/constants.ts` يطابق السيرفر `server/lib/plan.ts` (goals, portfolioStocks, watchlistStocks, aiAnalysisPerMonth). |

---

## api.mdc

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Route = method + middleware + controller فقط | ⚠️ | **ناقص**: analysis route فيه كل الـ logic داخل الـ handler. يجب استخراج AnalysisService + AnalysisController. |
| 2 | Controller لا يستدعي prisma | ✅ | |
| 3 | Service فيه business logic ويستخدم Repository | ✅ | UserService و AuthService وغيرهما يستخدمون UserRepository. |
| 4 | تنسيق الاستجابة: { data } / { items, pagination } / { error } | ✅ | مطبّق على كل الـ APIs. |
| 5 | authenticate على المسارات المحمية | ✅ | |
| 6 | Logger بدل console | ✅ | |
| 7 | TypeScript و AuthRequest | ✅ | |

---

## components.mdc

| # | البند | الحالة | ملاحظات |
|---|--------|--------|----------|
| 1 | Page ≤ 100 سطر | ❌ | MarketPage، DashboardPage، AuthPage، GoalsPage تتجاوز بكثير. |
| 2 | Feature component ≤ 200 سطر | ❌ | SecurityTab، OnboardingWizard، StockAnalysis، InvestmentCalculator، PortfolioTracker، AccountTab، إلخ تتجاوز. |
| 3 | Shared component ≤ 150 سطر | ⚠️ | بعضها يتجاوز. |
| 4 | Custom hook ≤ 80 سطر | ❌ | useStockScreener، useStockAnalysis، usePortfolio، useNotifications تتجاوز. |
| 5 | أي function ≤ 40 سطر | ⚠️ | غير مفحوص بشكل منهجي. |
| 6 | استخدام مكونات Design System (Button, Input, إلخ) | ⚠️ جزئي | تم استبدال كثير من الأزرار؛ متبقي أزرار أيقونات/ثيم. |
| 7 | ممنوع ألوان hardcoded — CSS variables فقط | ✅ | تم: استبدال كل الألوان المذكورة بـ var(--border), var(--border-strong), var(--warning), var(--text-muted), var(--brand). |
| 8 | useEffect + fetch مع AbortController و cleanup | ✅ | usePortfolio، useMarketPage، useDashboardStats، useNotifications، useStockQuote، إلخ. |
| 9 | تنظيف event listeners و timers | ✅ | |
| 10 | react-hook-form + Zod للنماذج | ✅ | |
| 11 | Memo للـ components الثقيلة و useCallback حيث يلزم | ⚠️ | غير مفحوص بالكامل. |

---

## أولويات التنفيذ لاقتراب 100%

1. **تنفيذ فوري**: إصلاح ألوان hardcoded المتبقية، توحيد FREE_LIMITS، استخراج Analysis إلى Service + Controller.
2. **متوسط**: توسيع UserRepository (أو قبول استثناء لـ Auth/User لتعقيدهما)، استبدال باقي raw buttons بمكون Button.
3. **طويل**: تقسيم كل الصفحات/المكونات/Hooks لتلبية حدود الأسطر (يتطلب تقسيم عشرات الملفات).
