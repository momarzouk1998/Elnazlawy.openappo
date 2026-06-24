# 🚀 Mazaya Furniture - Development & Deployment Guide

## لـ Claude Code / OpenCode Agent

---

## 📋 معلومات السيرفر والمشروع

### السيرفر (DigitalOcean Droplet):
```
IP: 157.230.5.201
OS: Ubuntu 24.04.3 LTS
RAM: 2GB
CPU: 1 vCPU
Storage: 50GB
Root User: root
```

---

## 🔐 الاتصال بالسيرفر (SSH - الخطوة الأولى)

### **من Windows (PowerShell):**
```powershell
ssh root@157.230.5.201
```

### **من Mac/Linux (Terminal):**
```bash
ssh root@157.230.5.201
```

### **بعد الأمر، اكتب الـ Password:**
```
Password: [enter root password]
```

### **المتوقع تشوفه (نجاح الاتصال):**
```
Welcome to Ubuntu 24.04.3 LTS (GNU/Linux 6.8.0-71-generic x86_64)
...
root@OpenappO:~#
```

✅ الـ `root@OpenappO:~#` = أنت دخلت بنجاح

---

## 🔴 المشكلة الحالية (Status: June 24, 2026)

### **الحالة الآن:**
```
✅ التطبيق (Mazaya) → شغال بنجاح على https://mazaya.openappo.com
✅ Dokploy Dashboard → accessible على http://157.230.5.201:3000
✅ Application Container → running
❌ PostgreSQL Connection → NOT CONFIGURED YET
❌ Environment Variables → NOT ADDED YET
❌ Database Migrations → NOT RUN YET
```

### **الأعراض (لو حاولت تستخدم التطبيق):**
```
- الموقع يفتح بسهولة
- لكن أي عملية تحتاج database ستفشل
- في الـ logs تشوف: "Cannot connect to database"
- أو: "DATABASE_URL is not defined"
- أو: "ECONNREFUSED" أو "Connection refused"
```

### **السبب الجذري:**

1. **ما حطينا `DATABASE_URL` في Dokploy Environment Variables**
2. **ما أنشأنا Database و User في PostgreSQL بعد**
3. **ما وصلنا التطبيق بقاعدة البيانات بعد**

### **العلاج (الخطوات التي تحتاج تتم):**

```
1️⃣ إنشاء Database و User في PostgreSQL
   Command: CREATE DATABASE mazaya_db;
   
2️⃣ إضافة DATABASE_URL في Dokploy
   Value: postgresql://mazaya_user:password@dokploy-postgres:5432/mazaya_db
   
3️⃣ تشغيل Database Migrations
   Command: docker exec -it ... npm run migrate
   
4️⃣ عمل Redeploy للتطبيق
   Action: اضغط Deploy في Dokploy Dashboard
   
5️⃣ التحقق من الاتصال
   Test: جرب الموقع + شوف الـ logs
```

---

## 🐳 أوامر Docker الأساسية (بعد الاتصال)

### **شوف كل الـ Containers الشغالة:**
```bash
docker ps
```

**الناتج المتوقع:**
```
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS                    PORTS                                         NAMES
f32ad47af218   dokploy/dokploy:v0.29.8   "docker-entrypoint.s…"   39 minutes ago   Up 39 minutes (healthy)   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp   dokploy.1.vct396w0fvgkv2kul0nbfhapj
f2a92a7ed889   postgres:16               "docker-entrypoint.s…"   39 minutes ago   Up 39 minutes             5432/tcp                                      dokploy-postgres.1.8d4xfgpeuyuys4k1gvd7n3ti3
a450a3bbe449   redis:7                   "docker-entrypoint.s…"   39 minutes ago   Up 39 minutes             6379/tcp                                      dokploy-redis.1.rq8g580vxgwl8uicy8w0b4
```

---

### **شوف موارد السيرفر:**
```bash
free -h
```

**المتوقع:**
```
               total        used        free      shared  buff/cache   available
Mem:           1.9Gi       1.3Gi       300Mi        19Mi       553Mi       671Mi
Swap:             0B          0B          0B
```

---

### **شوف الـ Logs (للبحث عن الأخطاء):**
```bash
docker logs -f [CONTAINER_NAME_OR_ID] --tail 50
```

**مثال (لـ Dokploy):**
```bash
docker logs -f dokploy.1.vct396w0fvgkv2kul0nbfhapj --tail 50
```

اضغط `Ctrl+C` للخروج

---

## 🗄️ الوصول إلى PostgreSQL Container

### **الخطوة 1: اتصل بالسيرفر**
```bash
ssh root@157.230.5.201
```

### **الخطوة 2: ادخل PostgreSQL**
```bash
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres
```

### **الناتج (PostgreSQL Prompt):**
```
psql (16.0 (Debian 16.0-1.pgdg120+1))
Type "help" for help.

postgres=#
```

✅ الـ `postgres=#` = أنت داخل PostgreSQL الآن

---

## 🔄 سيناريو عملي كامل (من البداية للآخر)

### **في جهازك (الخطوة 1):**

افتح PowerShell أو Terminal واكتب:
```powershell
ssh root@157.230.5.201
```

### **ادخل الـ Password (الخطوة 2):**
```
Password: ••••••••••••
```

اضغط Enter (لا تقلق، ما تشوف النقاط)

### **في السيرفر الآن (الخطوة 3):**

شوف الـ containers:
```bash
docker ps
```

### **ادخل PostgreSQL (الخطوة 4):**
```bash
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres
```

### **أنشئ Database و User (الخطوة 5):**

ستكون الآن في `postgres=#` prompt، اكتب:
```sql
CREATE DATABASE mazaya_db;
CREATE USER mazaya_user WITH PASSWORD 'SecurePassword@2026!';
GRANT ALL PRIVILEGES ON DATABASE mazaya_db TO mazaya_user;
ALTER DATABASE mazaya_db OWNER TO mazaya_user;
\c mazaya_db
GRANT SCHEMA public TO mazaya_user;
GRANT USAGE ON SCHEMA public TO mazaya_user;
GRANT CREATE ON SCHEMA public TO mazaya_user;
\q
```

### **خرج من السيرفر (الخطوة 6):**
```bash
exit
```

الآن أنت في جهازك مرة تانية ✅

---

## ⚠️ مشاكل شائعة وحلولها

### **مشكلة: "Permission denied"**
```
Permission denied (publickey,password).
```

**الحل:**
- تأكد من الـ IP صحيح: `157.230.5.201`
- تأكد من الـ Password صحيح
- جرب مرة تانية

---

### **مشكلة: "Connection timed out"**
```
ssh: connect to host 157.230.5.201 port 22: Connection timed out
```

**الحل:**
- تحقق من الإنترنت
- السيرفر قد يكون معلق
- جرب مرة تانية بعد دقيقة

---

### **مشكلة: "Container not found"**
```
Error: No such container
```

**الحل:**
```bash
# شوف الأسماء الصحيحة
docker ps

# استخدم الاسم الدقيق من الناتج
docker exec -it [EXACT_NAME] psql -U postgres
```

---

### Dokploy Setup:
```
URL: http://157.230.5.201:3000
Version: v0.29.8
Status: ✅ Running

Containers:
- dokploy (reverse proxy)
- postgres:16 (database)
- redis:7 (cache)
```

### المشروع (GitHub):
```
Repository: https://github.com/momarzouk1998/Mazaya.openappo
Branch: main
Build Type: Nixpacks + Next.js
Node.js Version: 18 (⚠️ upgrade to 20+ needed)
```

### الدومين:
```
Production: mazaya.openappo.com
DNS Status: ✅ Configured (A Record → 157.230.5.201)
SSL: Let's Encrypt (configured in Dokploy)
```

---

## 🎯 المهام المطلوبة

### ✅ Task 1: إعداد PostgreSQL Database

**الهدف:** إنشاء قاعدة بيانات محلية على السيرفر + مستخدم معاد + صلاحيات

**الخطوات:**

1. **اتصل بالسيرفر:**
   ```bash
   ssh root@157.230.5.201
   ```

2. **ادخل PostgreSQL Container:**
   ```bash
   docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres
   ```

3. **أنشئ Database:**
   ```sql
   CREATE DATABASE mazaya_db;
   ```

4. **أنشئ User:**
   ```sql
   CREATE USER mazaya_user WITH PASSWORD 'SecurePassword@2026!';
   ```

5. **أعطِ الصلاحيات:**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE mazaya_db TO mazaya_user;
   ALTER DATABASE mazaya_db OWNER TO mazaya_user;
   \c mazaya_db
   GRANT SCHEMA public TO mazaya_user;
   GRANT USAGE ON SCHEMA public TO mazaya_user;
   GRANT CREATE ON SCHEMA public TO mazaya_user;
   ```

6. **اخرج من PostgreSQL:**
   ```sql
   \q
   ```

**التحقق:**
```bash
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U mazaya_user -d mazaya_db -c "\dt"
```

---

### ✅ Task 2: ربط Environment Variables في Dokploy

**الهدف:** إضافة متغيرات البيئة لـ Application

**في Dokploy Dashboard:**

1. اذهب إلى: **Projects → Mazaya → Applications → furniture-xhl2yk**
2. اضغط **Environment**
3. أضف المتغيرات التالية:

```
DATABASE_URL=postgresql://mazaya_user:SecurePassword@2026!@dokploy-postgres:5432/mazaya_db
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://mazaya.openappo.com
```

**ملاحظات:**
- `dokploy-postgres` = hostname الـ database container على Docker network
- ليس `localhost` أو `157.230.5.201`
- Port افتراضي: 5432

---

### ✅ Task 3: تشغيل Database Migrations (إن وجدت)

**الهدف:** تهيئة جداول قاعدة البيانات

**إذا كان المشروع يستخدم Prisma:**

1. **في المشروع المحلي:**
   ```bash
   npx prisma migrate dev --name init
   ```

2. **أو في السيرفر بعد Deploy:**
   ```bash
   docker exec -it furniture-xhl2yk.1.fwvcn7bls9yofztve60t667qf npm run migrate
   ```

**إذا كان يستخدم SQL scripts مباشرة:**
```bash
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U mazaya_user -d mazaya_db < /path/to/schema.sql
```

---

### ✅ Task 4: عمل Redeploy للتطبيق

**الهدف:** إعادة بناء وتشغيل التطبيق مع Environment variables الجديدة

**في Dokploy Dashboard:**

1. اذهب إلى: **Projects → Mazaya → Applications → furniture-xhl2yk**
2. اضغط **Deploy** (الزر الأخضر)
3. انتظر حتى ينتهي البناء (5-10 دقائق)

**التحقق من Logs:**
- اضغط **Logs**
- شوف آخر الـ logs لو فيه أخطاء
- يجب أن تشوف: `Ready in XXXms` ✅

---

### ✅ Task 5: اختبار الاتصال بقاعدة البيانات

**الهدف:** التأكد من أن التطبيق يتصل بـ Database بنجاح

**الطرق:**

1. **من خلال الموقع:**
   ```
   https://mazaya.openappo.com
   ```
   (يجب أن يحمّل بدون أخطاء database)

2. **من السيرفر - عمل Health Check:**
   ```bash
   docker exec -it furniture-xhl2yk.1.fwvcn7bls9yofztve60t667qf curl -s http://localhost:3000/api/health | grep -i database
   ```

3. **التحقق المباشر من Database:**
   ```bash
   docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U mazaya_user -d mazaya_db -c "SELECT version();"
   ```

---

## 📋 متطلبات المشروع (من القراءة التلقائية)

### Node.js & Dependencies:
- ✅ Node.js 18 (موجود)
- ⚠️ **TODO:** Upgrade to Node.js 20+
- ✅ npm/yarn (موجود)
- ✅ Next.js (موجود في package.json)

### قاعدة البيانات:
- ✅ PostgreSQL 16 (running on server)
- ⚠️ **TODO:** Database schema (الملفات المطلوبة):
  - `prisma/schema.prisma` (لو Prisma)
  - أو `migrations/` folder
  - أو SQL schema files

### Environment Variables المطلوبة:
```
[CRITICAL]
DATABASE_URL = postgresql://mazaya_user:password@dokploy-postgres:5432/mazaya_db

[RECOMMENDED]
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://mazaya.openappo.com
NEXT_PUBLIC_APP_NAME = Mazaya Furniture

[OPTIONAL - اضيفها لاحقاً حسب الحاجة]
JWT_SECRET = (اجعلها قوية إذا كنت تستخدمها)
API_KEY = (إذا كان لديك external APIs)
```

### Scripts المطلوبة في package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "migrate": "prisma migrate dev" (إن وجدت)
  }
}
```

---

## 🔍 Troubleshooting

### المشكلة: "Connection refused" لـ Database

**الحل:**
```bash
# تحقق من أن PostgreSQL بتشتغل
docker ps | grep postgres

# شوف الـ logs
docker logs dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs

# جرب الاتصال مباشرة
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres
```

---

### المشكلة: "Database does not exist"

**الحل:**
```bash
# تحقق من الـ databases الموجودة
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres -l

# أنشئ Database إذا لم تكن موجودة
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres -c "CREATE DATABASE mazaya_db;"
```

---

### المشكلة: "Permission denied" للمستخدم

**الحل:**
```bash
# أعد الصلاحيات
docker exec -it dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs psql -U postgres -c "
GRANT ALL PRIVILEGES ON DATABASE mazaya_db TO mazaya_user;
ALTER DATABASE mazaya_db OWNER TO mazaya_user;
"
```

---

### المشكلة: البناء يأخذ وقت طويل / Memory usage عالي

**الحل:**
```bash
# شوف الموارد
free -h
docker stats

# إذا كانت Memory < 500MB:
# أضف Swap (إذا لم تكن موجودة)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 📊 سجل المهام

- [ ] إنشاء Database و User في PostgreSQL
- [ ] ربط DATABASE_URL في Dokploy
- [ ] تشغيل Database Migrations
- [ ] عمل Redeploy للتطبيق
- [ ] اختبار الاتصال بـ Database
- [ ] Upgrade Node.js من 18 إلى 20+
- [ ] تحديد schema.prisma أو SQL migrations
- [ ] إضافة باقي Environment Variables

---

## 🚀 بعد إكمال كل شيء

1. **اختبر الموقع:**
   ```
   https://mazaya.openappo.com
   ```

2. **شوف الـ Logs:**
   - في Dokploy Dashboard → Logs
   - يجب أن تكون خالية من الأخطاء

3. **فعّل Auto-Deploy من GitHub:**
   - في Dokploy → Application Settings → Autodeploy
   - كل push إلى `main` سيعمل deploy تلقائي

4. **أضف نسخ احتياطية للـ Database:**
   ```bash
   # cron job للنسخة الاحتياطية اليومية
   docker exec dokploy-postgres.1.0tt3xzyz78odt2ew3kvg8vucs pg_dump -U mazaya_user mazaya_db > /backup/mazaya_db_$(date +%Y%m%d).sql
   ```

---

## 📞 معلومات الاتصال

- **السيرفر:** `157.230.5.201`
- **Dokploy Dashboard:** `http://157.230.5.201:3000`
- **الموقع:** `https://mazaya.openappo.com`
- **GitHub Repo:** `https://github.com/momarzouk1998/Mazaya.openappo`

---

## ⚙️ Hardware Specs

```
CPU: 1 vCPU
RAM: 2GB
Swap: 0B (اضف 2GB لو لزم)
Storage: 50GB

Recommended limits:
- Max concurrent users: 50-100
- Max database connections: 20
- Next.js workers: 4
```

---

**Last Updated:** June 24, 2026
**Status:** Development → Production
**Next Phase:** Add 19 more client databases (schema: client1_db, client2_db, ... client20_db)

