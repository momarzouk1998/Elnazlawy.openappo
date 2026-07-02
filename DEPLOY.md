# 🚀 DEPLOY — Mazaya System

> **القاعدة الذهبية:** مفيش deploy مباشر على السيرفر.
> الكود بيرفع على GitHub الأول، وبعدها CI/CD يبني Docker image ويرفعها على GHCR، والسيرفر يحدث الخدمة أوتوماتيك.

---

## 📑 جدول المحتويات

1. [المعمارية (ازاي الشغل بنفسج)](#-المعمارية-ازاي-الشغل-بنفسج)
2. [الـ Pipeline التقني بالتفصيل](#-الـ-pipeline-التقني-بالتفصيل)
3. [خطوات الـ Deploy اليومية](#-خطوات-الـ-deploy-اليومية)
4. [GitHub Actions Workflow](#-github-actions-workflow)
5. [Dockerfile و OpenSSL/Prisma](#-dockerfile-و-opensslprisma)
6. [إدارة الـ Swarm Service](#-إدارة-الـ-swarm-service)
7. [حل المشاكل (Troubleshooting)](#-حل-المشاكل-troubleshooting)
8. [حل يدوي للطوارئ (Manual Deploy)](#-حل-يدوي-للطوارئ-manual-deploy)
9. [إدارة الموارد (السيرفر 2GB RAM)](#-إدارة-الموارد-السيرفر-2gb-ram)
10. [المتغيرات والـ Secrets](#-المتغيرات-والـ-secrets)
11. [النسخ الاحتياطي](#-النسخ-الاحتياطي)
12. [قواعد مهمة](#-قواعد-مهمة)

---

## 🧠 المعمارية (ازاي الشغل بنفسج؟)

```
┌─────────────────┐
│  جهازك (تعديل) │   ← تعدّل الكود محلياً (npm run dev للتجربة)
└────────┬────────┘
         │ git push
         ▼
┌─────────────────────────┐
│  GitHub (المصدر الرسمي) │   ← momarzouk1998/Mazaya.openappo
└────────┬────────────────┘
         │ webhook
         ▼
┌──────────────────────────────────────┐
│  GitHub Actions (CI/CD)              │
│  ─────────────────────               │
│  1. Checkout الكود                    │
│  2. Build Docker image (multi-stage) │
│  3. Push image → GHCR                │
│  4. SSH على السيرفر                  │
│  5. docker service update --force    │
└────────┬─────────────────────────────┘
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│  GHCR                │         │  السيرفر             │
│  ────                │         │  ───────             │
│  ghcr.io/momarzouk/  │  pull   │  64.226.118.40       │
│  mazaya.openappo:    │ ──────► │                      │
│  latest              │         │  Docker Swarm        │
└──────────────────────┘         │  service:            │
                                  │  furniture-xhl2yk    │
                                  │  (port 3001)         │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │  Nginx (reverse)     │
                                  │  mazaya.openappo.com │
                                  │  port 443 (HTTPS)    │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  👤 المستخدمين
                                  https://mazaya.openappo.com
```

**مميزات الـ architecture:**
- ✅ لو السيرفر وقع، الكود آمن على GitHub + الصورة على GHCR.
- ✅ الـ build مبيستهلكش موارد السيرفر (بيحصل على GitHub).
- ✅ الـ deploy كامل أوتوماتيك — **مافيش داعي تدخل على السيرفر يدوي** (في الحالة العادية).
- ✅ تاريخ كامل لكل تعديل + Rollback سهل (ارجع لـ commit قديم).

---

## ⚙️ الـ Pipeline التقني بالتفصيل

### المرحلة 1: المصدر — GitHub
- **Repository:** `https://github.com/momarzouk1998/Mazaya.openappo.git`
- **الـ branch الرئيسي:** `main` (ممنوع تـ push على أي branch تاني بدون تنسيق)
- **Authentication:** SSH key مسجّل في `~/.ssh/id_ed25519_momarzouk`

### المرحلة 2: البناء — GitHub Actions
- **Workflow file:** `.github/workflows/build-and-push.yml`
- **Runner:** `ubuntu-latest` (مش على السيرفر — ده بيحمي الرام)
- **الخطوات:**
  1. `actions/checkout@v4` — يسحب الكود
  2. `docker/setup-buildx-action@v3` — يجهز Docker BuildKit
  3. `docker/login-action@v3` — يسجل دخول GHCR
  4. `docker/metadata-action@v5` — يحدد الـ tags (`latest` + `main-<sha>`)
  5. `docker/build-push-action@v6` — يبني الـ image ويـ push
  6. `appleboy/ssh-action@v1.2.0` — يعمل SSH على السيرفر وينفّذ deploy

### المرحلة 3: التخزين — GHCR
- **Registry:** `ghcr.io`
- **Package:** `momarzouk1998/mazaya.openappo`
- **Tags:**
  - `latest` — آخر build ناجح على `main`
  - `main-<commit-sha>` — كل commit على حدة (للـ rollback)

### المرحلة 4: النشر — Docker Swarm
- **Manager node:** `openappo-gym-prod` (نفس السيرفر — single-node swarm)
- **Service name:** `furniture-xhl2yk`
- **Image المُستخدم:** `furniture-xhl2yk:latest` (محلي بعد tag)
- **Network mode:** `host` (يشارك network السيرفر)
- **Restart policy:** `any` (بيرجع لو وقع)
- **Port داخلي:** `3001` (Nginx بيعمل reverse proxy)
- **Container user:** `nextjs` (non-root)

### المرحلة 5: الـ Web Server — Nginx
- **Domain:** `mazaya.openappo.com`
- **SSL:** Let's Encrypt (Certbot)
- **Proxy pass:** `http://127.0.0.1:3001` (الكونتينر)
- **Config file:** `/etc/nginx/sites-available/mazaya`

---

## ✅ خطوات الـ Deploy اليومية

### الخطوة 1: تأكد إن الكود شغّال محلياً

```bash
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
npm run dev   # شغّل المشروع محلياً وجرّب
```

**قبل ما ترفع:**
- ✅ اختبر الصفحة المتأثرة (افتحها في المتصفح)
- ✅ لو غيّرت في Prisma schema، شغّل `npx prisma generate` ثم `npx prisma db push` (لو عندك DB محلي)
- ✅ لو ضفت package جديد، اتأكد إنه في `package.json` و `package-lock.json`

**اختبار الـ build الكامل (اختياري، لكنه كويس):**
```bash
npm run build
```
- لو ظهر `✓ Compiled successfully` → كمّل.
- لو ظهر خطأ → **وقّف**، اصلحه، وارجع جرّب.

### الخطوة 2: ارفع الكود لـ GitHub

```bash
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"

# شوف إيه اللي اتعدّل
git status

# ضيف كل التعديلات
git add -A

# احفظ التعديلات
git commit -m "fix: وصف التعديل"

# ارفع على GitHub
git push origin main
```

**رسالة commit واضحة (Conventional Commits):**

| Prefix | الاستخدام | مثال |
|---|---|---|
| `feat:` | ميزة جديدة | `feat: إضافة تقرير الأرباح مع الفلترة بالشهر` |
| `fix:` | إصلاح مشكلة | `fix: حل خطأ 500 في صفحة الأوردرات` |
| `style:` | تغيير شكل/mظهر | `style: تحسين ألوان الـ sidebar` |
| `refactor:` | إعادة هيكلة الكود | `refactor: استخراج API calls لـ hooks` |
| `chore:` | مهام صيانة | `chore: تحديث Prisma للنسخة 5.22` |
| `docs:` | توثيق | `docs: تحديث DEPLOY.md` |

**مثال لرسالة كاملة:**
```
feat: إضافة صفحة التقارير الشهرية

- إضافة /reports/monthly route
- فلترة بالشهر والسنة
- رسم بياني للأرباح
```

### الخطوة 3: استنى CI/CD (2-4 دقايق)

GitHub Actions بيشتغل تلقائياً على الـ push:

1. ⏱️ **0:00** — الـ workflow يبدأ
2. ⏱️ **0:30** — يبدأ build الـ Docker image
3. ⏱️ **2:30** — الـ build خلص ودفع الصورة لـ GHCR
4. ⏱️ **3:00** — SSH على السيرفر + deploy
5. ⏱️ **3:30** — الموقع متحدث ✅

**تتابع من:** https://github.com/momarzouk1998/Mazaya.openappo/actions

**الحالات:**
- ✅ أخضر — تمام
- 🟡 أصفر — شغّال (لازم تستنى)
- ❌ أحمر — فشل (شوف [حل المشاكل](#-حل-المشاكل-troubleshooting))

### الخطوة 4: تأكد إن الموقع شغّال

```bash
curl -s -o /dev/null -w "HTTP: %{http_code} | Time: %{time_total}s\n" https://mazaya.openappo.com/
```

**أو افتح المتصفح:** https://mazaya.openappo.com

| HTTP Code | المعنى | الإجراء |
|---|---|---|
| `200` | تمام ✅ | ابدأ استخدم التعديلات |
| `301/302` | Redirect (عادي) | ابدأ استخدم التعديلات |
| `404` | الصفحة مش موجودة | اتأكد من الـ route في الكود |
| `500` | خطأ في الكود | شوف [حل المشاكل](#-كونتينر-بيرجع-500) |
| `502` | Nginx مش لاقي الكونتينر | شوف [حل المشاكل](#-الموقع-راجع-502) |
| `503` | الخدمة مش متاحة | استنى دقيقة (لسه بيبني) |

---

## ⚡ الاختصار (Quick Reference)

```bash
# === على جهازك ===
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
git add -A && git commit -m "fix: وصف التعديل" && git push origin main

# === استنى 2-4 دقايق ===

# === اتأكد من النجاح ===
curl -s -o /dev/null -w "%{http_code}\n" https://mazaya.openappo.com/
```

---

## 🤖 GitHub Actions Workflow

**المسار:** `.github/workflows/build-and-push.yml`

### الـ Workflow اللي بيشتغل:

```yaml
name: Build & Push to GHCR

on:
  push:
    branches: [main]    # يشتغل على أي push على main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            IMAGE="ghcr.io/${{ github.repository }}:latest"
            LOCAL_TAG="furniture-xhl2yk:latest"
            SERVICE="furniture-xhl2yk"

            docker pull "$IMAGE"
            docker tag "$IMAGE" "$LOCAL_TAG"

            docker service update \
              --image "$LOCAL_TAG" \
              --force \
              "$SERVICE" 2>/dev/null || echo "SERVICE_UPDATE_FAILED"
```

### الـ Secrets المطلوبة في GitHub:

| Secret | القيمة | المصدر |
|---|---|---|
| `SSH_HOST` | `64.226.118.40` | IP السيرفر |
| `SSH_USER` | `root` | يوزر السيرفر |
| `SSH_PRIVATE_KEY` | (محتوى المفتاح) | `~/.ssh/id_ed25519_momarzouk` |

**مكان إضافتها:** https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions

---

## 🐳 Dockerfile و OpenSSL/Prisma

**المسار:** `Dockerfile` (في root المشروع)

### المراحل الـ 4:

```dockerfile
# 1. Base — صورة أساسية
FROM node:20-alpine AS base
WORKDIR /app

# 2. Dependencies — تثبيت الـ packages
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm ci --ignore-scripts   # skip postinstall (Prisma generate will run in builder)

# 3. Builder — compile Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1280"
RUN npx prisma generate && npm run build

# 4. Runner — production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=512"

# OpenSSL 3.x runtime (Prisma binaryTarget: linux-musl-openssl-3.0.x)
RUN apk add --no-cache openssl libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs ; adduser --system --uid 1001 nextjs

# Copy artifacts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# ⚠️ مهم: HOSTNAME=0.0.0.0 explicitly عشان Swarm ما يغيروش لـ 127.0.1.1
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
```

### ⚠️ مشاكل اتحلّت في الـ Dockerfile:

#### 1. Prisma + Alpine + OpenSSL

**المشكلة:** Prisma 5.22 binary compiled against `libssl.so.1.1` بس Alpine 3.19+ شالت الحزمة دي.

**الحل:** أضف `binaryTargets` في `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```
واستخدم `apk add openssl` (3.x) في الـ Dockerfile.

#### 2. HOSTNAME binding in Swarm

**المشكلة:** Docker Swarm بيحقن `HOSTNAME=<container-name>` تلقائياً. Next.js بيقرا الـ env var ده ويعمل bind على `127.0.1.1:3001` بدل `0.0.0.0:3001`، فـ Nginx مش بيوصل للكونتينر.

**الحل:** في CMD بنحط `HOSTNAME=0.0.0.0` explicitly:
```dockerfile
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
```

**أعراض المشكلة:**
- الكونتينر شغّال
- Logs بتقول `Local: http://127.0.1.1:3001`
- الموقع راجع `502 Bad Gateway`

---

## 🐝 إدارة الـ Swarm Service

**Service name:** `furniture-xhl2yk`

### أوامر المراقبة

```bash
ssh root@64.226.118.40

# حالة الخدمة
docker service ps furniture-xhl2yk

# اللوجز (50 سطر)
docker service logs furniture-xhl2yk --tail 50

# اللوجز الحية
docker service logs furniture-xhl2yk -f

# استهلاك الموارد
docker stats --no-stream
```

### أوامر الإدارة

```bash
# ريستارت (يسحب آخر image)
docker service update --force furniture-xhl2yk

# ريستارت مع صورة محددة
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk

# مسك ID الكونتينر الحالي
ID=$(docker ps --filter name=furniture-xhl2yk -q | head -1)

# لوجز كونتينر محدد
docker logs "$ID" --tail 50

# تنفيذ أمر داخل الكونتينر
docker exec -it "$ID" sh

# إيقاف الخدمة
docker service scale furniture-xhl2yk=0

# تشغيل الخدمة
docker service scale furniture-xhl2yk=1
```

### إنشاء الـ service من الصفر (لو اتمسح بالغلط)

```bash
docker service create \
  --name furniture-xhl2yk \
  --restart-condition any \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
```

**ملف الـ env على السيرفر:** `/opt/mazaya/.env` (انظر [المتغيرات](#-المتغيرات-والـ-secrets))

---

## 🚨 حل المشاكل (Troubleshooting)

### الموقع راجع 502

**السبب المحتمل:**
1. الكونتينر لسه بيبني أو وقع
2. Next.js مش بيسمع على `0.0.0.0:3001` (مشكلة HOSTNAME — انظر فوق)
3. RAM خلصت (الكونتينر اتـ killed)

**الحل:**
```bash
ssh root@64.226.118.40

# شوف حالة الخدمة
docker service ps furniture-xhl2yk

# شوف اللوجز
docker service logs furniture-xhl2yk --tail 30

# شوف الرام
free -h

# لو لقطت HOSTNAME=127.0.1.1 في اللوجز، شوف Dockerfile section
```

---

### الموقع راجع 500

**السبب:** خطأ في الكود (Runtime error).

**الحل:**
```bash
ssh root@64.226.118.40

# شوف اللوجز
docker service logs furniture-xhl2yk --tail 50 | grep -E "Error|⨯|TypeError|ReferenceError"

# شوف آخر error
docker logs $(docker ps --filter name=furniture-xhl2yk -q | head -1) --tail 100
```

**أخطاء شائعة:**
- `PrismaClientInitializationError: libssl.so.1.1` → شوف [Dockerfile section](#-dockerfile-و-opensslprisma)
- `permission denied for table audit_log` → [شوف تحت](#مشكلة-صلاحيات-postgresql)
- `Cannot find module` → package.json ناقص dependency

---

### GitHub Actions فشل في الـ Build

**الخطوة 1: شوف الـ error**

افتح: https://github.com/momarzouk1998/Mazaya.openappo/actions
→ اضغط على الـ run الفاشل
→ اضغط على الـ step الأحمر

**أخطاء شائعة وحلولها:**

#### ❌ Build failed: `npm ci` error
**السبب:** `package.json` و `package-lock.json` مش متطابقين.
**الحل:**
```bash
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
npm install
git add package.json package-lock.json
git commit -m "fix: sync package-lock.json"
git push origin main
```

#### ❌ Build failed: `prisma generate` error
**السبب:** الـ schema فيه syntax غلط.
**الحل:**
```bash
# جرّب محلياً
npx prisma generate
# لو فشل، شوف الـ error واصلح الـ schema
```

#### ❌ Deploy failed: `Permission denied (publickey)`
**السبب:** الـ `SSH_PRIVATE_KEY` secret في GitHub غلط أو انتهت صلاحيته.
**الحل:**
1. تأكد إن المفتاح في `~/.ssh/id_ed25519_momarzouk` على جهازك
2. انسخ المحتوى:
   ```bash
   cat ~/.ssh/id_ed25519_momarzouk
   ```
3. حطه في GitHub Secrets: https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions

#### ❌ Deploy failed: `service furniture-xhl2yk not found`
**السبب:** الـ Swarm service اتمسح.
**الحل:**
```bash
ssh root@64.226.118.40
docker service create \
  --name furniture-xhl2yk \
  --restart-condition any \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
```

---

### مشكلة صلاحيات PostgreSQL

**الأعراض:** `permission denied for table audit_log` في اللوجز.

**السبب:** الـ user `mazaya` مفيش عنده صلاحيات على جدول `audit_log`.

**الحل (مرة واحدة):**
```bash
ssh root@64.226.118.40

docker exec -it mazaya-postgres psql -U mazaya -d mazaya

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mazaya TO mazaya;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mazaya TO mazaya;
GRANT ALL ON SCHEMA mazaya TO mazaya;
\q
```

**حل دائم (في Dockerfile أو migration):** أضف الـ GRANT statements في `sql/create_schema.sql`.

---

### السيرفر مش بيرد على SSH

**السبب المحتمل:** RAM خلصت والـ kernel قتل العمليات.

**الحل:**
1. ادخل DigitalOcean Dashboard: https://cloud.digitalocean.com/droplets/580266631
2. اضغط على Droplet
3. من القائمة الجانبية → **Power** → **Reboot**
4. استنى 1-2 دقيقة

---

### مساحة القرص خلصت

**الأعراض:** الـ build يفشل بـ `no space left on device`.

**الحل:**
```bash
ssh root@64.226.118.40

# امسح الصور القديمة
docker image prune -a

# امسح الكونتينرات الميتة
docker container prune

# امسح الـ cache
docker builder prune -a
```

**وقائي:** اعمل cron job أسبوعي:
```bash
0 3 * * 0 docker image prune -af && docker container prune -f
```

---

## 🛠️ حل يدوي للطوارئ (Manual Deploy)

> **استخدم ده لما الـ CI/CD مش شغّال** (مثلاً الـ GitHub Actions فشلت في الـ build، أو الـ secrets انتهت، أو السيرفر فيه مشكلة).

### الخطوة 1: تأكد إن الكود مرفوع على GitHub

```bash
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
git status    # لازم يقول "nothing to commit, working tree clean"
git log -1    # اتأكد إن آخر commit على GitHub هو ده
```

### الخطوة 2: ادخل على السيرفر

```bash
ssh root@64.226.118.40
```

### الخطوة 3: اسحب الصورة الجديدة من GHCR

```bash
# اسحب آخر صورة
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest

# لو الـ pull فشل (auth error)، سجّل دخول:
echo $GITHUB_TOKEN | docker login ghcr.io -u momarzouk1998 --password-stdin
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest
```

### الخطوة 4: حدّث الـ Service

```bash
# أعمل tag محلي
docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest

# حدّث الـ service
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
```

### الخطوة 5: تأكد

```bash
# انتظر 5 ثواني
sleep 5

# شوف الحالة
docker service ps furniture-xhl2yk

# شوف اللوجز
docker logs $(docker ps --filter name=furniture-xhl2yk -q | head -1) --tail 30

# اختبر الموقع
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://mazaya.openappo.com/
```

### Manual Build (لو مفيش CI/CD خالص)

```bash
# على السيرفر
cd /opt
git clone https://github.com/momarzouk1998/Mazaya.openappo.git mazaya-build
cd mazaya-build
git checkout <commit-sha>   # أو اتركه على main

docker build -t furniture-xhl2yk:latest .

docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
```

**⚠️ ده بيستهلك RAM/RAM كبير — مش مستحب على سيرفر 2GB. استخدمه كحل أخير فقط.**

---

## 🛡️ إدارة الموارد (السيرفر 2GB RAM)

### تحسينات مضبوطة مسبقاً

- **Dockerfile multi-stage:** الصورة النهائية ~407MB (مع node_modules كاملة للـ standalone)
- **NODE_OPTIONS محدودة:** وقت الـ build 1280MB (على GitHub)، وقت التشغيل 512MB
- **Swap file 2GB:** عشان لو حصل زيادة استهلاك مفاجئة

### أوامر المراقبة

```bash
ssh root@64.226.118.40

free -h                # استهلاك RAM
df -h                  # مساحة القرص
docker stats --no-stream   # استهلاك الكونتينرات
top                    # أكتر العمليات استهلاكاً
```

### تنظيف دوري

```bash
# امسح الصور اللي مفيش منها كونتينر شغّال
docker image prune -a

# امسح الكونتينرات الميتة
docker container prune

# امسح الـ build cache
docker builder prune -a

# امسح الـ volumes اللي مش مستخدمة
docker volume prune
```

### Backup قبل تنظيف

```bash
# اعمل backup من آخر صورة شغّالة
docker save furniture-xhl2yk:latest | gzip > /root/backups/mazaya-$(date +%Y%m%d).tar.gz
```

---

## 🔐 المتغيرات والـ Secrets

### GitHub Secrets

| Secret | القيمة | المكان |
|---|---|---|
| `SSH_HOST` | `64.226.118.40` | https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions |
| `SSH_USER` | `root` | نفس المكان |
| `SSH_PRIVATE_KEY` | محتوى `~/.ssh/id_ed25519_momarzouk` | نفس المكان |

### Docker Service ENV (على السيرفر)

```bash
DATABASE_URL=postgresql://mazaya:Mazaya2024!SecureDb@localhost:5432/mazaya
NEXT_PUBLIC_APP_URL=https://mazaya.openappo.com
NEXT_PUBLIC_APP_NAME=مصنع مزايا للأثاث
AUTH_SECRET=mazaya-super-secret-key-2024
NODE_ENV=production
PORT=3001
```

**⚠️ ممنوع تحط `HOSTNAME=0.0.0.0` هنا** — الـ Dockerfile بيحقنها في CMD (عشان ما يـ override الـ Swarm default).

### ملفات الإعداد على السيرفر

| الملف | الوظيفة | الصلاحيات |
|---|---|---|
| `/opt/mazaya/.env` | DATABASE_URL + secrets | `chmod 600 root:root` |
| `/etc/nginx/sites-available/mazaya` | Nginx config | `chmod 644 root:root` |
| `/etc/letsencrypt/live/mazaya.openappo.com/` | SSL certificates | `chmod 600 root:root` |

**ممنوع ترفع `.env` على GitHub!** اتأكد إن في `.gitignore`.

---

## 💾 النسخ الاحتياطي

### Backup لـ PostgreSQL (يومي)

```bash
ssh root@64.226.118.40

# Backup يدوي
docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/mazaya-$(date +%Y%m%d).sql.gz

# Backup تلقائي (cron job يومي الساعة 3 الفجر)
crontab -e
# أضف السطر ده:
0 3 * * * docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/mazaya-$(date +\%Y\%m\%d).sql.gz
```

### Backup لـ Docker Image

```bash
ssh root@64.226.118.40
docker save furniture-xhl2yk:latest | gzip > /root/backups/mazaya-image-$(date +%Y%m%d).tar.gz
```

### Restore من Backup

```bash
# Restore DB
gunzip -c /root/backups/mazaya-20260101.sql.gz | docker exec -i mazaya-postgres psql -U mazaya -d mazaya

# Restore Image
gunzip -c /root/backups/mazaya-image-20260101.tar.gz | docker load
```

### Rollback لـ commit قديم

```bash
# على جهازك
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
git log --oneline -10   # اختار الـ commit اللي عايز ترجع له
git revert HEAD         # اعمل commit جديد بيـ undo آخر commit
git push origin main    # الـ CI/CD هينشر الـ revert
```

أو بطريقة أسرع (لو عايز rollback فوري):
```bash
# على السيرفر
ssh root@64.226.118.40
docker pull ghcr.io/momarzouk1998/mazaya.openappo:main-<old-commit-sha>
docker tag ghcr.io/momarzouk1998/mazaya.openappo:main-<old-commit-sha> furniture-xhl2yk:latest
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
```

---

## 🔒 قواعد مهمة

1. **مفيش deploy مباشر على السيرفر** — كل حاجة تمر عبر GitHub.
2. **مفيش تعديل على ملفات السيرفر يدوياً** (غير `.env` أو Nginx config لو اضطررت).
3. **متشغّلش `npm run build` على السيرفر** — البناء يحصل في GitHub Actions (أو في manual build كحل أخير).
4. **متمسحش الـ Docker Swarm service** إلا لو عارف إيه اللي بتعمله.
5. **متمسحش الـ images القديمة قبل ما تتأكد إن الصورة الجديدة شغّالة** (اعمل rollback آمن).
6. **اعمل backup دوري** للـ DB (الأهم) وللـ image (اختياري).
7. **لو مش متأكد → اسأل** قبل ما تكسر الـ production.

---

## 📞 معلومات الاتصال

| الحاجة | القيمة |
|---|---|
| **السيرفر** | `64.226.118.40` (DigitalOcean Frankfurt) |
| **SSH User** | `root` |
| **Domain** | `mazaya.openappo.com` |
| **GitHub** | `github.com/momarzouk1998/Mazaya.openappo` |
| **GHCR** | `ghcr.io/momarzouk1998/mazaya.openappo` |
| **Service** | `furniture-xhl2yk` (Docker Swarm) |
| **PostgreSQL** | container `mazaya-postgres` (localhost:5432) |

**ملفات مرجعية تانية:**
- `SERVER_ACCESS.md` — كل بيانات الاتصال بالسيرفر
- `sql/create_schema.sql` — schema الـ DB
- `sql/seed_data.sql` — بيانات ابتدائية

---

*آخر تحديث: 2026-07-02*
