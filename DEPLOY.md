# 🚀 DEPLOY — Mazaya Furniture System

> **القاعدة الذهبية:** مفيش deploy مباشر على السيرفر.
> الكود بيرفع على GitHub الأول، وبعدها بيتبني أوتوماتيكياً ويتبعت للسيرفر.
> الطريقة دي بتضمن إن عندك نسخة احتياطية + تاريخ كامل للتعديلات.

---

## 🧠 الفكرة العامة (ازاي بنشتغل)

```
جهازك (الكود)  →  GitHub (المصدر الرسمي)  →  GitHub Actions (تبني)  →  GHCR (صورة Docker)  →  السيرفر
     ⬆                    ⬆                         ⬆                         ⬆                      ⬆
  بتعدّل هنا         بترفع هنا              بتبني تلقائياً         بتتحفظ هنا            بيسحب ويشغّل
```

### طريقة الـ CI/CD (تلقائية)

المشروع بيستخدم **GitHub Actions** للـ deploy الأوتوماتيكي:
1. بتدفش كود على GitHub
2. GitHub Actions بيبني Docker image وبيرفعها على **GitHub Container Registry (GHCR)**
3. بعدين بيتصل بالسيرفر عبر SSH وبينزل الصورة الجديدة وبيحدث الـ Docker Swarm service

> ⚠️ ده يعني **مفيش build على السيرفر** — ده بيوفر كتير في استهلاك الرام!

---

## 📋 المتطلبات (مرة وحدة)

قبل ما تبدأ، لازم تتأكد إن:

1. **Git متثبت** على جهازك (`git --version`).
2. **SSH key متظبط** مع GitHub — ملف `~/.ssh/config` فيه:
   ```
   Host github.com-momarzouk
       HostName github.com
       User git
       IdentityFile ~/.ssh/id_ed25519_momarzouk
   ```
3. **الـ repo** متنسّخ محلياً في `D:\OPEN APPS\mazaya\mazaya-system`.
4. **بيانات السيرفر** موجودة في `SERVER_ACCESS.md`.
5. **GitHub Secrets** متظبوطة في الـ repo:
   - `SSH_HOST` — IP السيرفر
   - `SSH_USER` — مستخدم SSH
   - `SSH_PRIVATE_KEY` — مفتاح SSH الخاص

---

## ✅ خطوات الـ Deploy (اتبعها بالترتيب)

### الخطوة 1: تأكد إن الكود شغّال محلياً

قبل ما ترفع حاجة، اتأكد إنها مفيهاش أخطاء:

```bash
cd "D:/OPEN APPS/mazaya/mazaya-system"
npm run build
```

- لو ظهر `✓ Compiled successfully` → كمّل للخطوة 2.
- لو ظهر خطأ (`Type error` أو `Failed`) → **وقّف**، اصلح الخطأ، وارجع جرّب تاني.
  **مترفعش كود مكسور.**

### الخطوة 2: ارفع الكود لـ GitHub

```bash
cd "D:/OPEN APPS/mazaya/mazaya-system"

# شوف إيه اللي اتعدّل
git status

# ضف كل التعديلات
git add -A

# احفظ التعديلات برسالة واضحة
git commit -m "feat: وصف مختصر للي عملته"

# ارفع لـ GitHub
git push origin main
```

**نصائح لرسالة الـ commit:**
- استخدم `feat:` لميزة جديدة، `fix:` لإصلاح، `style:` للشكل.
- مثال كويس: `feat: إضافة صفحة الموردين وربطها بالداتابيز`

### الخطوة 3: استنى الـ CI/CD (تلقائي!)

بعد ما تدفع، روح على GitHub:
1. افتح repo: `https://github.com/momarzouk1998/Mazaya.openappo`
2. ادخل على **Actions** tab
3. هتلاقي الـ workflow شغال
4. استنى لحد ما ياخد علامة ✓ (عادة 3-5 دقايق)

لو فشل → اقرأ الخطأ في الـ logs واصلحه، بعدين رجع ارفع.

### الخطوة 4: تأكد إنه اتنزل على السيرفر

```bash
ssh root@64.226.118.40

# شوف حالة الـ Docker Swarm service
docker service ps furniture-xhl2yk --no-trunc

# شوف الـ container شغّال
docker ps --filter name=furniture-xhl2yk

# شوف اللوجز
docker logs $(docker ps --filter name=furniture-xhl2yk -q | head -1) --tail 20
```

### الخطوة 5: اختبر الموقع

```bash
# من جهازك (بره السيرفر)
curl -s -o /dev/null -w "%{http_code}" https://mazaya.openappo.com/
```

- `200` = تمام، شغّال. ✅
- `500` = في مشكلة في الكود. شوف اللوجز. ❌
- `502` = الكونتينر مش شغّال أو Nginx مش لاقيه. ❌

---

## ⚡ الاختصار (لو عايز تنسخه دفعة وحدة)

```bash
# === من جهازك ===
cd "D:/OPEN APPS/mazaya/mazaya-system"
git add -A && git commit -m "feat: وصف التعديل" && git push origin main
# ... وبعدين استنى الـ CI/CD يخلص (3-5 دقايق) ...
```

---

## ⚡ الـ Deploy اليدوي (لو الـ CI/CD وقف)

لو الـ GitHub Actions اتعطل أو عايز تنزل يدوياً:

```bash
ssh root@64.226.118.40

# سحب الصورة الجديدة من GHCR
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest

# تحديث الـ Swarm service
docker service update \
  --image furniture-xhl2yk:latest \
  --force \
  furniture-xhl2yk
```

---

## 🛡️ تحسينات تقليل استهلاك الموارد (مهم!)

السيرفر 2GB RAM بس ومشترك مع OpenGym. التحسينات دي مظبوطة عشان نتجنب وقوع السيرفر:

### 1. Dockerfile محسن (NODE_OPTIONS)
الـ Dockerfile متظبط بحيث:
- **أثناء الـ build:** `NODE_OPTIONS="--max-old-space-size=1280"` (max 1.3GB)
- **في الـ production:** `NODE_OPTIONS="--max-old-space-size=512"` (max 512MB)
- **أثناء الـ install:** `NODE_OPTIONS="--max-old-space-size=1024"` (max 1GB)
- ده بيمنع Node إنه يسحب كل الـ RAM ويوقع السيرفر.

### 2. الـ build بيحصل على GitHub Actions
مش على السيرفر! ده معناه إن الـ RAM للسيرفر متتأثرش أثناء الـ build.
الـ build بيحصل على GitHub runners (7GB RAM مجاني) وبيتحفظ الصورة على GHCR.

### 3. Connection Pool محسّن
الـ `pg` pool متظبط بحيث:
- `max: 5` (بدل 10) — أقل استهلاك رام
- `idleTimeoutMillis: 30000` — الاتصالات الفاضية بتتقفل بعد 30 ثانية
- `connectionTimeoutMillis: 10000` — timeout 10 ثانية

### 4. مراقبة الاستهلاك
بعد كل deploy، اتأكد إن الاستهلاك كويس:
```bash
# استهلاك RAM الكلي
free -h

# استهلاك الكونتينرات
docker stats --no-stream

# استهلاك Mazaya تحديداً
docker stats $(docker ps --filter name=furniture-xhl2yk -q | head -1) --no-stream
```

---

## 🛡️ إعدادات سيرفر (لمرة وحدة)

### تأكد من Swap File
```bash
swapon --show
# المفروض تشوف /swapfile بحجم 2G
# لو مش موجود → شوف SERVER_ACCESS.md
```

### تأكد من Docker Log Rotation
```bash
cat /etc/docker/daemon.json
# المفروض يكون فيه:
# {
#   "log-driver": "json-file",
#   "log-opts": {
#     "max-size": "10m",
#     "max-file": "3"
#   }
# }
```

---

## 🧹 تنظيف القرص (اعمله مرة كل أسبوعين)

```bash
# شوف المساحة المستخدمة
docker system df

# امسح الصور القديمة (آمن)
docker image prune -a

# تنظيف شامل (لو محتاج)
docker system prune -a --volumes
```

---

## 🚨 مشاكل شائعة وحلولها

### المشكلة: GitHub Actions فاشل
**السبب:** خطأ في الكود أو مشكلة في الـ Secrets.
**الحل:** روح على GitHub → Actions → اقرأ الخطأ الأحمر.

### المشكلة: `docker service update` فاشل
**السبب:** PostgreSQL container مش شغال.
**الحل:**
```bash
docker ps --filter name=mazaya-postgres
# لو فاضي → شغّله من جديد (شوف SERVER_ACCESS.md)
```

### المشكلة: الموقع بيرجع `502 Bad Gateway`
**السبب:** الكونتينر مش شغّال أو Nginx مش متظبط.
**الحل:**
```bash
docker ps --filter name=furniture-xhl2yk
docker logs $(docker ps --filter name=furniture-xhl2yk -q | head -1) --tail 50
systemctl restart nginx
```

### المشكلة: الموقع بيرجع `500`
**السبب:** خطأ في الكود (غالباً في الـ API).
**الحل:**
```bash
docker logs $(docker ps --filter name=furniture-xhl2yk -q | head -1) --tail 100
```

---

## 🔒 قواعد مهمة (ممنوع تكسرها)

1. **مفيش deploy مباشر على السيرفر.** كل تعديل لازم يمر عبر GitHub.
2. **مفيش تعديل على ملفات السيرفر يدوياً** (`.env` استثناء — بس بحذر).
3. **مترفعش كود مكسور** — اتأكد إن `npm run build` ينجح محلياً الأول.
4. **اعمل backup قبل أي تعديل كبير:**
   ```bash
   # لو PostgreSQL شغال في Docker
   docker exec mazaya-postgres pg_dump -U mazaya mazaya_factory > /root/mazaya-backup-$(date +%Y%m%d).sql
   ```
5. **لو مش متأكد من حاجة → اسأل** بدل ما تكسر الـ production.

---

## 📁 ملفات مهمة على السيرفر

| الملف | الوظيفة |
|---|---|
| Docker Swarm service | `furniture-xhl2yk` — التطبيق |
| PostgreSQL container | `mazaya-postgres` — قاعدة البيانات |
| Nginx config | `/etc/nginx/sites-available/mazaya` (لو موجود) |
| SSL cert | `/etc/letsencrypt/live/mazaya.openappo.com/` (لو موجود) |

---

*آخر تحديث: 2026-06-28*
