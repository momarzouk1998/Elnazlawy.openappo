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

## 🗄️ إعداد Supabase خطوة بخطوة

### الخطوة 1: إنشاء حساب ومشروع

1. افتح [supabase.com](https://supabase.com) وسجّل بالإيميل بتاعك (مجاني).
2. بعد تسجيل الدخول، اضغط **"New Project"**.
3. املى الحقول:
   - **Name**: مثلاً `mazaya-furniture`
   - **Database Password**: كلمة سر قوية لقاعدة البيانات (**احفظها في مكان آمن**)
   - **Region**: اختر `Frankfurt (EU Central)` — الأقرب لمصر
4. اضغط **"Create new project"** وانتظر دقيقتين لحد ما يخلص الـ provisioning.

---

### الخطوة 2: نسخ المفاتيح الثلاث (مهمة جداً)

1. من الـ Sidebar الشمال، اضغط **⚙️ Settings** (أيقونة الترس في الأسفل).
2. من القائمة الجانبية، اختر **API**.
3. هتلاقي 3 حاجات محتاج تنسخهم:

| في Supabase Dashboard (صفحة API) | انسخه في `.env.local` باسم |
|---|---|
| **Project URL** (في قسم "Project URL") — شكله زي: `https://abcdefgh.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** key (في قسم "Project API keys" — المفتاح الطويل اللي بيبدأ بـ `eyJ...`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (نفس القسم — اضغط "Reveal" لإظهاره — **⚠️ سري**) | `SUPABASE_SERVICE_ROLE_KEY` |

4. افتح ملف `.env.local` في جذر المشروع، والصق القيم:

```bash
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **تحذير**: الـ `service_role` key بيدّي صلاحية كاملة لكل قاعدة البيانات (يتجاوز RLS). **لا تنشره** على GitHub أو تشاركه مع حد.

---

### الخطوة 3: إنشاء الجداول والبيانات

1. من الـ Sidebar الشمال في Supabase، اضغط **🔨 SQL Editor** (أيقونة الـ terminal).
2. اضغط **"New query"**.
3. **أول query** — إنشاء الجداول:
   - افتح ملف `sql/001_create_schema.sql` من المشروع في محرر النصوص
   - انسخ **كل** محتواه (Ctrl+A → Ctrl+C)
   - ارجع لـ Supabase → الصق في محرر SQL → اضغط **"Run"** (أو Ctrl+Enter)
   - لازم تشوف رسالة خضراء: `Success. No rows returned`
4. **تاني query** — البيانات التجريبية:
   - **"New query"** تاني
   - افتح `sql/002_seed_data.sql` → انسخ كل المحتوى → الصقه → **Run**
   - المفروض تشوف: `Success. 17 rows inserted` (أو رقم قريب)

---

### الخطوة 4: إنشاء أول حساب Admin

1. من الـ Sidebar، اضغط **🔒 Authentication** (أيقونة القفل).
2. اضغط تبويب **"Users"**.
3. اضغط **"Add user"** → **"Create new user"**.
4. املى:
   - **Email**: `abomrzk@gmail.com`
   - **Password**: `123456` (غيّرها لاحقاً من صفحة إدارة الموظفين)
   - **Auto Confirm User**: ✅ (مهم جداً — لو مش مفعّل هيطلب تأكيد الإيميل)
5. اضغط **"Create user"**.

---

### الخطوة 5: ربط حساب Auth بحساب الـ Profile

بعد ما عملت الـ user في Supabase Auth، لازم تربطه بالـ row في جدول `mazaya_users`:

1. ارجع لـ **SQL Editor** → **"New query"**.
2. الصق الـ SQL ده وشغّله:

```sql
UPDATE public.mazaya_users
SET auth_id = (SELECT id FROM auth.users WHERE email = 'abomrzk@gmail.com')
WHERE username = 'admin';
```

3. لو ظهر `Success. 1 row updated` يبقى تمام.

> 💡 **ليـه ده مهم؟** جدول `mazaya_users` فيه بيانات الموظف (الدور، الصفحات المرئية، إلخ). Supabase Auth فيه كلمة السر. الـ `auth_id` هو الجسر اللي بيربط الاتنين.

---

### الخطوة 6: تحقق إن كل حاجة تمام

في SQL Editor، شغّل:
```sql
SELECT u.username, u.role, u.email_or_phone, u.is_active,
       a.email as auth_email
FROM public.mazaya_users u
LEFT JOIN auth.users a ON u.auth_id = a.id
ORDER BY u.id;
```

لازم تشوف **5 صفوف**: `admin` + 4 موظفين (`mohandess`, `mohaseb`, `amen_makhzon`, `moteaba3`)، والـ admin مربوط بالإيميل `abomrzk@gmail.com`.

---

## 🌐 النشر على Vercel — خطوة بخطوة

### الخطوة 1: التأكد إن الكود على GitHub
الكود اترفع بالفعل على `https://github.com/momarzouk1998/Mazaya.openappo` (شوف الـ commit log).
لو عايز تعمل repo تاني، شوف `git push` instructions في `SETUP_AR.md` القديمة.

### الخطوة 2: إنشاء مشروع Vercel من GitHub

1. افتح [vercel.com](https://vercel.com) وسجّل بحساب GitHub بتاعك.
2. اضغط **"Add New → Project"**.
3. في قائمة **"Import Git Repository"**، اختار `momarzouk1998/Mazaya.openappo`.
4. اضغط **"Import"**.

### الخطوة 3: إعداد Environment Variables

في صفحة **Configure Project**:
1. وسّع قسم **"Environment Variables"**.
2. أضف **3 متغيرات** (النسخ واللصق من ملف `.env.local` بتاعك):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | الصق الـ Project URL من Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | الصق الـ anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | الصق الـ service_role key |

3. **مهم**: في كل متغير، اختار من Dropdown: **Production** + **Preview** + **Development** (الـ 3 مع بعض).

### الخطوة 4: Deploy

1. اضغط **"Deploy"**.
2. استنى 2-3 دقائق لحد ما يخلص الـ build.
3. لو ظهرت ✅ **"Congratulations!"** يبقى تمام.

### الخطوة 5: افتح الموقع

- Vercel بيديك URL مجاني زي: `https://mazaya-openappo.vercel.app`
- لو عايز دومين مخصص (`mazaya.openappo.com`):
  - Vercel → **Settings → Domains** → اكتب الدومين → **Add**
  - هيظهرلك DNS records، عدّلها عند مزود الدومين بتاعك (openappo.com)
  - عادةً: أضف CNAME record يشير لـ `cname.vercel-dns.com`

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
