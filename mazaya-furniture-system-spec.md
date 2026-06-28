# مواصفات نظام إدارة مصنع مزايا للأثاث (Mazaya Furniture - Factory Management System)

> هذا الملف مُعد ليكون مرجع كامل (Spec/PRD) لبناء وتحديث تطبيق ويب (PWA) لمصنع مزايا للأثاث - دمياط.
> اللغة: عربي RTL بالكامل. الواجهة يجب أن تعمل على الكمبيوتر والموبايل (Android/iOS) كـ PWA قابلة للتركيب.
> 🗣️ **Communication**: All AI/developer responses regarding this spec must be in **English**. The UI itself is Arabic RTL, but communication about the project is English.

---

## 0. حالة الوثيقة وقواعد التحديث (Document Status)

| البند | التفاصيل |
|---|---|
| **الإصدار (Version)** | v1.1 |
| **آخر تحديث** | 2026-06-28 |
| **المالك (Owner)** | Mohamed Marzouk (momarzouk1998) |
| **قواعد التحديث** | أي تغيير في سلوك صفحة، حقل جديد، أو منطق عمل يجب تحديث هذا الملف في نفس الـ PR. الـ Spec هو مصدر الحقيقة (single source of truth). |
| **خارج النطاق (Out of Scope)** | تطبيق موبايل Native، تعدد عملات، فواتير ضريبية/إلكترونية (e-Invoice)، تكامل بنوك/API بنكية، POS لمعرض، نظام محاسبي متكامل، تعدد مستودعات، إدارة موارد بشرية HR. |

---

## 1. نظرة عامة على المشروع (Overview)

**العميل:** مصنع مزايا للأثاث (Mazaya Furniture) - دمياط
**النشاط:** المصنع لا يبيع خامات، بل **يصنّع/يجمّع** موبيليا (غرف نوم وغيرها) من:
- **ألواح (Boards)** - خامات خشبية بأنواع وأكواد مختلفة، تُستورد من **7 شركات توريد**.
- **اكسسوارات (Accessories)** - مفصلات، سكك دُرج، مجاري دُرج، كاوتش، إلخ.

**سلسلة العمل (Workflow):**
1. المصنع يشتري ألواح واكسسوارات من 7 موردين (كل مورد له ~80 كود خاص به).
2. الخامات تدخل **المخزن**.
3. عند بدء **أوردر** (مثلاً "أوضة نوم محمد")، تُسجَّل الكميات المستخدمة من المخزن لهذا الأوردر، فيُخصم المتبقي تلقائياً من المخزون العام.
4. يُحسب **إجمالي تكلفة الأوردر** (خامات + تركيبات + نقل + عمولة المصنع).
5. الأوردر يُسلَّم لأحد **4 معارض (فروع)** تتعامل مع العميل النهائي وتبيعه.
6. المعرض يحوّل للمصنع (أو للموردين مباشرة نيابة عن المصنع) القيمة المطلوبة - تُسجَّل هذه الحركات في **اليومية المالية**.
7. مصاريف تشغيل عامة (كهرباء، أجور عمال...) تُسجَّل كـ **نثريات** ويتم توزيعها على عمولة المصنع لكل أوردر بشكل يدوي.

**الهوية البصرية:** الشعار (Mazaya Furniture) - تصميم Monoline بالأسود والبرتقالي. يُستخدم في الواجهة وأيقونة PWA.

**جمهور المستخدمين (Personas):**
- **محمد / المدير العام (Admin)**: يدير كل شيء، يحتاج رؤية شاملة + تقارير + إدارة مستخدمين.
- **موظف معرض (Branch User)**: يرى فقط بيانات معرضه، يدخل أوردرات، يسجل مدفوعات واردة، لا يرى بيانات المعارض الأخرى أو النثريات.
- **محمد (المالك) عند إدخال الأكواد الأولية**: يستورد ~560 كود من ملف Excel مرة واحدة عند الإعداد.

---

## 2. المتطلبات العامة (Global Requirements - تنطبق على كل صفحات النظام)

| المتطلب | التفاصيل |
|---|---|
| **بحث Search** | كل صفحة قوائم/جداول لازم فيها مربع بحث (بالاسم، الكود، البيان...) |
| **فلاتر Filters** | فلترة بالتاريخ (من-إلى)، الشركة/المورد، النوع/الخامة، المعرض، الحالة، الأوردر |
| **ترقيم الصفحات Pagination** | كل قائمة تدعم التقسيم إلى صفحات (مثلاً 20-50 سجل لكل صفحة) مع أزرار التنقل (التالي/السابق) لتخفيف تحميل البيانات دفعة واحدة — خاصة مع كثرة الأكواد (~560 كود) |
| **تصدير Excel** | زر "تحميل Excel" في كل جدول، يصدّر النتائج المعروضة (بعد البحث/الفلترة). اسم الملف: `<page>_<YYYY-MM-DD>.xlsx` |
| **استيراد Excel** | في صفحات المخزون: إمكانية رفع ملف Excel لاستيراد بيانات الأكواد الحالية دفعة واحدة (محمد عنده ~560 كود حالياً: 7 شركات × 80 كود). يُمنع تكرار (supplier_id, code) — الصف المكرر يُسجَّل في ملف أخطاء للتنزيل. |
| **RTL عربي** | الاتجاه RTL، خط عربي واضح (Cairo / Tajawal أو مشابه) |
| **PWA** | Manifest + Service Worker، قابل للتركيب "Add to Home Screen" على أندرويد وآيفون، يعمل بسلاسة على شاشات الموبايل |
| **Responsive** | تصميم متجاوب: موبايل أولاً، ثم ديسكتوب - **تصميم عصري وحديث يليق بتطبيق احترافي وليس مجرد نظام إدارة عادي**. Breakpoints: `< 640px` موبايل، `640-1024px` تابلت، `> 1024px` ديسكتوب. |
| **حسابات تلقائية** | كل القيم الإجمالية (الإجمالي، المتبقي، التكاليف...) تُحسب تلقائياً ولا تُكتب يدوياً |
| **سرعة وبساطة** | الهدف الأساسي للعميل: "تدخل تسجل البيانات وتريح دماغك، والنظام يخصم ويجمع ويطرح من نفسه" |
| **مساعدة (Help Icons)** | **هام جداً**: كل صفحة (بما في ذلك التفاصيل، النماذج، والتقارير) تحتوي على أيقونة علامة استفهام (؟) في الزاوية العلوية تشرح وظيفة الصفحة بالضبط وما الذي يفعله المستخدم هنا. Tooltip سهل الفهم باللغة العربية يتم تمريره عبر مكون `PageHeader` كـ `helpTitle` و `helpDescription` (أو استخدام `PageHelp`). |
| **تنسيق الأرقام والعملة** | جميع المبالغ بصيغة `#,##0.00 ج.م` (فاصلة آلاف، رقمين عشري، علامة العملة بعد الرقم). الأرقام العشرية (الكمية) بصيغة `#,##0.##` بدون عملة. التاريخ `YYYY-MM-DD` في الـ DB، `DD/MM/YYYY` في الواجهة. |
| **حالات فارغة (Empty States)** | كل قائمة/جدول بدون بيانات يعرض رسالة واضحة ورسمة توضيحية + زر إجراء رئيسي (مثلاً "لا يوجد موردين بعد — أضف أول مورد"). |
| **حالات التحميل والخطأ** | كل قائمة تظهر Skeleton loader أثناء التحميل. أخطاء الـ API تظهر كـ Toast أحمر في الأعلى مع رسالة عربية واضحة + زر "إعادة المحاولة". |
| **التأكيد على الحذف** | أي عملية حذف تتطلب نافذة تأكيد (Modal) تذكر اسم السجل وتطلب كتابة "تأكيد" أو الضغط على زر واضح. الحذف الفعلي (Hard Delete) **ممنوع** — يُستخدم Soft Delete عبر `deleted_at TIMESTAMPTZ` (nullable). |
| **سجل التدقيق (Audit Log)** | جدول `audit_log` يسجل: `user_id, action (create/update/delete), table_name, row_id, before_json, after_json, created_at`. يُعرض في صفحة "سجل النشاط" داخل الإدارة (للمدير فقط). |

---

## 3. خريطة الموديولات (Modules Map)

1. لوحة التحكم (Dashboard)
2. الموردين (Suppliers)
3. مخزون الألواح (Boards Inventory)
4. مخزون الاكسسوارات (Accessories Inventory)
5. المعارض / الفروع (Showroom Branches)
6. العملاء (Customers)
7. الأوردرات (Orders) - **القلب الأساسي للنظام**
8. اليومية المالية (Daily Financial Journal)
9. النثريات (Overhead Expenses)
10. المقاولين الخارجيين - ألوميتال/تنجيد (External Contractors)
11. التقارير (Reports)
12. المستخدمين والصلاحيات (Users & Roles)
13. سجل النشاط (Audit Log) — للمدير فقط
14. الإعدادات (Settings) — لأنواع الخامات والفئات

**مسارات الـ App Router:**

| المسار | الوحدة | ملاحظات |
|---|---|---|
| `/login` | تسجيل الدخول | عام |
| `/dashboard` | لوحة التحكم | |
| `/suppliers` + `/suppliers/[id]` + `/suppliers/new` | الموردين | |
| `/boards` + `/boards/[id]` + `/boards/new` + `/boards/import` | مخزون الألواح | |
| `/accessories` + `/accessories/[id]` + `/accessories/new` + `/accessories/import` | مخزون الاكسسوارات | |
| `/branches` + `/branches/[id]` | المعارض | |
| `/customers` + `/customers/[id]` + `/customers/new` | العملاء | |
| `/orders` + `/orders/[id]` + `/orders/new` | الأوردرات | |
| `/journal` + `/journal/new` | اليومية | |
| `/overhead` + `/overhead/new` | النثريات | |
| `/contractors` + `/contractors/[id]` | المقاولين | |
| `/reports` | التقارير | |
| `/admin/users` | المستخدمين | admin only |
| `/admin/audit` | سجل النشاط | admin only |
| `/settings/material-types` | الإعدادات | admin only |

**API Routes (Next.js Route Handlers):**

| المسار | الأفعال |
|---|---|
| `POST /api/auth/login` | تسجيل دخول |
| `POST /api/auth/logout` | تسجيل خروج |
| `GET /api/auth/user` | المستخدم الحالي + صلاحياته |
| `GET/POST /api/suppliers` | قائمة + إنشاء |
| `GET/PATCH/DELETE /api/suppliers/[id]` | تفاصيل + تعديل + حذف |
| `GET/POST /api/boards` | قائمة + إنشاء |
| `GET/PATCH/DELETE /api/boards/[id]` | تفاصيل + تعديل + حذف |
| `POST /api/boards/import` | استيراد Excel |
| `GET /api/boards/export` | تصدير Excel |
| `GET/POST /api/accessories` | نفس النمط للأكسسوارات |
| `GET/POST /api/branches` + `[id]` | المعارض |
| `GET/POST /api/customers` + `[id]` | العملاء |
| `GET/POST /api/orders` + `[id]` | الأوردرات |
| `POST /api/orders/[id]/materials` | إضافة/تعديل مواد |
| `GET/POST /api/journal` + `[id]` | اليومية |
| `GET/POST /api/overhead` + `[id]` | النثريات |
| `GET/POST /api/contractors` + `[id]` | المقاولين |
| `GET /api/reports/[type]` | التقارير (inventory/orders/journal/suppliers/overhead) |
| `GET/POST/PATCH/DELETE /api/admin/users` + `[id]` | إدارة المستخدمين |
| `GET /api/admin/audit` | سجل النشاط |
| `GET /api/settings/material-types` | أنواع الخامات |

**صيغة الاستجابة المعيارية (API Response Envelope):**
```ts
// نجاح
{ ok: true,  data: T, meta?: { page, perPage, total } }
// فشل
{ ok: false, error: { code: string, message: string, details?: any } }
```
أكواد الأخطاء الشائعة: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INSUFFICIENT_STOCK`, `INTERNAL_ERROR`.

---

## 4. لوحة التحكم (Dashboard)

عند تسجيل الدخول، يظهر للمصنع (Admin) واجهة **حديثة وجذابة** مع رسوميات هندسية قوية:

### 4.1 لـ Admin (المدير)
- **بطاقات معلومات متقدمة (Advanced Cards)** بتصاميم حديثة:
  - بطاقة قيمة المخزون الحالية: تعرض رقم إجمالي كبير (مثل "المتبقى: 597,461 ج.م") مع تدرج لوني جميل وأيقونة مستودع أنيقة
  - بطاقة الأوردرات المفتوحة: عدد الأوردرات النشطة مع مؤشر تقدم بصري (Progress Ring)
  - بطاقة الأوردرات المكتملة هذا الشهر: عداد ديناميكي
  - بطاقة الرصيد الحالي: عرض الرصيد المتبقي في الخزينة بشكل واضح وملفت

### 4.2 الرسوميات البيانية (Charts) - Admin فقط
- **رسم بياني عمودي (Bar Chart)**: ملخص اليومية الأسبوعي (السبت → الجمعة) يعرض:
  - الوارد (Income) - لون أخضر
  - المصروف (Expenses) - لون برتقالي/أحمر
  - الصافي (Net) - لون أزرق
- **رسم بياني دائري (Pie Chart)**: توزيع الأوردرات حسب الحالة (مفتوح/قيد التنفيذ/مكتمل)
- **رسم بياني خطي (Line Chart)**: اتجاه قيمة المخزون عبر آخر 30 يوم (صعود/هبوط)
- **Heat Map اختياري**: توزيع الأوردرات حسب المعرض أو أكثر 10 عملاء نشاطاً

### 4.3 لـ Branch User (موظف معرض)
- يرى فقط بيانات معرضه المُعيَّن (`branch_id`):
  - عدد أوردرات المعرض (مفتوحة / مكتملة هذا الشهر)
  - إجمالي المدفوعات الواردة للمعرض هذا الشهر
  - آخر 5 حركات يومية للمعرض فقط
  - زر سريع لإنشاء أوردر جديد

### 4.4 الأقسام الأخرى (مشتركة)
- **آخر 5 حركات** في اليومية (مع أيقونات ملونة حسب نوع الحركة):
  - 🟢 مشتريات (Income) - أخضر
  - 🔴 دفعات (Expenses) - أحمر
  - 🟠 تحويلات (Transfers) - برتقالي
- **اختصارات سريعة (Action Buttons)** بتصميم حديث:
  - "+ أوردر جديد" (زر أساسي برتقالي)
  - "+ حركة يومية" (زر ثانوي)
  - "+ شراء جديد" (زر ثانوي)
- **ملخص إحصائي سريع في أعلى الصفحة**:
  - عدد الموردين النشطين، عدد المعارض، عدد الأوردرات، قيمة المشتريات هذا الشهر

> 💡 **ملاحظة التصميم**: استخدم تدرجات لونية ناعمة (Gradients)، مسافات بيضاء كافية (Whitespace)، ظلال دقيقة (Shadows)، وتأثيرات Hover لجعل الواجهة احترافية وسلسة.

---

## 5. الموردين (Suppliers Module)

### 5.1 نموذج البيانات (Data Model)

| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| اسم الشركة | `name` | VARCHAR(200) | مطلوب |
| نوع التعامل | `payment_type` | VARCHAR(20) | نقدي / تحويل / كلاهما — default: `both` |
| رقم التواصل | `phone` | VARCHAR(50) | اختياري |
| ملاحظات | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | تلقائي |
| تاريخ الحذف | `deleted_at` | TIMESTAMPTZ | Soft Delete |

### 5.2 الصفحات
- **قائمة الموردين** (`/suppliers`): بحث بالاسم، فلتر بنوع التعامل. أعمدة إضافية تلقائية: عدد الأكواد المسجلة لهذا المورد (ألواح + اكسسوارات)، إجمالي المشتريات منه (من اليومية)، إجمالي المدفوعات له.
- **صفحة تفاصيل المورد** (`/suppliers/[id]`): كل الأكواد/الأصناف المسجلة من عنده (ألواح + اكسسوارات)، سجل المشتريات، سجل المدفوعات له (من اليومية)، الإجمالي المستحق/المدفوع.
- **نموذج إضافة/تعديل** (Modal أو صفحة): الحقول أعلاه + Validation.

---

## 6. مخزون الألواح (Boards Inventory Module)

### 6.1 نموذج البيانات (Data Model) - جدول `boards_inventory`

| الحقل (Arabic Label) | اسم الحقل (Field) | النوع | ملاحظات |
|---|---|---|---|
| ت (الرقم التسلسلي) | `id` | SERIAL | تلقائي |
| البيان (اسم الصنف) | `item_name` | VARCHAR(300) | مثال: "لوح ١٨مل بيروديوم ٧٦٢٩×٦٠٠٤" |
| خامة / النوع | `material_type` | VARCHAR(100) | اختيار من `material_types` (قائمة قابلة للتعديل) |
| الكود | `code` | VARCHAR(100) | **فريد لكل (مورد + كود)** |
| الشركة (المورد) | `supplier_id` | INT FK → suppliers | |
| السعر | `unit_price` | NUMERIC(12,2) | سعر الوحدة وقت الشراء |
| عدد (الكمية الداخلة) | `quantity_in` | NUMERIC(12,2) | |
| الإجمالي | `total_price` | NUMERIC(14,2) GENERATED | `unit_price × quantity_in` |
| تاريخ | `date_added` | DATE | default CURRENT_DATE |
| اوردر (الأوردر المرتبط أصلاً) | `linked_order_id` | INT FK → orders | اختياري |
| تم استخدام | `quantity_used` | NUMERIC(12,2) | يُحدَّث عبر `order_materials` |
| المتبقي | `quantity_remaining` | NUMERIC(12,2) GENERATED | `quantity_in - quantity_used` |
| سعر المستخدم | `used_price` | NUMERIC(12,2) | مرجعي — السعر وقت الاستخدام |
| ملاحظات | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |
| تاريخ التعديل | `updated_at` | TIMESTAMPTZ | |
| تاريخ الحذف | `deleted_at` | TIMESTAMPTZ | Soft Delete |

**القيود:**
- `UNIQUE (supplier_id, code, deleted_at IS NULL)` — منع تكرار الكود لنفس المورد ما لم يُحذف.
- `CHECK (quantity_remaining >= 0)` — منع السالب.

### 6.2 منطق العمل (Business Logic)
1. **عند تسجيل شراء جديد**: يتم إدخال كود الصنف والمورد والسعر والكمية.
2. **المتبقي = عدد - تم استخدام**، ويُحدَّث تلقائياً عند استخدام الصنف في أوردر.
3. المتبقي متاح للاستخدام في أي أوردر، حتى لو الشراء تم لصالح أوردر معين.
4. عند تسجيل `order_materials` بكميات صنف ما، يتم **تحديث `quantity_used` تلقائياً** عبر trigger أو transaction.
5. **حماية من الإفراط في الخصم**: عند محاولة إضافة مادة للأوردر بكمية أكبر من المتبقي، الـ API يرجع `INSUFFICIENT_STOCK` مع تفاصيل.

### 6.3 الصفحات
- **قائمة المخزون** (`/boards`): بحث بالاسم/الكود، فلتر بـ(المورد، الخامة، نطاق تاريخ، "متوفر فقط"). ترتيب بأي عمود.
- **صفحة تفاصيل صنف** (`/boards/[id]`): كل البيانات + سجل الاستخدام في أوردرات + سجل التعديلات.
- **نموذج إضافة/تعديل** (`/boards/new` + Modal تعديل).
- **استيراد Excel** (`/boards/import`): رفع ملف، معاينة البيانات، تأكيد. يدعم أعمدة: `item_name, material_type, code, supplier_name, unit_price, quantity_in, date_added, notes`. ينشئ الموردين تلقائياً لو غير موجودين.
- **سجل حركة الصنف**: داخل صفحة التفاصيل، timeline لكل تعديل على الكمية/الاستخدام.

---

## 7. مخزون الاكسسوارات (Accessories Inventory Module)

نفس بنية جدول الألواح (`accessories_inventory`) بنفس الحقول ومنطق العمل.

**الفروقات:**
- `material_types.category = 'accessory'` (بدل `'board'`)
- المسارات تبدأ بـ `/accessories` بدل `/boards`.

---

## 8. المعارض / الفروع (Showroom Branches Module)

### 8.1 نموذج البيانات - جدول `branches`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| اسم المعرض | `name` | VARCHAR(200) | يوجد 4 معارض حالياً - يتم إدخالهم كبيانات أولية (Seed) |
| الموقع | `location` | VARCHAR(300) | |
| هاتف | `phone` | VARCHAR(50) | |
| ملاحظات | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |

### 8.2 الصفحات
- **قائمة المعارض** (`/branches`): بطاقات (Cards) لـ 4 فروع، كل بطاقة تعرض: اسم المعرض، عدد العملاء، عدد الأوردرات (مفتوحة/مكتملة)، إجمالي المدفوعات الواردة.
- **صفحة تفاصيل المعرض** (`/branches/[id]`): عملاء هذا المعرض، أوردراته، إجمالي المدفوعات الواردة منه (من اليومية)، آخر 10 حركات يومية.

---

## 9. العملاء (Customers Module)

### 9.1 نموذج البيانات - جدول `customers`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| اسم العميل | `name` | VARCHAR(200) | مطلوب |
| المعرض التابع له | `branch_id` | INT FK → branches | |
| هاتف | `phone` | VARCHAR(50) | اختياري |
| عنوان | `address` | TEXT | اختياري |
| ملاحظات | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |
| تاريخ الحذف | `deleted_at` | TIMESTAMPTZ | Soft Delete |

### 9.2 الصفحات
- **قائمة العملاء** (`/customers`): بحث بالاسم، فلتر بالمعرض. عمود إضافي: عدد الأوردرات الكلي.
- **صفحة ملف العميل** (`/customers/[id]`): تعرض **كل الأوردرات** المرتبطة بهذا العميل (الأوردر الأصلي + أوردرات الصيانة اللاحقة) بترتيب زمني (الأحدث أولاً)، إجمالي ما أنفقه العميل.
- **نموذج إضافة/تعديل**.

---

## 10. الأوردرات (Orders Module)

### 10.1 بيانات الأوردر الرئيسية (Header) - جدول `orders`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| اسم الأوردر | `order_name` | VARCHAR(200) | مثال: "أوضة نوم محمد" |
| العميل | `customer_id` | INT FK → customers | |
| المعرض | `branch_id` | INT FK → branches | يُجلب تلقائياً من العميل، قابل للتعديل |
| نوع الأوردر | `order_type` | ENUM('new','maintenance') | تصنيع جديد / صيانة |
| الأوردر الأصلي (لو صيانة) | `parent_order_id` | INT FK → orders | يظهر فقط لو `order_type = 'maintenance'` |
| تاريخ البدء | `start_date` | DATE | |
| تاريخ الانتهاء | `end_date` | DATE | |
| **مدة التنفيذ (أيام)** | `duration_days` | INT GENERATED | `end_date - start_date` (NULL لو لم ينتهِ) |
| الحالة | `status` | ENUM('open','in_progress','completed','delivered') | مفتوح / قيد التنفيذ / مكتمل / تم التسليم |
| تركيبات | `installation_cost` | NUMERIC(12,2) | يدوي |
| نقل داخلي | `internal_transport_cost` | NUMERIC(12,2) | يدوي — نقل بين الورش والمصنع |
| نقل خارجي | `external_transport_cost` | NUMERIC(12,2) | يدوي — لتسليم العميل |
| عمولة المصنع | `factory_commission` | NUMERIC(12,2) | يدوي |
| ملاحظات عامة | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |
| تاريخ التعديل | `updated_at` | TIMESTAMPTZ | |
| تاريخ الحذف | `deleted_at` | TIMESTAMPTZ | Soft Delete |

### 10.2 المواد المستخدمة (Order Materials) - جدول `order_materials`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| الأوردر | `order_id` | INT FK → orders (CASCADE) | |
| نوع المخزن | `inventory_table` | VARCHAR(20) | `'boards_inventory'` أو `'accessories_inventory'` |
| الصنف | `item_id` | INT | مرجع غير مفروض (لأن الصنف قد يُحذف soft) |
| الكمية المستخدمة | `quantity_used` | NUMERIC(12,2) | |
| السعر وقت الاستخدام | `unit_price_snapshot` | NUMERIC(12,2) | يُؤخذ من سعر الصنف وقت الإضافة |
| الإجمالي | `line_total` | NUMERIC(14,2) GENERATED | `quantity_used × unit_price_snapshot` |
| تاريخ الإضافة | `created_at` | TIMESTAMPTZ | |

**منطق التحديث:** عند إضافة صف في `order_materials`، يتم في نفس الـ transaction زيادة `quantity_used` على الصنف المصدر. عند الحذف، يتم إنقاصها. هذا يضمن أن `quantity_remaining` في المخزون دائماً صحيح.

### 10.3 بنود تكلفة الأوردر (Cost Breakdown)
- تكاليف الألواح: `boards_cost` = SUM من `order_materials` حيث `inventory_table='boards_inventory'`
- تكاليف الاكسسوارات: `accessories_cost` = SUM من `order_materials` حيث `inventory_table='accessories_inventory'`
- بنود يدوية: `installation_cost`, `internal_transport_cost`, `external_transport_cost`, `factory_commission`
- **الإجمالي الكلي** `order_total` = SUM(كل البنود أعلاه) — يُعرض ولا يُخزن (محسوب عبر `v_order_totals` view).

> 📌 المعرض يُفترض أن يُحوّل للمصنع قيمة `order_total` كاملة. النظام يتتبع المدفوعات الواردة من المعرض في اليومية المالية (`journal_entries.entry_type='incoming_from_branch'`).

### 10.4 الأعمال الخارجية (اختياري) - جدول `order_external_work`
للتتبع فقط للمقاولين الخارجيين ولا تدخل ضمن الإجمالي الكلي.
| الحقل | النوع | ملاحظات |
|---|---|---|
| `order_id` | FK → orders | |
| `contractor_id` | FK → contractors | |
| `description` | VARCHAR(300) | وصف العمل |
| `cost` | NUMERIC(12,2) | التكلفة |
| `notes` | TEXT | |

### 10.5 الصفحات
- **قائمة الأوردرات** (`/orders`): بحث، فلتر (بالمعرض، الحالة، النوع، التاريخ). عمود: الحالة (Badge ملون)، التاريخ، العميل، الإجمالي.
- **إنشاء/تعديل أوردر** (`/orders/new` + `/orders/[id]/edit`): 3 تابات:
  1. **البيانات الأساسية**: الحقول أعلاه.
  2. **المواد المستخدمة**: جدول ديناميكي، اختيار الصنف (Combobox يبحث في المخزون)، الكمية، السعر تلقائي.
  3. **التكاليف والأعمال الخارجية**: الحقول اليدوية + جدول الأعمال الخارجية.
- **عرض/ملخص الأوردر** (`/orders/[id]`): 
  - ملخص Header.
  - جدول المواد مع الإجماليات الفرعية.
  - جدول التكاليف.
  - جدول الأعمال الخارجية.
  - **زر "طباعة الفاتورة"** (Print Invoice) — قالب طباعة نظيف (A4) عربي RTL يشمل بيانات المصنع والعميل والأوردر.
  - **زر "إنشاء دفعة يومية"** ينشئ `journal_entries` مرتبط بالأوردر تلقائياً.

---

## 11. اليومية المالية (Daily Financial Journal)

### 11.1 جدول `journal_entries`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| التاريخ | `date` | DATE | |
| نوع الحركة | `entry_type` | ENUM('purchase','incoming_from_branch','outgoing_to_supplier','transfer','overhead') | |
| البيان | `description` | VARCHAR(500) | |
| المبلغ | `amount` | NUMERIC(14,2) | |
| طريقة الدفع | `payment_method` | ENUM('cash','transfer') | |
| نوع الجهة | `party_type` | VARCHAR(20) | `'supplier'` / `'branch'` / `'contractor'` / NULL |
| معرّف الجهة | `party_id` | INT | مرجع غير مفروض (soft FK) |
| الأوردر المرتبط | `order_id` | INT FK → orders | اختياري |
| المُنشئ | `created_by` | INT FK → mazaya_users | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |

**أنواع الحركات بالتفصيل:**
- `purchase`: شراء خامات (وارد سلع = مصروف). الـ `party_type='supplier'`.
- `incoming_from_branch`: دفعة واردة من معرض. الـ `party_type='branch'`.
- `outgoing_to_supplier`: دفعة صادرة لمورد (سداد مستحقات). الـ `party_type='supplier'`.
- `transfer`: تحويل بين حسابات (داخلي/خارجي).
- `overhead`: نثريات (مصاريف تشغيل). الـ `party_type=NULL`. مرتبط بـ `overhead_expenses`.

### 11.2 الملخص اليومي/الأسبوعي (صفحة `/journal`)
صندوق ملخص أعلى الصفحة (KPIs Cards):
- **الرصيد**: إجمالي الوارد التراكمي (من تاريخ بداية النظام أو نطاق الفلتر).
- **المصروف**: إجمالي المصروف التراكمي.
- **الباقي**: `الرصيد - المصروف`.
- **صافي هذا الأسبوع**: مجموع اليوم الحالي حتى 7 أيام للخلف.

أسفلها: جدول الحركات مع بحث وفلتر (نوع الحركة، التاريخ، المورد، المعرض). كل صف يفتح Drawer للتفاصيل + Edit.

---

## 12. النثريات (Overhead Expenses)

### 12.1 جدول `overhead_expenses`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| التاريخ | `date` | DATE | |
| الفئة | `category` | VARCHAR(100) | كهرباء / أجور / إيجار / صيانة / أخرى |
| البيان | `description` | VARCHAR(500) | |
| المبلغ | `amount` | NUMERIC(12,2) | |
| طريقة الدفع | `payment_method` | ENUM('cash','transfer') | |
| ملاحظات | `notes` | TEXT | |
| حركة اليومية المرتبطة | `journal_entry_id` | INT FK → journal_entries | تُنشأ تلقائياً عند إضافة نثرة |
| المُنشئ | `created_by` | INT FK → mazaya_users | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |

**منطق:** عند إضافة نثرة، النظام تلقائياً ينشئ صف في `journal_entries` بـ `entry_type='overhead'` ويربطه. الحذف يحذف الصفين معاً (transaction).

### 12.2 الصفحات
- **قائمة النثريات** (`/overhead`): جدول مع فلاتر (الفئة، التاريخ). عمود إضافي: مرتبط بحركة يومية (✓).
- **نموذج إضافة/تعديل**.
- **تقرير شهري** داخل الصفحة: مجموع النثريات شهرياً مع رسم بياني عمودي.

> ⚠️ **توزيع النثريات**: المواصفات تنص على أن النثريات **تُوزع يدوياً** على عمولة المصنع لكل أوردر. هذا يحدث داخل صفحة تعديل الأوردر — لا يوجد منطق توزيع آلي.

---

## 13. المقاولين الخارجيين (External Contractors)

### 13.1 جدول `contractors`
| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| اسم المقاول | `name` | VARCHAR(200) | |
| التخصص | `specialty` | VARCHAR(200) | ألوميتال / تنجيد / دهان / أخرى |
| هاتف | `phone` | VARCHAR(50) | |
| ملاحظات | `notes` | TEXT | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |

### 13.2 الصفحات
- **قائمة المقاولين** (`/contractors`): بطاقات مع التخصص وعدد الأعمال.
- **صفحة تفاصيل** (`/contractors/[id]`): معلوماته + كل الأعمال الخارجية اللي عملها (من `order_external_work`).
- **نموذج إضافة/تعديل**.

---

## 14. التقارير (Reports)

### 14.1 صفحة `/reports` (موحدة، فلاتر مشتركة)
- فلاتر علوية: نطاق التاريخ (من-إلى)، المعرض، المورد.
- تابات:

#### 14.1.1 تقرير المخزون
- قيمة المخزون الحالية (ألواح + اكسسوارات).
- جدول تفصيلي بكل صنف: الكمية المتبقية × سعر الوحدة = القيمة.
- إجمالي قيمة المخزون في الأسفل.

#### 14.1.2 تقرير الأوردرات
- جدول بكل أوردر في النطاق: الاسم، العميل، المعرض، التاريخ، التكاليف الفرعية، الإجمالي، الحالة.
- إجمالي عدد الأوردرات + متوسط قيمة الأوردر.
- رسم بياني: توزيع التكاليف (ألواح/اكسسوارات/تركيبات/نقل/عمولة).

#### 14.1.3 تقرير اليومية (التدفق النقدي)
- مجموع الوارد والمصروف يومياً في النطاق.
- رسم بياني خطي للـ Cash Flow (الوارد - المصروف تراكمياً).
- جدول تفصيلي.

#### 14.1.4 تقرير الموردين
- جدول بالموردين: عدد الأكواد، إجمالي المشتريات، إجمالي المدفوعات، المستحق.
- ترتيب تنازلي بالمستحق.

#### 14.1.5 تقرير النثريات
- مجموع النثريات في النطاق.
- توزيع بالفئة (Pie Chart).
- جدول تفصيلي.

### 14.2 كل التقارير
- قابلة للتصدير Excel (النتائج المعروضة بعد الفلترة).
- قابلة للطباعة (Print) في صيغة A4.

---

## 15. المستخدمون والصلاحيات (Users & Roles)

### 15.1 نموذج البيانات - جدول `mazaya_users`

تم تعديل نموذج البيانات ليعتمد بالكامل على قاعدة البيانات المحلية PostgreSQL دون الاعتماد على Supabase Auth.

| الحقل | اسم الحقل | النوع | ملاحظات |
|---|---|---|---|
| معرّف المستخدم | `id` | SERIAL | المفتاح الأساسي |
| اسم المستخدم | `username` | VARCHAR(100) UNIQUE | **فريد** - لا يتكرر |
| الاسم الكامل | `full_name` | VARCHAR(200) | للعرض في الواجهة |
| كلمة السر | `password_hash` | VARCHAR(255) | **مشفّرة بـ bcrypt (cost=10)** |
| الدور | `role` | ENUM('admin','branch_user') | |
| المعرض المرتبط | `branch_id` | INT FK → branches (nullable) | يظهر فقط لو `role = branch_user` |
| الصفحات المرئية | `visible_modules` | TEXT[] | قائمة أسماء الصفحات المرئية |
| الصلاحيات الدقيقة | `permissions` | JSONB | تحديد دقيق للإجراءات |
| حالة الحساب | `is_active` | BOOLEAN | تفعيل/تعطيل المستخدم |
| آخر دخول | `last_login_at` | TIMESTAMPTZ | |
| تاريخ الإنشاء | `created_at` | TIMESTAMPTZ | |
| تاريخ التعديل | `updated_at` | TIMESTAMPTZ | |

> **المصادقة (Auth)**: **Custom JWT** عبر `jose` (HS256) في `lib/db/auth.ts`. الـ token يُخزن كـ `httpOnly` + `Secure` + `SameSite=Lax` cookie اسمه `mazaya_session`، صلاحية 7 أيام. لا يوجد Supabase Auth.

### 15.2 جدول الصلاحيات والإجراءات المدعومة (Permissions Map)

| الصفحة (Module) | view | add | edit | delete | print | export |
|---|---|---|---|---|---|---|
| لوحة التحكم (`dashboard`) | ✓ | — | — | — | — | — |
| الموردين (`suppliers`) | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| مخزون الألواح (`boards_inventory`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (+ استيراد) |
| مخزون الاكسسوارات (`accessories_inventory`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (+ استيراد) |
| المعارض (`branches`) | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| العملاء (`customers`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| الأوردرات (`orders`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| اليومية المالية (`journal`) | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| النثريات (`overhead`) | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| المقاولين (`contractors`) | ✓ | ✓ | ✓ | ✓ | — | — |
| التقارير (`reports`) | ✓ | — | — | — | ✓ | ✓ |
| المستخدمين (`users`) | admin only | ✓ | ✓ | ✓ | — | — |
| سجل النشاط (`audit`) | admin only | — | — | — | — | ✓ |
| الإعدادات (`settings`) | admin only | ✓ | ✓ | ✓ | — | — |

**سلوك الـ Admin:**
- له الصلاحية الكاملة على كل شيء افتراضياً.
- حساب المدير العام (admin) قابل للتعديل مثل باقي الموظفين، **باستثناء:** صفحة "المستخدمين" (`users`) ظاهرة له بشكل إجباري. كما لا يستطيع الـ admin حذف حسابه هو أو تعطيله (حماية من غلق نفسه بالخطأ).

**سلوك الـ Branch User:**
- يرى فقط الصفحات المُدرجة في `visible_modules`.
- كل الـ API endpoints تتحقق من `branch_id` تلقائياً وتُرجع فقط بيانات معرضه (Row-Level Filtering على مستوى التطبيق).
- لا يستطيع رؤية بيانات المعارض الأخرى أو المستخدمين أو النثريات أو سجل النشاط.

### 15.3 صفحة إدارة المستخدمين (`/admin/users` - Admin فقط)

- **الجدول الرئيسي**: جدول سريع يعرض جميع الموظفين مع أعمدة: الاسم، اسم المستخدم، الدور، المعرض، الحالة، أزرار تفعيل/تعطيل. في الأسفل: شبكة من الـ Checkboxes لإظهار/إخفاء سريع لكل صفحة.
- **تفاصيل الصلاحيات (Drawer)**: عند الضغط على "تعديل الصلاحيات"، يُفتح Drawer/Modal يحتوي على:
  - قائمة بكل صفحة (Module).
  - أسفل كل صفحة خانات اختيار (Checkboxes) للإجراءات المسموحة بناءً على ما تدعمه الصفحة فقط.
  - حقل كلمة السر (لتغييرها).
  - زر "حفظ" يُحدّث `permissions` و `visible_modules` كـ JSONB.
- **إضافة مستخدم جديد**: زر "+ مستخدم جديد" يفتح نفس الـ Drawer في وضع إنشاء.

### 15.4 صفحة تسجيل الدخول (`/login`)
- واجهة حديثة تقبل اسم المستخدم وكلمة السر.
- لا يوجد تسجيل حساب جديد (Sign up) - الحسابات تُنشأ حصراً من قبل الـ Admin.
- لا يوجد "نسيت كلمة السر" في V1 — الـ Admin يعيد تعيينها يدوياً من صفحة المستخدمين.
- 5 محاولات فاشلة خلال 10 دقائق من نفس الـ IP → قفل لمدة 15 دقيقة (Rate Limiting بسيط في DB).
- بعد 3 محاولات فاشلة متتالية لنفس الـ username → قفل الحساب حتى يفعّله الـ Admin.

### 15.5 صفحة "حسابي" `/account`
- لكل مستخدم: عرض بياناته، زر "تغيير كلمة السر" (يتطلب الحالية + الجديدة).
- متاحة من القائمة الجانبية (Footer) لجميع المستخدمين.

---

## 16. الهوية البصرية (Branding) ونظام التصميم

### 16.1 الهوية
- **الاسم**: مصنع مزايا - Mazaya Furniture
- **الشعار**: تصميم Monoline - أسود + برتقالي — في `public/mazaya-logo.svg/png`
- **الأيقونة في PWA**: نسخة مبسطة من الشعار

### 16.2 الألوان (Tailwind theme tokens)
مُعرَّفة في `tailwind.config.ts`:
| Token | Hex | الاستخدام |
|---|---|---|
| `mazaya-black` | `#1A1A1A` | النص الرئيسي |
| `mazaya-orange` | `#F2994A` | اللون المميز (الأكشن الرئيسي) |
| `mazaya-orange-dark` | `#E07B30` | Hover/Active للأورانج |
| `mazaya-cream` | `#FAF7F2` | خلفية التطبيق العامة |
| `mazaya-gray` | `#F4F2EE` | خلفية ثانوية (Sidebar items hover) |
| `mazaya-line` | `#E8E4DD` | الحدود الفاصلة |
| `mazaya-muted` | `#6B6B6B` | النص الثانوي |
| `success` | `#16A34A` | أخضر للوارد/النجاح |
| `danger` | `#DC2626` | أحمر للمصروف/الأخطاء |
| `info` | `#2563EB` | أزرق للمعلومات |

**التدرجات (Gradients) المستخدمة:**
- `bg-orange-gradient`: `linear-gradient(135deg, #F2994A 0%, #E07B30 100%)` — للأزرار الأساسية، الأيقونات النشطة، Progress Rings.

### 16.3 الخطوط
- **الخط الأساسي للعربي**: `Cairo` (Google Fonts) — أوزان 400, 500, 600, 700, 800.
- **الخط للأرقام والـ UI الداخلي**: `Inter` — لتحسين قراءة الأرقام.
- Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.

### 16.4 المسافات والأحجام
- **Spacing scale**: مضاعفات 4px (`p-2, p-4, p-6, p-8`).
- **Border radius**: `rounded-lg` (8px) للكروت، `rounded-md` (6px) للأزرار، `rounded-full` للأفاتار.
- **Shadows**: `shadow-sm` للجداول، `shadow-md` للكروت العائمة، `shadow-lg` للـ Modals.

---

## 17. التقنيات والبنية التحتية (Tech Stack & Infrastructure)

### 17.1 Frontend & Backend
| البند | التقنية |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 3 |
| **Components** | Custom (في `src/components/ui/`) — لا توجد مكتبة UI خارجية |
| **Icons** | `@heroicons/react` |
| **Charts** | `recharts` |
| **Excel** | `xlsx` (SheetJS) |
| **Auth** | `jose` (JWT) + `bcryptjs` (password hash) |
| **DB Driver** | `pg` (node-postgres) — اتصال مباشر |
| **Validation** | `zod` (في API routes) |
| **PWA** | Custom `manifest.webmanifest` + Service Worker (Workbox أو مخصص) |

### 17.2 Infrastructure (الواقع الحالي)
| البند | الواقع المستهدف والمطبق |
|---|---|
| **الاستضافة (Hosting)** | DigitalOcean Droplet (Ubuntu 24.04, 2GB RAM) - IP: 64.226.118.40 |
| **النطاق (Domain)** | https://mazaya.openappo.com/ (عبر Nginx Reverse Proxy) |
| **قاعدة البيانات (DB)** | PostgreSQL محلي على Droplet (127.0.0.1:5432) — اسم DB: `mazaya` |
| **النشر (Deployment)** | Docker image على GHCR (`ghcr.io/momarzouk1998/mazaya:latest`) |
| **SSL** | Let's Encrypt عبر Certbot — تجديد تلقائي |
| **Backup** | `pg_dump` يومي الساعة 3 صباحاً، يُحفظ في `/var/backups/mazaya/` لمدة 30 يوم |

### 17.3 متغيرات البيئة (Environment Variables)
يجب تعريفها في `.env.local` (محلي) و `docker run -e ...` (إنتاج):

```bash
# مطلوبة
DATABASE_URL=postgresql://mazaya_user:STRONG_PASSWORD@127.0.0.1:5432/mazaya
JWT_SECRET=<random 64-char hex string — يُولّد مرة واحدة ويُخزن بأمان>

# اختيارية
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_NAME="Mazaya Furniture"
```

> ⚠️ `.env*` لا يُرفع لـ Git أبداً (مُعرَّف في `.gitignore`).

### 17.4 سياسة الأمان
- **HTTPS فقط** في الإنتاج (HSTS enabled).
- **JWT** بصلاحية 7 أيام — لا refresh token في V1.
- **CORS**: مسموح فقط لـ `https://mazaya.openappo.com`.
- **CSP Headers**: `default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline';`
- **Rate Limiting**: 60 request/minute لكل IP على `/api/*` (عبر Nginx أو middleware بسيط).
- **Password Policy**: 8 أحرف على الأقل، Admin يوصي بأقوى.

---

## 18. سير النشر (Deployment Workflow via GHCR)

### 18.1 القاعدة الذهبية
**ممنوع منعاً باتاً** إجراء أي عملية بناء (npm run build أو docker build) مباشرة على خادم DigitalOcean — الـ Droplet 2GB RAM لا يتحمل ذلك، وستحدث OOM kills.

### 18.2 على جهاز المطور (Local) أو CI (GitHub Actions)
```bash
# 1. تثبيت dependencies
npm ci

# 2. Build image
docker build -t ghcr.io/momarzouk1998/mazaya:latest .

# 3. اختبار سريع (اختياري)
docker run --rm -p 3000:3000 --env-file .env.local ghcr.io/momarzouk1998/mazaya:latest

# 4. Push
docker push ghcr.io/momarzouk1998/mazaya:latest
```

### 18.3 على خادم DigitalOcean (Droplet)
عبر SSH:
```bash
docker pull ghcr.io/momarzouk1998/mazaya:latest
docker stop mazaya || true
docker rm mazaya || true
docker run -d \
  --name mazaya \
  --restart unless-stopped \
  --network host \
  -e DATABASE_URL="postgresql://mazaya_user:STRONG_PASSWORD@127.0.0.1:5432/mazaya" \
  -e JWT_SECRET="<same-secret>" \
  -e NODE_ENV=production \
  ghcr.io/momarzouk1998/mazaya:latest
docker logs -f mazaya
```

### 18.4 Nginx Reverse Proxy (snippet)
```nginx
# /etc/nginx/sites-available/mazaya
server {
    listen 80;
    server_name mazaya.openappo.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mazaya.openappo.com;

    ssl_certificate /etc/letsencrypt/live/mazaya.openappo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mazaya.openappo.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=mazaya_api:10m rate=60r/m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=mazaya_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 18.5 Dockerfile (موجود في `Dockerfile` في الـ repo)
Multi-stage build:
1. **deps**: `npm ci`
2. **builder**: `npm run build` — ينتج `.next/standalone`
3. **runner**: `node:20-alpine` + الملفات النهائية فقط.

---

## 19. PWA (Progressive Web App)

### 19.1 Manifest (`public/manifest.webmanifest`)
```json
{
  "name": "مصنع مزايا - نظام الإدارة",
  "short_name": "Mazaya",
  "description": "نظام إدارة مصنع مزايا للأثاث",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "any",
  "lang": "ar",
  "dir": "rtl",
  "background_color": "#FAF7F2",
  "theme_color": "#F2994A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### 19.2 Service Worker
- **الاستراتيجية**: Network First مع fallback للـ Cache للـ `/`, CSS, JS الأساسية.
- **ما يُكاش**: لا نكاش البيانات (API responses) في V1 — البيانات المالية حساسة ويفضل طلبها طازة.
- **Offline Page**: صفحة بسيطة "أنت غير متصل بالإنترنت" عند عدم توفر الشبكة.

### 19.3 Install Prompt
- زر "ثبت التطبيق" يظهر في الـ Sidebar على الموبايل/تابلت لو لم يكن مثبتاً بعد، باستخدام `beforeinstallprompt` event.

---

## 20. جودة الكود والمعايير (Code Quality Standards)

| البند | المعيار |
|---|---|
| **TypeScript** | `strict: true` — لا `any` بدون تعليق يبرر ذلك. |
| **Linting** | ESLint مع `next/core-web-vitals`. |
| **Formatting** | Prettier — 2 spaces, single quotes, trailing commas. |
| **File naming** | kebab-case للملفات (`user-form.tsx`)، PascalCase للمكونات (`UserForm`). |
| **Folder structure** | `src/app/<route>/page.tsx` للصفحات، `src/components/` للمكونات المشتركة، `src/lib/` للمنطق. |
| **API conventions** | Route Handlers في `src/app/api/<route>/route.ts`. التحقق من الصلاحيات في **أول سطر** من كل handler. استخدام `zod` للتحقق من الـ Body. |
| **DB queries** | معاملات (Parameterized queries) دائماً — لا string concat مع user input. |
| **Comments** | بالعربية للشرح العام، بالإنجليزية للكود التقني المعقد. |

---

## 21. خطة الإعداد الأولي (Initial Setup Checklist)

عند تشغيل النظام لأول مرة على جهاز المطور أو Droplet:

1. [ ] إنشاء قاعدة بيانات `mazaya` و user مخصص.
2. [ ] تشغيل `sql/create_schema.sql` لإنشاء الجداول والـ Views.
3. [ ] تشغيل `sql/seed_data.sql` لإدخال:
   - 4 معارض افتراضية.
   - حساب Admin: `username=admin, password=admin123` (يُطلب تغييره عند أول دخول).
   - أنواع الخامات الأساسية (مجلس، MDF، HDF، إلخ).
4. [ ] استيراد الأكواد الـ 560 الحالية من Excel عبر `/boards/import` و `/accessories/import`.
5. [ ] تغيير كلمة سر الـ admin الافتراضية.
6. [ ] إنشاء المستخدمين الإضافيين حسب الحاجة.
7. [ ] اختبار سريع: إنشاء مورد، شراء، إنشاء أوردر، استخدام مواد، تسجيل دفعة.

---

## 22. ملخص متطلبات التصميم والتحديثات

1. **الصلاحيات الدقيقة (Action-level permissions)**: تطبيق JSONB permissions لكل مستخدم.
2. **شاشات Admin**: صفحة إدارة المستخدمين تدعم التحديد السريع للموديولات والتعديل العميق للصلاحيات.
3. **أيقونات المساعدة (؟)**: ضمان وجود `PageHelp` component في كل صفحة.
4. **منع Build على Droplet**: استخدام Docker Pull فقط من GHCR.
5. **إزالة كل التبعيات القديمة**: Supabase Auth و Vercel — التوثيق يعكس الواقع (DigitalOcean + JWT).
6. **Soft Delete**: كل الجداول الرئيسية تدعم الحذف الناعم.
7. **Audit Log**: تتبع كل التغييرات.
8. **Rate Limiting**: حماية API endpoints.
9. **Backup يومي**: `pg_dump` تلقائي.
10. **PWA كامل**: Manifest + Service Worker + Install prompt.
11. **Empty States**: كل قائمة/جدول بدون بيانات يعرض رسالة واضحة.
12. **Row-Level Filtering**: Branch User يرى فقط بيانات معرضه.
13. **طباعة فاتورة الأوردر**: قالب A4 عربي جاهز.

---

## 23. أسئلة مفتوحة / قرارات مؤجلة (Open Questions)

| السؤال | الحالة |
|---|---|
| هل نحتاج multi-language (عربي/إنجليزي) في الواجهة؟ | **لا** في V1 — عربي فقط. |
| هل نحتاج إشعارات Push؟ | **لا** في V1 — يمكن إضافتها لاحقاً. |
| هل نحتاج طباعة باركود للأوردرات/الأصناف؟ | **لا** في V1. |
| هل نحتاج تصدير PDF (بدل Excel)؟ | **لا** في V1 — Print + Excel كافيان. |
| هل نستخدم Sentry أو أي monitoring service؟ | **مؤجل** للـ V2. |
| هل نضيف Dark Mode؟ | **لا** في V1 — يمكن إضافته لاحقاً بتغيير Tailwind config فقط. |

---

## 24. القرارات المعمارية الحرجة (Architectural Decisions)

قرارات لا يمكن تغييرها لاحقاً بدون breaking change — يجب أن تُفهم قبل أي تطوير جديد.

### 24.1 الـ Pool الواحد لـ Postgres
استخدام `pg.Pool` واحد على مستوى التطبيق (singleton). **لا** نستخدم Supabase client-side أو per-request connections. كل query يمر عبر `query()` أو `withTransaction()`.

### 24.2 JWT في httpOnly cookie (لا في localStorage)
- السبب: localStorage مكشوف لـ XSS. الـ Cookie httpOnly + SameSite=Lax يحمي من XSS + CSRF في نفس الوقت.
- لا refresh token: المستخدم يعيد تسجيل الدخول بعد 7 أيام. بسيط وآمن بما يكفي لـ V1.

### 24.3 Server Components افتراضياً
كل صفحة هي Server Component ما لم تحتاج interactivity. هذا يقلل الـ bundle ويحسّن SEO و TTFB. Client Components فقط في:
- النماذج (`"use client"`)
- المكونات التي تستخدم state/events (`PageHelp`, `SearchFilter`, `DataTable` لو فيه pagination client-side).

### 24.4 No external UI library
لا نستخدم shadcn/ui أو MUI أو Chakra. كل UI components في `src/components/ui/` مكتوبة خصيصاً بـ Tailwind. السبب:
- bundle أصغر.
- تحكم كامل في RTL.
- تخصيص كامل للألوان والـ branding.

### 24.5 Enums في DB (لا في الكود)
`user_role`, `order_status`, `order_type`, `journal_entry_type`, `payment_method` كلها PostgreSQL ENUMs. الـ TS types تستخدم string literal types (`"admin" | "branch_user"`) للتطابق. لا نستخدم zod schemas للحقول المنفصلة (فقط للـ API body لو احتاج).

### 24.6 Computed columns في DB
`total_price`, `quantity_remaining`, `duration_days` كلها `GENERATED ALWAYS AS ... STORED`. لا تُحسب في الـ SELECT. هذا يحمي من الـ drift بين الحساب اليدوي والـ DB.

### 24.7 Views للـ Reporting
`v_inventory_value`, `v_order_totals`, `v_journal_summary` — كل الـ aggregations الثقيلة في DB views، الـ app فقط يقرأ منها.

### 24.8 Excel عبر `xlsx` (SheetJS) — لا عبر `exceljs`
سبب: أصغر وأبسط، يكفي لـ read + write. لا نحتاج styling أو charts في Excel.

### 24.9 لا نملك ملف Dockerfile في الـ repo بعد
(مذكور في §18 لكن غير موجود فعلياً). **مطلوب بناؤه** كأولوية 1.

### 24.10 Branch User isolation في App Layer
لا نستخدم Postgres Row-Level Security (RLS) — العزل يتم في الـ API handlers عبر `if (user.role === 'branch_user') add WHERE branch_id = $user.branch_id`. السبب: أبسط للـ debugging وأسرع في التطوير.

---

## 25. التنفيذ الفعلي — مرجع الكود (Implementation Reference)

هذا القسم يوثّق الكود الفعلي الموجود في الـ repo (يونيو 2026) ليكون مرجع للمطورين. كل قرار أو pattern هنا **مُطبَّق** في الكود.

### 25.1 هيكل المجلدات الفعلي

```
mazaya-system/
├── Dockerfile                 # Multi-stage: deps → builder → runner
├── docker-compose.yml         # (اختياري للتطوير المحلي)
├── next.config.js             # standalone output + security headers
├── tailwind.config.ts         # ألوان + خطوط + shadows + gradients
├── postcss.config.js
├── tsconfig.json              # paths: "@/*" → "./src/*"
├── package.json
├── sql/
│   ├── create_schema.sql      # الجداول + ENUMs + Views
│   └── seed_data.sql          # admin + 4 معارض + 7 موردين + خامات
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (cache-first للأصول)
│   ├── logo.png               # الشعار
│   ├── favicon.ico
│   └── icons/                 # PWA icons بأحجام متعددة
│       ├── icon-32.png … icon-512.png
│       └── apple-touch-icon.png
└── src/
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # html lang=ar dir=rtl + metadata
    │   ├── globals.css        # Tailwind + Cairo font + RTL + scrollbar
    │   ├── page.tsx           # / → redirect to /dashboard or /login
    │   ├── login/             # /login
    │   ├── dashboard/         # /dashboard
    │   ├── suppliers/         # /suppliers, /[id], /new
    │   ├── boards/            # /boards, /[id], /new
    │   ├── accessories/       # (نفس النمط - غير مطبق بعد في الـ UI)
    │   ├── branches/          # (غير مطبق)
    │   ├── customers/         # (غير مطبق)
    │   ├── orders/            # (غير مطبق)
    │   ├── journal/           # (غير مطبق)
    │   ├── overhead/          # (غير مطبق)
    │   ├── contractors/       # (غير مطبق)
    │   ├── reports/           # (غير مطبق)
    │   ├── account/           # (غير مطبق)
    │   └── admin/             # (غير مطبق)
    │       ├── users/         # (غير مطبق)
    │       └── audit/         # (غير مطبق)
    ├── components/
    │   ├── layout/
    │   │   └── DashboardLayout.tsx  # Sidebar + Topbar + Main area
    │   ├── ui/
    │   │   ├── Button.tsx           # 5 variants × 3 sizes
    │   │   ├── Card.tsx             # Card + StatCard (4 variants)
    │   │   ├── Input.tsx            # Input + Textarea + Select
    │   │   ├── Logo.tsx             # Image + text
    │   │   └── PageHelp.tsx         # أيقونة (?) + Modal شرح
    │   ├── PageHeader.tsx           # title + subtitle + help + actions
    │   ├── SearchFilter.tsx         # بحث + فلاتر قابلة للطي + أزرار
    │   ├── DataTable.tsx            # جدول + Pagination + Loading + Empty
    │   ├── InventoryForm.tsx        # نموذج موحد للألواح والاكسسوارات
    │   ├── SupplierForm.tsx         # نموذج المورد
    │   └── DashboardCharts.tsx      # Bar + Pie charts
    └── lib/
        ├── auth.ts                  # Server helpers: requireAuth, requireAdmin, hasPermission, canSeeModule, jsonError, jsonOk
        ├── format.ts                # formatEGP, formatNumber, formatDate, formatDateTime, todayISO, cn
        ├── excel.ts                 # exportToExcel, parseExcelToRows, excelResponse
        ├── types.ts                 # كل الـ TS types + LABELS + DEFAULT_PERMISSIONS
        └── db/
            ├── pool.ts              # pg Pool + query() + withTransaction() + exec()
            └── auth.ts              # JWT sign/verify + bcrypt + getCurrentUser + SESSION_COOKIE
```

### 25.2 الـ Path Aliases
```json
// tsconfig.json
"paths": { "@/*": ["./src/*"] }
```
الاستيراد دائماً: `import { ... } from "@/lib/..."` أو `from "@/components/..."`. لا يُستخدم `../` للتنقل بين المجلدات الرئيسية.

### 25.3 الـ Components المشتركة — Contract كامل

#### `<Button>` (`src/components/ui/Button.tsx`)
```tsx
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"; // default: primary
  size?: "sm" | "md" | "lg";                                          // default: md
  loading?: boolean;                                                   // يُظهر spinner
}
// forwardRef. يُعطّل الزر لو disabled أو loading.
```
| Variant | الاستخدام |
|---|---|
| `primary` (orange) | أكشن رئيسي (حفظ، إضافة، دخول) |
| `secondary` (black) | أكشن ثانوي مهم (حركة يومية) |
| `danger` (red) | حذف |
| `ghost` | أيقونات أو إجراءات خفيفة |
| `outline` | أزرار الفلاتر، تصدير، إلغاء |

#### `<Card>` + `<StatCard>` (`src/components/ui/Card.tsx`)
```tsx
interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;       // يظهر في الـ header
  action?: ReactNode;   // زر في يمين الـ header
}

interface StatCardProps {
  label: string;
  value: ReactNode;     // يقبل JSX أو string
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: "orange" | "dark" | "green" | "blue"; // default: orange
}
// كل StatCard فيه تدرج لوني + دائرة بيضاء شفافة decorative في الزاوية.
```

#### `<Input>` + `<Textarea>` + `<Select>` (`src/components/ui/Input.tsx`)
```tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;       // يظهر أسفل الحقل + border أحمر
}
// Select له options: { value: string, label: string }[]
// كلهم forwardRef.
```
**سلوك موحّد:** `focus:ring-2 focus:ring-mazaya-orange/40 focus:border-mazaya-orange`. الـ error يظهر أسفل الحقل بحجم `text-xs text-red-600`.

#### `<Logo>` (`src/components/ui/Logo.tsx`)
```tsx
interface LogoProps {
  size?: number;        // default: 40
  showText?: boolean;   // default: true
  className?: string;
}
// يستخدم next/image من /logo.png + نص "مزايا / MAZAYA FURNITURE".
```

#### `<PageHelp>` (`src/components/ui/PageHelp.tsx`)
```tsx
interface PageHelpProps {
  title: string;
  description: string;
}
// أيقونة ? دائرية برتقالية. الضغط يفتح Modal مع زر "فهمت".
```

#### `<PageHeader>` (`src/components/PageHeader.tsx`)
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  helpTitle?: string;
  helpDescription?: string;
  actions?: ReactNode;   // أزرار في اليسار
}
// في الموبايل: title/actions يلتفّون (flex-wrap).
```

#### `<SearchFilter>` (`src/components/SearchFilter.tsx`)
```tsx
interface SearchFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;             // default: "بحث..."
  filters?: FilterDef[];                  // قابلة للطي
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, v: string) => void;
  onExport?: () => void;
  onImport?: () => void;
  onAdd?: () => void;
  addLabel?: string;                      // default: "إضافة جديد"
}
interface FilterDef {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { value: string; label: string }[];
}
```

#### `<DataTable>` + `<Pagination>` (`src/components/DataTable.tsx`)
```tsx
interface DataTableProps<T> {
  columns: Column<T>[];        // { key, header, render?, className?, sortable? }
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;       // default: "لا توجد بيانات"
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}
// Pagination لا يظهر لو total <= pageSize.
```
**سلوك التحميل:** spinner دائرية + "جاري التحميل...".
**سلوك الفراغ:** نص بسيط في المنتصف، بدون رسمة.

### 25.4 الـ Lib Helpers — Contract كامل

#### `lib/auth.ts` (Server-side helpers)
```ts
requireAuth(): Promise<User | null>
requireAdmin(): Promise<User | null>
hasPermission(user: User | null, module: string, action: ModulePermissions[keyof ModulePermissions]): boolean
canSeeModule(user: User | null, module: string): boolean
setSessionCookie(token: string): Promise<void>        // لا تعمل في API routes — استخدم res.cookies.set
clearSessionCookie(): Promise<void>
jsonError(message: string, status?: number): NextResponse   // default 400
jsonOk<T>(data: T, status?: number): NextResponse          // default 200
```
**ملاحظة حرجة:** `setSessionCookie` لا تعمل داخل API Route handlers بسبب `cookies()` API — استخدم `res.cookies.set(...)` مباشرة كما في `/api/auth/login`.

#### `lib/db/auth.ts` (JWT + DB auth)
```ts
hashPassword(plain: string): Promise<string>             // bcrypt cost=10
verifyPassword(plain: string, hash: string): Promise<boolean>
signSession(user: User): Promise<string>                 // JWT HS256, 7d expiry
verifySession(token: string): Promise<{sub, username, role, branch_id} | null>
getCurrentUser(): Promise<User | null>                   // يقرأ cookie + يجلب من DB
SESSION_COOKIE = "mazaya_session"
```
**JWT payload:** `{ sub: user.id, username, role, branch_id }`.
**Cookie attributes:** `httpOnly: true, sameSite: "lax", secure: <production && https>, path: "/", maxAge: 7 days`.

#### `lib/db/pool.ts` (Postgres pool)
```ts
pool: Pool                                // max=10, idle=30s, connect timeout=5s
query<T>(text: string, params?: any[]): Promise<{rows: T[], rowCount: number}>
withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>
exec<T>(text: string): Promise<T[]>       // يدعم multi-statement
```
**Singleton pattern:** في dev mode، الـ pool يُحفظ على `globalThis` لمنع تسريب الاتصالات عند HMR.

#### `lib/format.ts`
```ts
formatEGP(value): string                  // "12,345 ج.م" (ar-EG locale)
formatNumber(value): string               // "12,345.67"
formatDate(date): string                  // "25/12/2025"
formatDateTime(date): string              // "25/12/2025 14:30"
todayISO(): string                        // "2025-12-25"
cn(...classes): string                     // className merger
```

#### `lib/excel.ts`
```ts
exportToExcel<T>(rows: T[], filename: string, sheetName?: string): Buffer
parseExcelToRows<T>(buffer: Buffer): Promise<T[]>
excelResponse(buf: Buffer, filename: string): Response
```
**ملاحظة:** `filename` في `excelResponse` يجب أن يكون بدون `.xlsx` — اللاحقة تُضاف تلقائياً. الـ filename مُرمَّز بـ RFC 5987 (`filename*=UTF-8''...`) لدعم العربية.

#### `lib/types.ts`
- كل الـ interfaces: `User, Branch, Supplier, InventoryItem, Customer, Order, OrderMaterial, JournalEntry, OverheadExpense, Contractor`.
- **ثوابت LABELS بالعربية** (مصدر الحقيقة الوحيد للنصوص في الـ UI):
  ```ts
  JOURNAL_TYPE_LABELS: { purchase: "مشتريات", incoming_from_branch: "دفعة واردة من معرض", ... }
  ORDER_STATUS_LABELS: { open: "مفتوح", in_progress: "قيد التنفيذ", completed: "مكتمل", delivered: "تم التسليم" }
  ORDER_TYPE_LABELS:    { new: "تصنيع جديد", maintenance: "صيانة" }
  MODULE_LABELS:        { dashboard: "لوحة التحكم", suppliers: "الموردين", ... }
  ```
- **`DEFAULT_PERMISSIONS`** — القيم الافتراضية عند إنشاء Branch User جديد.

### 25.5 نماذج الـ API الفعلية

#### Auth endpoints
```ts
// POST /api/auth/login
Request:  { username: string, password: string }
Response (200): { data: { ok: true, user: { id, username, role } } }
Response (400): { error: "بيانات ناقصة" }
Response (401): { error: "بيانات الدخول غير صحيحة" }
// Side-effect: sets Cookie mazaya_session (httpOnly, 7d)

// POST /api/auth/logout
Response (200): { data: { ok: true } }
// Side-effect: deletes cookie

// GET /api/auth/user
Response (200): { data: { id, username, full_name, role, branch_id, visible_modules, permissions } }
Response (401): { error: "unauthenticated" }
```

#### Resource endpoints (نمط موحّد)
```ts
// GET /api/<resource>          → { data: [...] }
// POST /api/<resource>         → { data: <created> }  | { error: "..." } (400/409/500)
// GET /api/<resource>/[id]     → { data: <row> }     | { error: "not_found" } (404)
// PUT /api/<resource>/[id]     → { data: <updated> }
// DELETE /api/<resource>/[id]  → { data: { ok: true } }
```
**Auth check:** أول سطر في كل handler: `const user = await requireAuth(); if (!user) return NextResponse.json({error:"unauthenticated"}, {status:401})`.

**Error handling pattern** (مثال من boards):
```ts
try { ... }
catch (e: any) {
  if (e?.code === "23505") return NextResponse.json({error:"هذا الكود مسجل من قبل لنفس المورد"}, {status:400});
  return NextResponse.json({error: e?.message || "خطأ"}, {status:500});
}
```
كود `23505` = Postgres unique violation. **لا يُطبَّق حالياً:** soft delete، check على permissions، check على branch_id للـ branch_user.

### 25.6 نمط الـ Pages (Server Components)

كل صفحة من نمط **Server Component** مع `searchParams` من URL:

```tsx
export const dynamic = "force-dynamic";   // دائماً — لتجنب stale data

export default async function BoardsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; export?: string }>
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const q = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  // 1. Export path (لو ?export=1)
  if (params.export) { return excelResponse(buf, "مخزون_الألواح"); }

  // 2. Data fetch مع pagination
  const { rows } = await query(...);

  // 3. Render
  return (
    <DashboardLayout user={user}>
      <PageHeader ... />
      <SearchFilter ... />
      <DataTable ... />
      <Pagination ... />
    </DashboardLayout>
  );
}
```

**حجم الصفحات المعتمد:**
- الموردين: **20**
- المخزون (ألواح/اكسسوارات): **25**
- (الباقي موحَّد على 20-25 حسب رغبة التطبيق عند بنائه)

**حد التصدير:** `LIMIT 5000` — يحمي من OOM لو البيانات ضخمة.

### 25.7 نمط الـ Forms (Client Components)

نماذج موحَّد عبر `useState` + `fetch`:

```tsx
"use client";
const [form, setForm] = useState({ ... initial });
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function onSubmit(e) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    const url = initial?.id ? `/api/x/${initial.id}` : "/api/x";
    const method = initial?.id ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: {...}, body: JSON.stringify(form) });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "حدث خطأ"); return; }
    router.push("/list-page");
    router.refresh();
  } catch (e) { setError("خطأ في الاتصال"); }
  finally { setLoading(false); }
}
```
**سلوك موحّد:**
- زر "إلغاء" → `router.back()`
- زر "حفظ" → loading spinner داخل الزر نفسه
- بعد النجاح → redirect للقائمة + `router.refresh()`
- الأخطاء → banner أحمر فوق الأزرار
- `InventoryForm` يقبل `table: "boards_inventory" | "accessories_inventory"` لتوجيه الـ endpoint الصحيح.

### 25.8 PWA الفعلي (ما هو مطبَّق)

| العنصر | الحالة | التفاصيل |
|---|---|---|
| `public/manifest.json` | ✅ مطبَّق | name/short_name عربي، start_url `/dashboard`، display `standalone`، theme `#F2994A` |
| `public/sw.js` | ✅ مطبَّق | Cache-first للأصول فقط، **لا يكاش الـ API** (صحيح لليومية المالية). Network-first للـ `/` |
| Icons | ✅ مطبَّق | 72, 96, 128, 144, 152, 192, 384, 512 + apple-touch-icon |
| Install Prompt | ❌ **غير مطبَّق** | لم يُضَف زر "ثبت التطبيق" بعد |
| Offline Page | ❌ **غير مطبَّق** | الـ SW يرجع `/` المخزَّن (404 عملي على الصفحات الديناميكية) |

### 25.9 أمان `next.config.js`
```js
output: "standalone"           // لـ Docker image أصغر
reactStrictMode: true
poweredByHeader: false        // يخفي X-Powered-By
experimental.optimizePackageImports: ["@heroicons/react"]
headers: {
  X-Frame-Options: "SAMEORIGIN",
  X-Content-Type-Options: "nosniff",
  Referrer-Policy: "strict-origin-when-cross-origin"
}
```
**ملاحظة:** HSTS و CSP غير مطبَّقين هنا — Nginx هو اللي يضيفهما (راجع §18.4).

### 25.10 ما يجب بناؤه بعد ذلك (Gap Analysis)

بناءً على الـ Spec vs الكود الفعلي، الأولويات القادمة:

#### أولوية 1 (ضرورية لـ V1)
- [ ] **Soft Delete** فعلي — استبدال `DELETE` بـ `UPDATE ... SET deleted_at = NOW()` في كل handlers. الـ schema الحالي **لا يحتوي** عمود `deleted_at`.
- [ ] **Permission enforcement** — كل POST/PUT/DELETE يجب يفحص `hasPermission(user, module, "add"|"edit"|"delete")` ويُرجع 403 لو false. حالياً كل المستخدمين عندهم وصول كامل.
- [ ] **Branch-level filtering** — كل query يجب يفحص `user.role === 'branch_user'` ويُضيف `WHERE branch_id = $user.branch_id` تلقائياً.
- [ ] **تحديث `last_login_at`** في `mazaya_users` عند login ناجح.
- [ ] **Password change endpoint** + صفحة `/account`.

#### أولوية 2 (موديولات ناقصة من الـ UI)
- [ ] `/accessories/*` — نفس النمط الكامل لـ boards (page, [id], new, import).
- [ ] `/branches/*` — قائمة بطاقات + تفاصيل.
- [ ] `/customers/*` — قائمة + تفاصيل + نموذج.
- [ ] `/orders/*` — قلب النظام، يجب أن يكون كامل (قائمة + إنشاء + تفاصيل مع المواد والتكاليف).
- [ ] `/journal/*` — قائمة + إنشاء + KPIs Cards.
- [ ] `/overhead/*` — قائمة + إنشاء + ربط تلقائي باليومية.
- [ ] `/contractors/*` — قائمة + تفاصيل.
- [ ] `/reports/*` — 5 تابات.
- [ ] `/admin/users/*` — جدول + Drawer للصلاحيات.
- [ ] `/admin/audit` — سجل النشاط.
- [ ] `/account` — تغيير كلمة السر.

#### أولوية 3 (تحسينات)
- [ ] **Audit log table + middleware** لتسجيل create/update/delete.
- [ ] **Rate limiting** بسيط في الـ API (Redis أو جدول DB).
- [ ] **Backup script** يومي `pg_dump`.
- [ ] **Dockerfile** في الـ repo (مذكور في الـ Spec، غير موجود في الـ listing).
- [ ] **CI workflow** على GitHub Actions للـ build + push إلى GHCR تلقائياً.
- [ ] **Install Prompt** للـ PWA.
- [ ] **Offline page** بسيطة.
- [ ] **طباعة فاتورة الأوردر** (قالب A4).
- [ ] **استيراد Excel للألواح/الاكسسوارات** — endpoint موجود في الـ spec، غير مطبَّق.

#### أولوية 4 (V2)
- [ ] Dark Mode.
- [ ] Push Notifications.
- [ ] Sentry/monitoring.
- [ ] Native mobile app.
- [ ] Multi-currency.

---

## 26. خريطة الترجمات (i18n Strings)

كل النصوص العربية في الـ UI موثَّقة كمصدر وحيد في `lib/types.ts` (LABELS) أو مباشرة في الـ components. **لا نستخدم** ملفات ترجمة منفصلة في V1 — التحديث يكون بـ sed/replace لو احتاج الأمر.

**نصوص يجب توحيدها (consistency):**
- "حفظ التعديلات" / "إضافة المورد" — نمط ثابت في كل النماذج.
- "إلغاء" للـ back button.
- "لا توجد بيانات" / "لا توجد <X> مسجلة" — رسائل الفراغ.
- "جاري التحميل..." — spinner text.
- "حدث خطأ" / "خطأ في الاتصال" — أخطاء عامة.

---

## 27. Acceptance Checklist for V1

عند إعلان V1 جاهز للإنتاج، يجب أن يستوفي:

### وظيفي
- [ ] كل الموديولات من §3 لها UI كامل وصفحات CRUD.
- [ ] Soft Delete مطبَّق على كل الجداول (Suppliers, Boards, Accessories, Customers, Orders).
- [ ] Permission enforcement على مستوى كل endpoint.
- [ ] Branch-level filtering لموظف المعرض.
- [ ] Import/Export Excel يعمل على المخزون.
- [ ] Login + Logout + Account يعمل.
- [ ] PWA Install يعمل على أندرويد وآيفون.
- [ ] كل صفحة فيها PageHelp مع شرح واضح.

### أمني
- [ ] HTTPS فقط في الإنتاج.
- [ ] JWT cookie httpOnly + secure في الإنتاج.
- [ ] Security headers من Nginx + Next.js.
- [ ] Rate limiting على `/api/*`.
- [ ] Password لا يُسجَّل في logs.

### تشغيلي
- [ ] Dockerfile multi-stage يبني صورة < 300MB.
- [ ] النشر عبر GHCR + Droplet يعمل end-to-end.
- [ ] Backup يومي + اختبار استعادة (مرة كل شهر).
- [ ] Health check endpoint `/api/health`.
- [ ] Logs منظمة (JSON) للـ container.

### جودة
- [ ] `npm run build` ينجح بدون warnings حرجة.
- [ ] `tsc --noEmit` يمر بدون errors.
- [ ] لا توجد `any` بدون تعليق توضيحي.
- [ ] كل API route له permission check.
- [ ] كل صفحة لها PageHelp.
- [ ] Responsive يعمل على 360px حتى 1920px.

---

## 28. خريطة الأولويات (Roadmap)

### V1.0 (النسخة الحالية) — الأساسيات
- كل الموديولات من 1 إلى 15.
- Auth + Permissions + Audit Log.
- Dashboard مع Charts.
- استيراد/تصدير Excel.
- PWA أساسي.
- النشر على DigitalOcean + GHCR.

### V1.1 (المرحلة القادمة — المرشحة)
- Row-Level Filtering كامل للـ Branch User.
- طباعة فاتورة الأوردر (A4).
- Backup يومي تلقائي.
- Service Worker offline page.

### V2.0 (مستقبلي)
- إشعارات Push.
- Dark Mode.
- تطبيق موبايل Native (React Native أو Capacitor).
- تقارير متقدمة (توقعات، تحليلات).
- Multi-currency.
