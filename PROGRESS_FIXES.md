# سجل التعديلات - Mazda Furniture System

## المشاكل المُبلّغة من المستخدم وحالة تنفيذها

### 1. نوع الشغل في الأوردر (أعمال خارجية)
- [x] تحويل حقل "نوع الشغل" من قائمة منسدلة إلى حقل نصي مع datalist
- [x] إضافة زر "+ إضافة للقائمة" لإضافة نوع شغل جديد
- [x] حفظ الأنواع الجديدة وعرضها في القوائم التالية تلقائياً
- **الملفات**: `src/app/orders/_new-order-form.tsx`

### 2. صفحة الأوردرات - تعديل/حذف
- [x] إضافة أزرار عرض/تعديل/طباعة فاتورة/حذف في كل صف
- [x] تأكيد الحذف قبل التنفيذ
- [x] حماية زر الحذف للأدمن فقط
- **الملفات**: `src/app/orders/page.tsx`

### 3. فلتر الأوردرات - زر تصفية Popup
- [x] إزالة الفلاتر من السطر العلوي
- [x] إنشاء زر "🎯 تصفية" يفتح popup
- [x] Popup يحتوي على: المعرض، الحالة، النوع، من تاريخ، إلى تاريخ
- [x] عداد على الزر يوضح عدد الفلاتر المطبقة
- [x] دعم دمج/تراكب الفلاتر معاً
- [x] زر "مسح الفلاتر" لمسح كل الفلاتر دفعة واحدة
- **الملفات**: `src/app/orders/page.tsx`

### 4. عمود الإجمالي والمدة
- [x] إصلاح حساب "المدة" لاستخدام daysBetween() + duration_days
- [x] إصلاح حساب "الإجمالي" لاستخدام order_total بشكل صحيح
- [x] إضافة `daysBetween` إلى import في `src/lib/format.ts`
- **الملفات**: `src/app/orders/page.tsx`, `src/lib/format.ts`

### 5. حركة يومية جديدة - نوع الحركة وطريقة الدفع
- [x] تحويل "نوع الحركة" إلى حقل نصي مع datalist (إضافة جديد واختيار من الموجودة)
- [x] تحويل "طريقة الدفع" إلى حقل نصي مع datalist
- [x] تحويل "البيان" إلى حقل نصي مع datalist (بيانات من اليومية)
- [x] دعم الإضافة من الموردين/المقاولين/المعارض/الأوردرات
- **الملفات**: `src/app/journal/_new-journal-form.tsx`

### 6. boards/new و accessories/new
- [x] البيان: حقل نصي
- [x] الكود: حقل نصي
- [x] نوع الاكسسوار/الخامة: حقل نصي + datalist من القوائم الموجودة
- [x] زر "+ إضافة للقائمة" لإضافة نوع جديد بدون تكرار
- [x] API: material-types يعيد الموجود بدل 409 conflict
- [x] عرض إجمالي التكلفة تلقائياً
- **الملفات**: `src/app/_inventory-form.tsx`, `src/app/api/material-types/route.ts`

### 7. التفرقة بين إضافة صنف وشراء
- [x] **"+ صنف جديد"** = تعريف صنف جديد في المخزون (بدون حركة مالية)
  - `src/app/boards/new`، `src/app/accessories/new`
- [x] **"🛒 شراء"** = شراء كمية من صنف موجود + تسجيل في اليومية تلقائياً
  - صفحة جديدة `src/app/boards/buy` للشراء من الألواح
  - صفحة جديدة `src/app/accessories/buy` للشراء من الاكسسوارات
  - API جديد `src/app/api/boards/purchase` يحدّث المخزون ويسجّل حركة purchase
  - API جديد `src/app/api/accessories/purchase` يحدّث المخزون ويسجّل حركة purchase
- [x] إضافة زر 🛒 سريع في كل صف لشراء كمية من نفس الصنف
- [x] سعر الشراء متغير لكل عملية شراء
- [x] خيار "تسجيل في اليومية" قابل للتفعيل/الإلغاء
- **الملفات**: `src/app/boards/buy/page.tsx`, `src/app/accessories/buy/page.tsx`, `src/app/api/boards/purchase/route.ts`, `src/app/api/accessories/purchase/route.ts`

### 8. حذف قسم "حالة الأوردرات" من Dashboard
- [x] حذف كارت "🥧 حالة الأوردرات" ومخطط الـ Pie Chart
- [x] إزالة StatusPieChart من imports
- [x] توسيع WeeklyBarChart ليأخذ العرض الكامل
- [x] إعادة ترتيب الـ Layout بحيث لا توجد مساحة فارغة
- **الملفات**: `src/app/dashboard/page.tsx`, `src/components/DashboardCharts.tsx`

### 9. مورد جديد - نوع التعامل
- [x] تحويل "نوع التعامل" إلى حقل نصي مع datalist
- [x] يجلب الأنواع الفريدة من الموردين الحاليين
- [x] API يقبل أي نوع (بدون validation صارم)
- [x] إزالة التكرار في القيم
- **الملفات**: `src/app/suppliers/new/page.tsx`, `src/app/api/suppliers/route.ts`

### 10. صفحة المعارض - زر إضافة معرض
- [x] إضافة زر "+ معرض جديد" في الـ PageHeader
- [x] إضافة أزرار تعديل/حذف لكل صف
- [x] استخدام RowEditor للتعديل والحذف
- **الملفات**: `src/app/branches/page.tsx`

### 11. صفحة النثريات - النثريات الجديدة لا تظهر
- [x] إصلاح قراءة البيانات من API (expenses بدل items)
- [x] إصلاح فلتر التاريخ ليستخدم String() للمقارنة
- [x] إضافة create_journal=true في POST ليستمر في اليومية
- [x] إضافة payment_method للفورم
- **الملفات**: `src/app/overhead/page.tsx`, `src/app/overhead/_new-overhead-form.tsx`

### 12. زر طباعة الفاتورة من صفحة الأوردر
- [x] إضافة زر 🧾 فاتورة في كل صف من جدول الأوردرات
- [x] رابط مباشر لـ /orders/[id]/invoice
- **الملفات**: `src/app/orders/page.tsx`

---

## ملخص
- **تم إنجاز**: 12 من 12 مشكلة (100%) ✅

## الإضافات الجديدة
- API: `src/app/api/boards/purchase/route.ts` - شراء ألواح
- API: `src/app/api/accessories/purchase/route.ts` - شراء اكسسوارات
- صفحة: `src/app/boards/buy/page.tsx` - واجهة شراء الألواح
- صفحة: `src/app/accessories/buy/page.tsx` - واجهة شراء الاكسسوارات

