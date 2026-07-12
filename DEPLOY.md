# 🚀 دليل النشر — نظام النزلاوي (ELNAZLAWY)

> **آخر تحديث:** 12 يوليو 2026
> **الطريقة:** GitHub Actions يبني → GHCR → SSH Deploy → السيرفر (نفس سيرفر مازايا، service مختلف)

---

## 📑 جدول المحتويات

1. [المعمارية](#-1-المعمارية)
2. [الـ Pipeline التقني](#-2-الـ-pipeline-التقني)
3. [خطوات النشر اليومية](#-3-خطوات-النشر-اليومية)
4. [GitHub Actions Workflows](#-4-github-actions-workflows)
5. [إعداد GitHub Secrets](#-5-إعداد-github-secrets)
6. [حل المشاكل](#-6-حل-المشاكل)
7. [حل يدوي للطوارئ](#-7-حل-يدوي-للطوارئ)
8. [Dockerfile والملاحظات](#-8-dockerfile-والملاحظات)
9. [إدارة الموارد](#-9-إدارة-الموارد)
10. [قواعد مهمة](#-10-قواعد-مهمة)

---

## 🧠 1. المعمارية

### النظام: SSH-First (نفس mazaya)

```
┌─────────────────┐
│  جهازك (تعديل) │  ← تعدل الكود محلياً
└────────┬────────┘
         │ git push
         ▼
┌─────────────────────────┐
│  GitHub                 │
│  momarzouk1998/         │
│  Elnazlawy.openappo     │
└────────┬────────────────┘
         │ webhook
         ▼
┌──────────────────────────────────────┐
│  GitHub Actions                      │
│  ──────────────                      │
│                                      │
│  📦 build-and-push.yml:              │
│     • Build Docker image             │
│     • Push → GHCR                    │
│                                      │
│  🚀 deploy.yml:                      │
│     • SSH to server                  │
│     • docker pull + tag + update     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│  السيرفر             │
│  64.226.118.40       │
│  (نفس سيرفر مازايا)  │
│                      │
│  Docker Swarm:       │
│  service:            │
│  elnazlawy-x9y8z7    │
│  (port 3002)         │
│                      │
│  PostgreSQL:         │
│  schema: elnazlawy   │
│  (مشارك مع mazaya)   │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Nginx               │
    │  elnazlawy.openappo  │
    │  .com                │
    └──────────┬───────────┘
               │
               ▼
    https://elnazlawy.openappo.com
```

### مميزات النظام:
- ✅ **البناء على GitHub** (مش على السيرفر) — توفير RAM
- ✅ **النشر عبر SSH** — موثوق ويعمل دائماً
- ✅ **نفس سيرفر mazaya** — لا تكاليف إضافية
- ✅ **Schema منفصل** (`elnazlawy`) — لا تعارض مع mazaya
- ✅ **Service منفصل** (`elnazlawy-x9y8z7`) — على port 3002

---

## ⚙️ 2. الـ Pipeline التقني

### المرحلة 1: المصدر (GitHub)
- **Repository:** `github.com/momarzouk1998/Elnazlawy.openappo`
- **Branch:** `main` فقط
- **Trigger:** كل push على main

### المرحلة 2: البناء (GitHub Actions)
- **Workflow:** `.github/workflows/build-and-push.yml`
- **Runner:** `ubuntu-latest` (سحابي)
- **الخطوات:** Checkout → Buildx → Login GHCR → Build + Push

### المرحلة 3: التخزين (GHCR)
- **Registry:** `ghcr.io`
- **Package:** `momarzouk1998/elnazlawy.openappo`
- **Tags:** `latest` و `main-<sha>`

### المرحلة 4: النشر (SSH من GitHub)
- **Workflow:** `.github/workflows/deploy.yml`
- **Runner:** `ubuntu-latest`
- **الطريقة:** SSH action يستخدم secrets
- **الخطوات:** Pull → Tag → Service Update → Health Check

### المرحلة 5: الـ Swarm Service
- **Service:** `elnazlawy-x9y8z7`
- **Image:** `elnazlawy-x9y8z7:latest` (محلي)
- **Network:** host
- **Port:** 3002 (داخلي) → Nginx reverse proxy

### المرحلة 6: Nginx
- **Domain:** `elnazlawy.openappo.com`
- **SSL:** Let's Encrypt
- **Proxy:** `http://127.0.0.1:3002`

### المرحلة 7: Database
- **نفس Postgres** بتاع mazaya (مشترك)
- **Schema:** `elnazlawy` (منفصل)
- **Connection:** `postgresql://elnazlawy:password@localhost:5432/elnazlawy_db?schema=elnazlawy`

---

## ✅ 3. خطوات النشر اليومية

### الخطوة 1: تأكد إن الكود شغّال محلياً
```bash
cd "D:/OPEN APPS/DigitalOcian Projects/elnazlawy-system"
npm run dev
# افتح http://localhost:3000 وجرب
```

### الخطوة 2: ارفع على GitHub
```bash
git add -A
git commit -m "feat: وصف التعديل"
git push origin main
```

### الخطوة 3: راقب الـ Actions
https://github.com/momarzouk1998/Elnazlawy.openappo/actions

| الوقت | ما يحدث |
|-------|---------|
| 0:00 | workflow يبدأ |
| 0:30 | build يبدأ |
| 2:00 | build خلص + push لـ GHCR |
| 2:30 | deploy يبدأ (SSH) |
| 3:00 | الموقع متحدث ✅ |

### الخطوة 4: تأكد من الموقع
```bash
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://elnazlawy.openappo.com
```
أو افتح المتصفح: https://elnazlawy.openappo.com

---

## 🤖 4. GitHub Actions Workflows

### Workflow 1: `build-and-push.yml`
**المسار:** `.github/workflows/build-and-push.yml`

### Workflow 2: `deploy.yml` (SSH-First)
**المسار:** `.github/workflows/deploy.yml`

**الـ Service name:** `elnazlawy-x9y8z7` (port 3002 داخلي)
**الـ Image:** `elnazlawy-x9y8z7:latest` (محلي على السيرفر)
**الـ GHCR Image:** `ghcr.io/momarzouk1998/elnazlawy.openappo:latest`

---

## 🔐 5. إعداد GitHub Secrets

**المكان:** https://github.com/momarzouk1998/Elnazlawy.openappo/settings/secrets/actions

### الـ Secrets المطلوبة (3):

| Secret | القيمة | ملاحظة |
|---|---|---|
| `SSH_HOST` | `64.226.118.40` | IP السيرفر (نفس mazaya) |
| `SSH_USER` | `root` | يوزر SSH |
| `SSH_PRIVATE_KEY` | محتوى `~/.ssh/id_ed25519` | **نفس المفتاح بتاع mazaya** |

> ⚠️ **نفس الـ Secrets بتاعة mazaya** — لأن نفس السيرفر + نفس الـ SSH key. ممكن تنسخهم من repo مازايا.

---

## 🚨 6. حل المشاكل

### المشكلة: الموقع لا يتحدث بعد push

**التشخيص:**
1. افتح https://github.com/momarzouk1998/Elnazlawy.openappo/actions
2. شوف آخر workflow run

#### Build & Push فشل ❌
**الحل:**
```bash
# محلياً
cd "D:/OPEN APPS/DigitalOcian Projects/elnazlawy-system"
npm install
git add package.json package-lock.json
git commit -m "fix: sync package-lock"
git push origin main
```

#### Deploy فشل ❌ (Permission denied)
**الحل:**
1. تأكد إن `SSH_PRIVATE_KEY` في GitHub يحتوي على `id_ed25519`
2. احذف الـ secret القديم وأضفه من جديد

#### كل شيء ✅ لكن الموقع قديم
```bash
# على السيرفر
ssh root@64.226.118.40
docker service ps elnazlawy-x9y8z7
docker service logs elnazlawy-x9y8z7 --tail 50
```

---

### المشكلة: 502 Bad Gateway

**السبب:** الـ service مش شغّال أو الـ container مش متصل

**الحل:**
```bash
ssh root@64.226.118.40
docker service ps elnazlawy-x9y8z7
docker service logs elnazlawy-x9y8z7 --tail 50
```

---

### المشكلة: Database Connection Error

**السبب:** الـ DATABASE_URL مش متظبوط أو الـ schema مش موجود

**الحل:**
```bash
ssh root@64.226.118.40
docker exec -it mazaya-postgres psql -U elnazlawy -d elnazlawy_db
\dn  # لازم تشوف schema: elnazlawy
```

---

## 🛠️ 7. حل يدوي للطوارئ

### من جهازك (PowerShell):
```powershell
ssh root@64.226.118.40 "docker pull ghcr.io/momarzouk1998/elnazlawy.openappo:latest && docker tag ghcr.io/momarzouk1998/elnazlawy.openappo:latest elnazlawy-x9y8z7:latest && docker service update --image elnazlawy-x9y8z7:latest --force elnazlawy-x9y8z7 && sleep 20"
```

### أو خطوة بخطوة:
```bash
ssh root@64.226.118.40
docker pull ghcr.io/momarzouk1998/elnazlawy.openappo:latest
docker tag ghcr.io/momarzouk1998/elnazlawy.openappo:latest elnazlawy-x9y8z7:latest
docker service update --image elnazlawy-x9y8z7:latest --force elnazlawy-x9y8z7
sleep 20
docker service ps elnazlawy-x9y8z7
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://elnazlawy.openappo.com
```

---

## 🐳 8. Dockerfile والملاحظات

**المسار:** `Dockerfile` (في root)

### المراحل:
1. **base** — Node 20 Alpine
2. **deps** — `npm ci --ignore-scripts`
3. **builder** — Prisma generate + Next.js build
4. **runner** — Production image مع OpenSSL 3.x

### ملاحظات:
- **NODE_OPTIONS محدودة:** 1024MB (deps) / 1280MB (build) / 512MB (runtime)
- **Prisma binary target:** `linux-musl-openssl-3.0.x`
- **HOSTNAME=0.0.0.0** — ضروري لـ Swarm
- **`prisma db push` تلقائي** — عند تشغيل الـ container لأول مرة

### عند أول Deploy:
```bash
ssh root@64.226.118.40

# 1. إنشاء database & user (مرة واحدة)
docker exec -it mazaya-postgres psql -U mazaya -d mazaya
CREATE USER elnazlawy WITH PASSWORD 'Elnazlawy2026!Secure';
CREATE DATABASE elnazlawy_db OWNER elnazlawy;
GRANT ALL PRIVILEGES ON DATABASE elnazlawy_db TO elnazlawy;
\c elnazlawy_db
GRANT ALL ON SCHEMA public TO elnazlawy;
\q

# 2. تحديث .env على السيرفر
nano /opt/elnazlawy/.env
# DATABASE_URL=postgresql://elnazlawy:Elnazlawy2026!Secure@localhost:5432/elnazlawy_db
# JWT_SECRET=<random-32-chars>
# NEXT_PUBLIC_SITE_URL=https://elnazlawy.openappo.com

# 3. إنشاء initial Swarm service
docker service create \
  --name elnazlawy-x9y8z7 \
  --network host \
  --restart-condition any \
  --env-file /opt/elnazlawy/.env \
  --mount type=bind,source=/opt/elnazlawy/.env,target=/app/.env,readonly \
  elnazlawy-x9y8z7:latest

# 4. تشغيل الـ seed
docker exec $(docker ps --filter name=elnazlawy-x9y8z7 -q | head -1) node /app/prisma/seed.js
# أو: npm run db:seed (محلياً مع DATABASE_URL المؤقت)
```

---

## 🛡️ 9. إدارة الموارد (السيرفر 2GB)

### الاستهلاك المتوقع:
- **mazaya:** ~1.2 GB
- **elnazlawy:** ~0.8 GB
- **postgres:** ~0.2 GB
- **nginx + system:** ~0.3 GB
- **الإجمالي:** ~2.5 GB ⚠️ **ممكن يبقى ضيق**

### التحسينات المطبقة:
- ✅ البناء على GitHub (موفر رئيسي للـ RAM)
- ✅ NODE_OPTIONS محدودة في كل مرحلة
- ✅ Multi-stage build (صورة نهائية ~410MB)
- ✅ Standalone Next.js output

### لو السيرفر بقى ضيق:
1. **أرخص حل:** ترقية السيرفر لـ 4GB (+$12/شهر)
2. **حل وسط:** تشغيل elnazlawy على Droplet منفصل صغير ($6/شهر)
3. **حل مؤقت:** إيقاف mazaya مؤقتاً

---

## 🔒 10. قواعد مهمة

1. **مفيش deploy مباشر على السيرفر** — دائماً عبر GitHub
2. **مفيش build على السيرفر** — البناء في GitHub Actions
3. **متشغّلش npm run build على السيرفر** — ممنوع
4. **متمسحش الـ Swarm service** إلا لو عارف إيه اللي بتعمله
5. **Schema الاسم `elnazlawy`** — لا تغيره أبداً (تعارض مع mazaya)
6. **Service name `elnazlawy-x9y8z7`** — لا تغيره (Nginx يعتمد عليه)

---

## 📞 معلومات التواصل

| الحاجة | القيمة |
|---|---|
| **السيرفر** | `64.226.118.40` (DigitalOcean Frankfurt) — **مشترك مع mazaya** |
| **Domain** | `elnazlawy.openappo.com` |
| **GitHub** | `github.com/momarzouk1998/Elnazlawy.openappo` |
| **GHCR** | `ghcr.io/momarzouk1998/elnazlawy.openappo` |
| **Service** | `elnazlawy-x9y8z7` (port 3002) |
| **DB Schema** | `elnazlawy` (في `mazaya-postgres` container) |
| **الموقع** | https://elnazlawy.openappo.com |

---

*آخر تحديث: 2026-07-12 — Migration v1 من AppSheet*
