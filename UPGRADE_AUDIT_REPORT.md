# تقرير الفحص التشخيصي الشامل لتطوير نظام النزلاوي
**OpenAppo Legacy System Upgrade Audit Report**
**تاريخ الفحص:** 22 أكتوبر 2026  
**النظام المستهدف:** النزلاوي لتجارة وتوزيع الأدوات الكهربائية (`elnazlawy.openappo.com`)  
**المرجع التنفيذي:** `D:\OPEN APPS\DigitalOcian Projects\DigitalOcian Projects instructions\LEGACY_SYSTEM_UPGRADE_GUIDE.md`

---

## ملخص تنفيذي (Executive Summary)

بعد فحص الكود المصدري لنظام **النزلاوي** بدقة ومطابقته بأحدث معايير OpenAppo (أكتوبر 2026)، تبيّن أن النظام يعمل حالياً بنجاح بعد إصلاحات الطباعة والـ PDF وتسريع البحث اللحظي التي نُفذت اليوم، لكنه ما زال يعاني معمارياً من **3 محاور اختناق رئيسية** تعوق وصوله لأعلى معايير السرعة والأمان:

1. **السرعة والسايدبار (Navigation Bottleneck):** كل صفحات النظام تُبنى حالياً كـ `ƒ (Dynamic)` بسبب استدعاء `checkSubscription()` وقراءة الكوكيز داخل `src/app/layout.tsx`، مع وجود `export const dynamic = 'force-dynamic'` في `src/app/(dashboard)/layout.tsx`، وغياب `profileCache.ts`. هذا يجبر السيرفر على بناء كل صفحة عند كل نقرة بدلاً من الفتح الفوري في 0ms (`○ Static`).
2. **الأمان ومنع الكراش (Security & Crash-Proofing):** وجود fallback ثابت للـ JWT (`dev-secret-change-in-production`) في الكود، وغياب كاش فحص الاشتراك (10 دقائق) مما يسبب اتصالاً خارجياً بسيرفر الإدارة في كل ريفريش، مع غياب حزمة صدمات الشاشة البيضاء (`global-error.tsx`, `ErrorReporter.tsx`, `clientErrors.ts`, `/api/client-error`)، وخلو وسم `<html>` من `translate="no"` ضد ترجمة جوجل، وعدم قصر إضافة المستخدمين على حساب مطور النظام `OpenAppo`.
3. **الهوية البصرية وتجربة الموبايل (UI/UX & Mobile Polish):** قفل زووم الموبايل الإجباري في الـ Viewport (`maximumScale: 1` و `userScalable: false`) المخالف لمعايير WCAG، وتكرار إحصائيات المنتجات والعملاء مرتين في الداشبورد، واستدعاء الداشبورد لـ 14 استعلام في قاعدة البيانات عبر SSR بدلاً من التحميل الخفيف للـ Shell.

---

## المحور الأول: فحص الأمان والاستقرار (Security & Crash-Proofing)

### 1.1 مفتاح الـ JWT والجلسات (`src/lib/db/auth.ts`)
- **الحالة:** ⚠️ **خطر أمني (Security Vulnerability).**
- **الدليل والسطور:**
  - السطور 4-6:
    ```ts
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || 'dev-secret-change-in-production'
    );
    ```
- **المشكلة:** وجود نص fallback ثابت مكشوف في الكود المصدري، مع تشغيله فوراً (Eager) عند تحميل الملف.
- **المطلوب تنفيذه:**
  1. حذف الـ fallback النصي نهائياً.
  2. تحويل فحص المفتاح إلى Lazy داخل دالة `getJwtSecret()` مع كاش في متغير موديول لحماية أمر البناء `next build` من التوقف.

### 1.2 كاش فحص الاشتراك والـ Middleware (`src/app/layout.tsx` + غياب `src/middleware.ts`)
- **الحالة:** ⚠️ **حرج في الأداء والاستقرار.**
- **الدليل والسطور:**
  - في `src/app/layout.tsx` (السطور 72-88):
    ```ts
    const res = await fetch(`${adminUrl}/api/subscription/verify?system=${systemName}`, {
      cache: "no-store",
    });
    ```
  - لا يوجد كاش في الذاكرة (10 دقائق).
  - لا يوجد `src/middleware.ts` في النظام، وفحص الاشتراك يتم في الـ Layout على كل طلب.
- **المطلوب تنفيذه:**
  1. إنشاء `src/lib/subscription-check.ts` مزود بكاش 10 دقائق (`CACHE_MS = 10 * 60 * 1000`).
  2. إنشاء `src/middleware.ts` ليتولى فحص الاشتراك المركزي وعرض شاشة الحجب فوراً عند إيقافه، مع استثناء مسار `/api/version` والملفات الثابتة في أول سطر.
  3. إزالة `checkSubscription()` بالكامل من `layout.tsx`.

### 1.3 حصر إدارة وإضافة المستخدمين بحساب مطور النظام (`src/app/api/users/route.ts`)
- **الحالة:** ⚠️ **مخالف لقرار المالك 17-10-2026.**
- **الدليل والسطور:**
  - في `src/app/api/users/route.ts` (السطر 26):
    ```ts
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    ```
- **المشكلة:** أي مستخدم بدور `admin` يمكنه إضافة مستخدمين جدد، بينما عدد المستخدمين جزء من باقة الاشتراك السحابية (100 ج/مستخدم).
- **المطلوب تنفيذه:** قصر إضافة مستخدم جديد على حساب مطور النظام `OpenAppo` (`01558282760` / `openappo`) وإرجاع `403` صريح لأي حساب آخر، مع إتاحة التعديل فقط للأدمن المحلي.

### 1.4 حزمة منع الشاشة البيضاء (White Screen & Crash Barriers)
- **الحالة:** ❌ **مفقودة بنسبة 80%.**
- **الدليل:**
  - `src/app/error.tsx`: موجود.
  - `src/app/global-error.tsx`: ❌ غير موجود (أي خطأ في الـ Layout يوقع الصفحة في شاشة بيضاء صامتة).
  - `src/components/ErrorReporter.tsx`: ❌ غير موجود (أخطاء المتصفح لا تُلتقط).
  - `src/app/api/client-error/route.ts`: ❌ غير موجود.
  - `src/lib/clientErrors.ts`: ❌ غير موجود (غياب auto-reload عند حدوث `ChunkLoadError` بعد التحديثات).
- **المطلوب تنفيذه:** إضافة الملفات الأربعة وربط مكوّن التبليغ داخل الـ RootLayout.

### 1.5 كراش ترجمة جوجل التلقائية (`src/app/layout.tsx`)
- **الحالة:** ❌ **خطر كراش فوري.**
- **الدليل والسطور:**
  - في `src/app/layout.tsx` (السطور 99 و 108): الوسم هو `<html lang="ar" dir="rtl" className={cairo.variable}>` بدون `translate="no"`.
  - غياب `<meta name="google" content="notranslate" />` في الـ `<head>`.
- **المطلوب تنفيذه:** إضافة `translate="no"` والميتا تاج لمنع جوجل من تدمير شجرة React عند ترجمة الصفحة.

---

## المحور الثاني: فحص السرعة والسايدبار والذاكرة (Speed, Navigation & RAM)

### 2.1 تحويل الـ RootLayout و DashboardLayout إلى Static متزامن (`○ Static`)
- **الحالة:** ❌ **غير مطابق — بطء إلزامي في كل نقرة.**
- **الدليل والسطور:**
  - في `src/app/layout.tsx` (السطر 90): `export default async function RootLayout` مع استدعاء `checkSubscription()` وقراءة الكوكيز في `getInitialUser()`.
  - في `src/app/(dashboard)/layout.tsx` (السطر 7 والسطر 9): `export const dynamic = 'force-dynamic'` مع `async function DashboardLayout` و `await getCurrentUser()`.
- **الأثر:** إجبار Next.js على جعل جميع صفحات الواجهة `ƒ (Dynamic)`، مما يجعل التنقل ينتظر السيرفر في كل نقرة بدلاً من الفتح اللحظي في 0ms.
- **المطلوب تنفيذه:**
  - تحويل `RootLayout` و `DashboardLayout` إلى دوال متزامنة عادية خالية من أي `async` أو `fetch` أو قراءة كوكيز.
  - تركيب السايدبار كـ Client Shell يعتمد على كاش الحساب والصلاحيات المشترك.
  - الهدف: تحويل جميع صفحات الواجهة في جدول البناء إلى **`○ (Static)`**.

### 2.2 كاش الحساب والصلاحيات المشترك (`profileCache.ts`)
- **الحالة:** ❌ **مفقود تماماً.**
- **الدليل والسطور:**
  - `src/lib/profileCache.ts`: غير موجود.
  - السايدبار في `src/components/Sidebar.tsx` يأخذ `profile` كـ prop ممرر من السيرفر فقط، مما يعوق جعله مستقلاً بذاكرة فورية تفتح في 0ms.
- **المطلوب تنفيذه:**
  - إنشاء `src/lib/profileCache.ts` يحتوي على `peekProfile()` و `getProfile()` مع كاش 60 ثانية.
  - ربط السايدبار وهوك `useCurrentUser` به ليبدأ المستخدم بقيم فورية بدون انتظار.

### 2.3 فهارس العمليات في قاعدة البيانات (`prisma/schema.prisma`)
- **الحالة:** ⚠️ **غياب الفهارس على الجداول اليومية الكبيرة.**
- **الدليل والسطور:**
  - في `sales_invoices` (السطور 210-256): غياب `@@index([invoice_date])`، `@@index([customer_id])`، `@@index([status])`.
  - في `purchase_invoices` (السطور 292-316): غياب `@@index([purchase_date])`، `@@index([supplier_id])`.
  - في `customer_payments` و `expenses`: غياب الفهارس على حقول التواريخ.
- **المطلوب تنفيذه:** إضافة الفهارس وتطبيقها عبر `prisma db push` الآمن بدون فقد بيانات.

---

## المحور الثالث: فحص الشكل والهوية وتجربة الموبايل (UI/UX & Mobile)

### 3.1 قفل زووم الموبايل الإجباري (`src/app/layout.tsx`)
- **الحالة:** ❌ **مخالفة لمعايير إمكانية الوصول (WCAG).**
- **الدليل والسطور:**
  - في `src/app/layout.tsx` (السطور 43-44):
    ```ts
    maximumScale: 1,
    userScalable: false,
    ```
- **المشكلة:** يمنع المستخدم من تكبير الشاشة بإصبعيه على الهاتف، بينما مشكلة زووم الآيفون التلقائي تم حلها بالفعل في `globals.css` بـ `font-size: 16px`.
- **المطلوب تنفيذه:** إزالة `maximumScale` و `userScalable` فوراً.

### 3.2 ازدواجية الإحصائيات في الصفحة الرئيسية (`src/app/(dashboard)/dashboard/page.tsx`)
- **الحالة:** ⚠️ **تكرار عناصر غير ضروري.**
- **الدليل والسطور:**
  - السطور 182-196 تعرض بطاقات "إجمالي المنتجات" و"إجمالي العملاء".
  - تكرار نفس الإحصائيات بالضبط في السطور 198-205 في قسم "System stats".
- **المطلوب تنفيذه:** إزالة التكرار لتنظيف لوحة التحكم والتركيز على المؤشرات المالية الحية وحركة المخزون.

### 3.3 حالة المكونات التي تم تحديثها اليوم
- ✅ **منظومة الطباعة والـ PDF:** تم تحديثها بالكامل بنجاح اليوم (تصميم مدمج 35–40 صنف، تثبيت `<colgroup>` ونسب الأعمدة، `nowrap`، وانتظار الخطوط والقص الذكي بين الصفوف).
- ✅ **البحث اللحظي وحفظ الفواتير:** تم تحديثه بالكامل بنجاح اليوم (`useSmartSearch` بعد أول حرفين، تجميع استعلامات المخزون دفعة واحدة Batch لمنع N+1، وتهدئة الـ Focus Refetch).

---

## خطة التنفيذ الموصى بها (Implementation Roadmap)

نوصي بتنفيذ التحديثات عبر **3 مراحل متتالية وآمنة تماماً على بيانات العميل**:

1. **المرحلة 1 — الأمان ومنع الكراش (Security & Crash-Proofing):**
   - إصلاح مفتاح الـ JWT في `src/lib/db/auth.ts` وحذف الـ fallback وجعله Lazy.
   - إنشاء `src/lib/subscription-check.ts` بكاش الـ 10 دقائق + إنشاء `src/middleware.ts` واستثناء `/api/version`.
   - قصر إضافة المستخدمين على حساب مطور النظام `OpenAppo` في `src/app/api/users/route.ts`.
   - إضافة الملفات الأربعة لمنع الشاشة البيضاء (`global-error.tsx`, `ErrorReporter.tsx`, `clientErrors.ts`, `/api/client-error/route.ts`).
   - إضافة `translate="no"` و`<meta name="google" content="notranslate" />` في `layout.tsx`.
2. **المرحلة 2 — السرعة والسايدبار الصاروخ (0ms Static Navigation):**
   - تحويل `RootLayout` و `DashboardLayout` إلى دوال متزامنة عادية (إزالة `async` و `force-dynamic`).
   - إنشاء `src/lib/profileCache.ts` وتحديث `Sidebar.tsx` ليعتمد على القراءة الفورية من الذاكرة.
   - إضافة فهارس الجداول في `prisma/schema.prisma` وتطبيقها بـ `prisma db push`.
3. **المرحلة 3 — ضبط الموبايل وتنظيف الداشبورد (UI/UX & Mobile):**
   - إزالة قفل الزووم (`maximumScale: 1` و `userScalable: false`) من `layout.tsx`.
   - تنظيف ازدواجية كروت الإحصائيات في صفحة الداشبورد.
4. **المرحلة 4 — الفحص والاختبار والرفع:**
   - تشغيل `npx tsc --noEmit` ثم `npm run build` للتأكد أن صفحات الواجهة أصبحت **`○ (Static)`**.
   - الرفع عبر `ops/deploy_watch.py "elnazlawy-system"` بعد إذن المالك.

---
**التقرير جاهز ومعتمد في فولدر المشروع. بانتظار موافقتكم للبدء في المرحلة 1 يا باشا.**
