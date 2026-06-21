# دليل الإعداد - مصنع مزايا

## 🚀 للمطورين (Setup)

```bash
# 1) استنساخ المشروع
git clone <repo-url>
cd mazaya-system

# 2) تثبيت المتطلبات
npm install

# 3) إعداد ملف البيئة
cp .env.example .env.local
# عدّل القيم في .env.local من بيانات Supabase

# 4) تشغيل خادم التطوير
npm run dev
# افتح http://localhost:3000
```

---

## 🗄️ إعداد Supabase (Database + Auth)

### الخطوة 1: إنشاء مشروع
1. سجّل في [supabase.com](https://supabase.com) (مجاني)
2. أنشئ Project جديد
3. اختر Region قريب (Frankfurt للأوروبا/مصر)

### الخطوة 2: نسخ المفاتيح
من **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **سري — لا تنشره**

### الخطوة 3: تشغيل SQL
من **SQL Editor** في Supabase Dashboard، نفّذ بالترتيب:
1. افتح `sql/001_create_schema.sql` → الصقه → Run
2. افتح `sql/002_seed_data.sql` → الصقه → Run

### الخطوة 4: إنشاء مستخدم Admin
1. اذهب لـ **Authentication → Users → Add user**
2. Email: `abomrzk@gmail.com`
3. Password: `123456` (غيّرها لاحقاً)
4. **Auto Confirm User** ✓
5. اضغط Add

### الخطوة 5: ربط Auth ID
ارجع لـ SQL Editor ونفّذ:
```sql
UPDATE public.mazaya_users
SET auth_id = (SELECT id FROM auth.users WHERE email = 'abomrzk@gmail.com')
WHERE username = 'admin';
```

---

## 🌐 النشر على Vercel

### خطوة 1: رفع الكود على GitHub
```bash
git init
git add -A
git commit -m "feat: initial mazaya system"
git branch -M main
git remote add origin https://github.com/YOUR_USER/mazaya-system.git
git push -u origin main
```

### خطوة 2: ربط Vercel
1. سجّل في [vercel.com](https://vercel.com) بحساب GitHub
2. **New Project** → اختر `mazaya-system`
3. **Environment Variables** (نفس القيم من `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy**

### خطوة 3: الدومين
- Vercel بيديك دومين مجاني: `mazaya-system.vercel.app`
- لو عايز `mazaya.openappo.com`: Vercel → Settings → Domains → أضف الدومين → عدّل DNS عند مزود الدومين

---

## 👤 الدخول الأول (First Login)

| الحقل | القيمة |
|---|---|
| اسم المستخدم | `admin` |
| كلمة السر | `123456` |

**مهم:** غيّر الباسورد من صفحة "إدارة المستخدمين" فوراً.

---

## 📱 PWA (تثبيت على الموبايل)

- **Android**: افتح الموقع في Chrome → قائمة المتصفح → "Add to Home screen"
- **iOS**: افتح في Safari → زر المشاركة → "Add to Home Screen"

---

## 🏗️ بنية النظام

```
src/
├── app/                    # Next.js App Router
│   ├── api/auth/          # Auth API routes
│   ├── dashboard/         # لوحة التحكم
│   ├── suppliers/         # الموردين
│   ├── boards/            # مخزون الألواح
│   ├── accessories/       # مخزون الاكسسوارات
│   ├── branches/          # المعارض
│   ├── customers/         # العملاء
│   ├── orders/            # الأوردرات
│   ├── journal/           # اليومية
│   ├── overhead/          # النثريات
│   ├── contractors/       # المقاولين
│   ├── reports/           # التقارير
│   └── admin/
│       ├── users/         # إدارة المستخدمين (Admin فقط)
│       └── material-types/# قوائم الاختيارات
├── components/            # React components مشتركة
└── lib/                   # Utilities + Supabase clients
sql/
├── 001_create_schema.sql  # الجداول + Triggers + RLS
└── 002_seed_data.sql      # بيانات تجريبية
```

---

## 🔐 الأدوار والصلاحيات

| الدور | الوصف | الصلاحيات |
|---|---|---|
| **admin** (مدير المصنع) | محمد - صاحب المصنع | يشوف **كل الصفحات** + إدارة الموظفين |
| **branch_user** (موظف) | موظف مصنع بصلاحيات جزئية | يشوف بس الصفحات المحددة في `visible_modules` |

> النظام **داخلي** — كل الموظفين في نفس المصنع، فالموظف بيشوف كل البيانات (العملاء، المخزون، إلخ). اللي بيتحكم في إيه يظهر له هو **قائمة الصفحات المرئية** في الـ Sidebar.

### إضافة موظف
صفحة **إدارة الموظفين** (Admin فقط): حط اسم المستخدم، البريد/الهاتف، كلمة السر، واختار الـ Checkboxes للصفحات اللي يشوفها.

### إضافة صفحة جديدة للـ Checkboxes
عدّل `ALL_MODULES` في `src/lib/auth.ts`.

---

## 🛠️ استكشاف الأخطاء

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

### مشاكل Supabase
- تأكد من تشغيل كلا SQL files
- تأكد من تحديث `auth_id` في جدول `mazaya_users`
- RLS Policies مطبّقة — لو رفض أي استعلام، راجع Policies من Supabase Dashboard

### مشاكل Login
- تأكد من أن حساب Admin في Supabase Auth موجود
- تأكد من أن `auth_id` مربوط في `mazaya_users`
- كلمة السر مشفرة في Supabase Auth، ما تقدرش تشوفها

---

## 📞 الدعم

- **المشاكل التقنية**: افتح Issue على GitHub
- **الأسئلة عن النظام**: راجع `mazaya-furniture-system-spec.md`

---

© 2026 مصنع مزايا للأثاث - Mazaya Furniture
