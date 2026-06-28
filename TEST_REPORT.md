# تقرير اختبار موقع مازايا (Mazaya Furniture System)
**تاريخ الاختبار:** 28 يونيو 2026  
**الموقع:** https://mazaya.openappo.com  
**حالة الموقع:** 🟢 يعمل — متاح للجميع

---

## 📋 ملخص النتائج

| المنطقة | الحالة | ملاحظات |
|---|---|---|
| تسجيل الدخول | ✅ شغال | JWT + httpOnly Cookie |
| الـ Proxy/Middleware | ✅ شغال | يعيد توجيه غير المسجلين لصفحة الدخول |
| Dashboard (صفحة) | ✅ شغال | Charts + KPIs |
| الموردين (Suppliers) | ✅ شغال | List + Detail + Create (ولكن... انظر الأخطاء) |
| العملاء (Customers) | ✅ شغال | CRUD كامل |
| الفروع (Branches) | ✅ شغال | CRUD كامل |
| الطلبيات (Orders) | ⚠️ جزئي | List يعمل، Create + Detail لا يعملان |
| مخزون الألواح (Boards) | ✅ شغال | List + Detail |
| مخزون الاكسسوارات (Accessories) | ✅ شغال | List + Detail |
| اليومية (Journal) | ⚠️ جزئي | List يعمل، Create لا يعمل (خطأ في validation) |
| المقاولين (Contractors) | ⚠️ جزئي | List يعمل، Create لا يعمل |
| المصروفات (Overhead) | ✅ شغال | Create + List يعملان |
| التقارير (Reports) | ✅ شغال | 3 تقارير تعمل كاملة |
| Admin - Users | ❌ لا يعمل | List 404، فقط detail/[id] موجود |
| Admin - Material Types | ✅ شغال | Full CRUD |
| Audit Log | ❌ معطل | 500 Internal Server Error |
| تغيير كلمة السر | ✅ شغال | Validation + تغيير يعملان |
| تسجيل الخروج | ✅ شغال | مسح الـ cookie |

---

## 🔴 أخطاء حرجة (Critical Bugs)

### 1. إنشاء أوردر جديد → 500 Internal Server Error
- **المسار:** `POST /api/orders`
- **الخطأ:** `"new row for relation \"orders\" violates check constraint \"orders_order_type_check\""`
- **السبب:** الـ Prisma schema يرسل `order_type: "new"` ولكن قاعدة البيانات لديها CHECK CONSTRAINT لا تقبل `"new"` (أو العكس)
- **التأثير:** لا يمكن إضافة أي أوردر جديد — معطل تماماً

### 2. عرض تفاصيل الأوردر → 500 Internal Server Error
- **المسار:** `GET /api/orders/[id]`
- **الخطأ:** `"ERROR: operator does not exist: uuid = text"`
- **السبب:** استعلام `$queryRaw` يقارن UUID مع TEXT — `om.item_category = 'boards_inventory'` حيث `item_category` من نوع UUID في الداتابيز
- **التأثير:** لا يمكن فتح صفحة أي أوردر لعرض تفاصيله

### 3. عرض مواد الأوردر → 500 Internal Server Error
- **المسار:** `GET /api/orders/[id]/materials`
- **السبب:** نفس خطأ UUID = TEXT في الـ raw query
- **التأثير:** لا يمكن رؤية المواد المستخدمة في أي أوردر

### 4. عرض الأعمال الخارجية للأوردر → 500 Internal Server Error
- **المسار:** `GET /api/orders/[id]/external-work`
- **السبب:** نفس خطأ UUID = TEXT
- **التأثير:** لا يمكن رؤية الأعمال الخارجية للأوردر

### 5. إنشاء مقاول جديد → 500 Internal Server Error
- **المسار:** `POST /api/contractors`
- **الخطأ:** `"violates check constraint \"contractors_type_check\""`
- **السبب:** الـ Prisma يرسل `type: "أخرى"` ولكن CHECK CONSTRAINT في DB لا يقبل هذه القيمة
- **التأثير:** لا يمكن إضافة مقاولين جدد

### 6. قائمة المستخدمين (Admin) → 404 Not Found
- **المسار:** `GET /api/admin/users`
- **السبب:** **الملف مفقود:** `src/app/api/admin/users/route.ts` غير موجود! يوجد فقط `admin/users/[id]/route.ts`
- **التأثير:** لا يمكن للإدارة رؤية قائمة المستخدمين

### 7. سجل التدقيق (Audit Log) → 500 Internal Server Error
- **المسار:** `GET /api/audit-log`
- **السبب:** غير معروف بالضبط — الـ route موجود والـ Prisma model موجود
- **التأثير:** لا يمكن تتبع التغييرات في النظام

### 8. إنشاء قيد يومية → 400 Validation Error
- **المسار:** `POST /api/journal`
- **السبب:** `entry_type` المقبول في الكود هو `['purchase', 'incoming_from_branch', 'outgoing_to_supplier', 'transfer', 'overhead']` ولكن واجهة المستخدم ترسل قيماً عربية (مثل "قبض" أو "صرف")
- **التأثير:** لا يمكن إضافة قيود يومية من الواجهة

### 9. إنشاء مورد → 500 Internal Server Error
- **المسار:** `POST /api/suppliers`
- **الخطأ:** `"violates check constraint"`
- **السبب:** CHECK CONSTRAINT على `payment_type` أو حقول أخرى لا تتطابق مع القيم المرسلة من Prisma

---

## 🟡 أخطاء متوسطة (Moderate Issues)

### 10. خطأ في صيغة التاريخ لإنشاء الأوردر
- `start_date` يتوقع ISO-8601 DateTime كامل (`2026-06-28T00:00:00.000Z`) وليس مجرد تاريخ (`2026-06-28`)
- الحل: تحويل المدخلات من الـ frontend أو استخدام `new Date()` في الـ API

### 11. Dashboard → لا يوجد API endpoint
- **المسار:** `GET /api/dashboard` → 404
- الـ Dashboard يستخدم probably بيانات من APIs أخرى (orders, etc.)، لكن لا يوجد endpoint مخصص

### 12. خدمة الـ Service Worker لا تتعامل مع وضع Offline
- SW يفتقد صفحة `/offline` — عند فقدان الاتصال يعيد توجيه للصفحة الرئيسية
- لا يوجد Install Prompt مخصص لتثبيت التطبيق (PWA)

---

## 🔵 مشاكل UI/UX

### عام
- ✅ **تصميم RTL ممتاز** - يدعم العربية بالكامل
- ✅ **Cairo Font** - خط عربي جميل ومناسب
- ✅ **Responsive** - يعمل على الموبايل والتابلت
- ✅ **PWA Support** - يمكن تثبيته على الشاشة الرئيسية
- ✅ **Loading States** - يوجد شاشات تحميل (spinner)
- ✅ **Error Handling UI** - رسائل خطأ واضحة في login
- ✅ **Security Headers** - X-Frame-Options, nosniff, Referrer-Policy

### سلبيات UI

1. **❌ لا يوجد Bottom Navigation للموبايل** - الـ sidebar drawer وحده لا يكفي للاستخدام السريع
2. **❌ لا يوجد Dark Mode** - التصميم فاتح فقط، بدون وضع ليلي
3. **❌ لا يوجد تأكيد للحذف (Confirm Dialog) واضح** - بعض الأماكن قد تحذف دون تأكيد
4. **❌ البحث Client-side** - `rows.filter(...)` بطيء مع البيانات الكبيرة
5. **❌ الفلترة ليست Server-side** - كل البيانات تجلب ثم تصفى في المتصفح
6. **❌ لا يوجد إشعار عند فقدان الاتصال** - SW لا يخبر المستخدم بحالة Offline
7. **❌ الـ splash screen وقت التحميل الأولى** - شاشة بيضاء أثناء تحميل JS

### مشاكل Accessibility (WCAG)
8. **❌ checked contrast** - بعض الأزرار البرتقالية على خلفية بيضاء قد تكون أقل من 4.5:1
9. **❌ Focus indicators** - غير واضحة في بعض العناصر التفاعلية
10. **❌ alt text** - بعض الصور قد تفتقر إلى `alt` وصفي

---

## 🟢 الوظائف التي تعمل بكفاءة (Working Features)

| الوظيفة | الحالة |
|---|---|
| تسجيل الدخول (صحيح/خطأ) | ✅ Users + 401/400/200 |
| تغيير كلمة السر | ✅ مع التحقق من عدم تكرار القديمة |
| تسجيل الخروج | ✅ مسح الـ cookie و return 200 |
| قائمة الفروع | ✅ 4 فروع + إنشاء جديد (201) |
| قائمة الموردين | ✅ 7 موردين مع pagination |
| قائمة العملاء | ✅ مع branch_name |
| قائمة الأوردرات | ✅ 8 أوردرات مع pagination + فلترة |
| قائمة الألواح | ✅ مع أسماء الموردين |
| قائمة الاكسسوارات | ✅ مع أسماء الموردين |
| قائمة المقاولين | ✅ 3 مقاولين |
| قائمة اليومية | ✅ مع pagination |
| قائمة المصروفات | ✅ |
| إنشاء فرع جديد | ✅ 201 Created |
| إنشاء عميل جديد | ✅ 201 Created |
| إنشاء مصروفات | ✅ 201 Created |
| تعديل أوردر (PATCH) | ✅ 200 OK |
| تقارير المخزون | ✅ JSON كامل مع totals + breakdown |
| تقارير الأوردرات | ✅ 8 أوردرات + summary (إجمالي 205,410) |
| تقارير الأرباح/الخسائر | ✅ revenue 127,330 / costs 247,110 / loss -119,780 |
| أنواع المواد | ✅ 7 أنواع للألواح |
| Proxy Middleware | ✅ يعيد توجيه الصفحات المحمية |
| Health Check | ✅ `{"status":"healthy"}` |
| PWA Manifest | ✅ كامل مع 8 أيقونات |
| Security Headers | ✅ X-Frame-Options, X-Content-Type, Referrer-Policy |

---

## 📊 إحصائيات عامة من الـ APIs

| البيان | القيمة |
|---|---|
| إجمالي الأوردرات | 8 |
| إجمالي إيرادات الأوردرات | 205,410 |
| متوسط قيمة الأوردر | 25,676 |
| إجمالي قيمة المخزون (ألواح) | 521,000 |
| إجمالي قيمة المخزون (اكسسوارات) | 66,250 |
| إجمالي قيمة المخزون (الكل) | 587,250 |
| الإيرادات (تقارير) | 127,330 |
| التكاليف (تقارير) | 247,110 |
| صافي الربح/الخسارة | **خسارة -119,780** |
| الفروع | 4 (دمياط، القاهرة، الإسكندرية، الجيزة) |
| الموردين | 7 |
| المقاولين | 3 |
| أنواع الألواح | 7 |
| API Routes موجودة | 33/36 (3 مفقودة/معطلة) |

---

## 🏁 التوصيات (Recommendations)

### عاجل (أولوية قصوى)
1. **إصلاح إنشاء الأوردرات** — إما تحديث CHECK CONSTRAINT في DB أو تعديل Prisma schema
2. **إصلاح استعلامات تفاصيل الأوردر** — تصحيح نوع UUID = TEXT في raw queries
3. **إضافة ملف `admin/users/route.ts`** — قائمة المستخدمين مفقودة
4. **إصلاح إنشاء المقاولين** — تحديث CHECK CONSTRAINT للـ `type`/`specialty`
5. **إصلاح إنشاء الموردين** — CHECK CONSTRAINT على `payment_type`
6. **إصلاح إنشاء قيد اليومية** — محاذاة frontend entry_type مع backend validation

### مهم
7. **إضافة صفحة Offline** للـ PWA
8. **تحديث SQL schema ليتطابق مع Prisma** (أو العكس)
9. **إصلاح Audit Log** — 500 Internal Error
10. **إضافة Dashboard API endpoint** أو استخدام موجود

### تحسيني
11. **إضافة Bottom Navigation للموبايل**
12. **تحسين البحث ليكون Server-side**
13. **إضافة Dark Mode**
14. **تحسين تباين الألوان**
15. **إضافة تأكيد للحذف**
16. **إضافة إشعارات Offline للمستخدم**

---

## ✅ الخلاصة

النظام **قيد التشغيل** و **صفحات العرض تعمل** بشكل جيد، لكن **عمليات الإنشاء (CREATE) معطلة** في 4 APIs رئيسية (Orders, Suppliers, Contractors, Journal) بسبب عدم تطابق CHECK CONSTRAINTS بين Prisma schema وقاعدة البيانات الفعلية. بالإضافة إلى وجود ملف مفقود (Admin Users List) و 500 Internal Error في Audit Log و Order Details.

**التقييم العام: 70% من الوظائف تعمل — 30% معطلة بسبب مشاكل Backend.**

التركيز على إصلاح CHECK CONSTRAINTS وحل مشكلة UUID = TEXT في الـ raw queries سيحل 80% من المشاكل الحالية.
