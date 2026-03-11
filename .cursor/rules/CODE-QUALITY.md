# معايير جودة الكود — EGX Pro

مرجع سريع للتأكد من أن الكود احترافي، منظم، آمن، وبدون تسريبات ذاكرة.

---

## 1. تقسيم المكوّنات (Component split)

| النوع | الحد الأقصى | إجراء عند التجاوز |
|-------|-------------|-------------------|
| Page | 100 سطر | تقسيم إلى مكوّنات فرعية + hooks |
| Feature component | 200 سطر | استخراج أجزاء إلى مكوّنات أصغر |
| Shared component | 150 سطر | تقسيم أو نقل منطق إلى hook |
| Custom hook | 80 سطر | استخراج ثوابت/دوال مساعدة إلى ملف منفصل |

- **الصفحة (Page)**: orchestration فقط — استدعاء hooks وعرض مكوّنات. لا fetch ولا JSX معقد داخل الصفحة نفسها.
- **المنطق والبيانات**: في custom hooks (مثل `useGoals`, `usePortfolio`). لا state أو fetch داخل الـ page مباشرة.

---

## 2. إدارة الذاكرة (Memory management)

### مطلوب في كل `useEffect`:

- **Fetch (api.get/post...)**: استخدام `AbortController` وإلغاء الطلب في الـ cleanup.
  ```ts
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);
  ```

- **Event listeners** (`addEventListener`): إزالة الـ listener في الـ cleanup.
  ```ts
  useEffect(() => {
    const handler = (e: MouseEvent) => { ... };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  ```

- **Timers** (`setTimeout` / `setInterval`): إلغاء/مسح في الـ cleanup (ويفضل حفظ الـ id في ref).
  ```ts
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  // عند الاستخدام: timeoutRef.current = setTimeout(...);
  ```

- **النتيجة**: عدم تحديث state على مكوّن تم unmount (تسريب ذاكرة + تحذيرات React).

---

## 3. التناسق والاحترافية

- **الثوابت**: لا magic numbers — استخدم `src/lib/constants.ts` (مثل `TIMEOUTS`, `FREE_LIMITS`, `CACHE_TTL`).
- **الألوان**: من CSS variables فقط (`var(--bg-card)`, `var(--text-primary)`, `var(--success)`, …). لا ألوان hardcoded.
- **الأزرار والنماذج**: استخدم مكوّنات الـ design system (`Button`, `Input`, `EmptyState`) بدل raw `<button>` / `<input>` حيث يناسب.
- **النماذج (Forms)**: `react-hook-form` + `Zod` دائمًا. لا state يدوي للقيم والتحقق.
- **النصوص**: عبر i18n (`t('key')`) — لا نصوص عربية/إنجليزية ثابتة في الـ JSX.

---

## 4. الأمان (Security)

- **التحقق من المدخلات**: في الـ backend بـ Zod قبل أي استخدام (لا ثقة في `req.body` بدون تحقق).
- **الملكية (Ownership)**: كل استعلام بـ `id` يتضمن `userId` (أو ما يعادله) في الـ `where`.
- **المسارات المحمية**: وجود `authenticate` middleware على كل route تحتاج auth.
- **السجلات (Logs)**: عدم تسجيل بيانات حساسة (كلمات مرور، tokens كاملة). استخدام `logger` في السيرفر وعدم استخدام `console.*` في production في الفرونت (استخدام `import.meta.env.DEV` عند الحاجة).

---

## 5. قائمة تحقق سريعة

- [ ] لا مكوّن/صفحة/hook يتجاوز حد الأسطر المحدد (أو مُقسّم بشكل واضح).
- [ ] كل `useEffect` فيه fetch يستخدم `AbortController` و cleanup.
- [ ] كل `addEventListener` له `removeEventListener` في الـ cleanup.
- [ ] كل `setTimeout`/`setInterval` له `clearTimeout`/`clearInterval` (ويفضل عبر ref).
- [ ] استخدام ثوابت من `constants.ts` بدل الأرقام والنصوص الثابتة.
- [ ] استخدام CSS variables للألوان ومكوّنات الـ design system حيث يناسب.
- [ ] النصوص عبر `t()` والتحقق في الـ backend عبر Zod.
- [ ] `npx tsc --noEmit` بدون أخطاء.
