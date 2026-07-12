# 🔌 Server Access & Connection Info — ELNAZLAWY

> **الهدف:** ملف واحد فيه كل بيانات الاتصال اللي محتاجها عشان تتعامل مع السيرفر وقاعدة البيانات.
> **آخر تحديث:** 2026-07-12
> **نفس السيرفر بتاع mazaya** — service و schema منفصلين

---

## 1. 🖥️ Server (DigitalOcean Droplet)

| الحاجة | القيمة |
|---|---|
| **Provider** | DigitalOcean |
| **Droplet ID** | `580266631` (نفس mazaya) |
| **Region** | `fra1` (Frankfurt) |
| **OS** | Ubuntu 24.04.4 LTS |
| **Public IP** | `64.226.118.40` |
| **RAM** | ~2 GB (مشتركة مع mazaya) |
| **Disk** | 48 GB |
| **DNS Domain** | `elnazlawy.openappo.com` → `64.226.118.40` |

### ⚠️ SSH Key (نفس mazaya)

> **المفتاح الصحيح اللي بيفتح السيرفر هو:** `~/.ssh/id_ed25519`

```bash
ssh -i ~/.ssh/id_ed25519 root@64.226.118.40 "echo OK"
```

### الاتصال بالسيرفر (SSH)
```bash
ssh root@64.226.118.40
```

### الفايروول (UFW)
| المنفذ | الخدمة |
|---|---|
| 22 | OpenSSH |
| 80 / 443 | Nginx (HTTP/HTTPS) |
| 5432 | PostgreSQL (محلي فقط) |

---

## 2. 🗄️ Database (PostgreSQL) — **مشترك مع mazaya**

| الحاجة | القيمة |
|---|---|
| **Type** | Docker container (مشترك) |
| **Container Name** | `mazaya-postgres` (نفس الـ container) |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database Name** | `elnazlawy_db` (منفصل عن mazaya) |
| **Schema** | `elnazlawy` |
| **User** | `elnazlawy` |
| **Password** | `Elnazlawy2026!Secure` |

### Connection String
```
postgresql://elnazlawy:Elnazlawy2026!Secure@localhost:5432/elnazlawy_db
```

### إنشاء الـ Database (مرة واحدة عند الـ Deploy الأول)
```bash
docker exec -it mazaya-postgres psql -U mazaya -d mazaya

-- داخل psql:
CREATE USER elnazlawy WITH PASSWORD 'Elnazlawy2026!Secure';
CREATE DATABASE elnazlawy_db OWNER elnazlawy;
GRANT ALL PRIVILEGES ON DATABASE elnazlawy_db TO elnazlawy;
\c elnazlawy_db
GRANT ALL ON SCHEMA public TO elnazlawy;
\q
```

### الدخول لـ psql (elnazlawy)
```bash
docker exec -it mazaya-postgres psql -U elnazlawy -d elnazlawy_db
SET search_path TO elnazlawy, public;
\dt
```

### الجداول الموجودة (19 جدول):
```
users, stores, products, inventory, customers, suppliers,
sales_invoices, sales_invoice_items, purchase_invoices, purchase_invoice_items,
stock_transfers, customer_payments, supplier_payments, checks,
expenses, treasuries, treasury_transactions,
product_price_history, audit_log
```

---

## 3. 🐳 Docker (التطبيق)

| الحاجة | القيمة |
|---|---|
| **Service Name** | `elnazlawy-x9y8z7` |
| **Image Source** | `ghcr.io/momarzouk1998/elnazlawy.openappo:latest` |
| **Image Local Tag** | `elnazlawy-x9y8z7:latest` |
| **Network** | `host` |
| **Port** | `3002` (داخلي) → Nginx reverse proxy |
| **Restart Policy** | `--restart-condition any` |
| **Config** | `/opt/elnazlawy/.env` |

### أوامر المراقبة
```bash
# حالة الخدمة
docker service ps elnazlawy-x9y8z7

# اللوجز
docker logs $(docker ps --filter name=elnazlawy-x9y8z7 -q | head -1) --tail 50 -f

# استهلاك الموارد
docker stats --no-stream

# ريستارت
docker service update --force elnazlawy-x9y8z7
```

### متغيرات البيئة (على السيرفر)
```bash
# /opt/elnazlawy/.env
DATABASE_URL=postgresql://elnazlawy:Elnazlawy2026!Secure@localhost:5432/elnazlawy_db
JWT_SECRET=<random-32-chars-secret>
NEXT_PUBLIC_SITE_URL=https://elnazlawy.openappo.com
NEXT_PUBLIC_APP_NAME=معرض النزلاوي
NODE_ENV=production
PORT=3002
HOSTNAME=0.0.0.0
```

---

## 4. 🚀 Deployment (CI/CD)

### النظام: **SSH-First Approach** (نفس mazaya)

```
git push origin main
       ↓
┌────────────────────────────────────────┐
│  GitHub Actions (ubuntu-latest)         │
│  ──────────────                        │
│  1. build-and-push.yml:                │
│     • Build Docker image               │
│     • Push to GHCR                     │
│                                        │
│  2. deploy.yml:                        │
│     • SSH to server (uses secrets)     │
│     • docker pull + tag + update       │
└────────────────────────────────────────┘
       ↓
Server: 64.226.118.40
       ↓
docker service update elnazlawy-x9y8z7
       ↓
https://elnazlawy.openappo.com (محدّث)
```

### خطوات الـ Deploy اليومية
```bash
cd "D:/OPEN APPS/DigitalOcian Projects/elnazlawy-system"
git add -A
git commit -m "feat: وصف التعديل"
git push origin main
# استنى 2-3 دقايق — الموقع سيتحدث تلقائياً
```

### حل يدوي للطوارئ
```bash
ssh root@64.226.118.40
docker pull ghcr.io/momarzouk1998/elnazlawy.openappo:latest
docker tag ghcr.io/momarzouk1998/elnazlawy.openappo:latest elnazlawy-x9y8z7:latest
docker service update --image elnazlawy-x9y8z7:latest --force elnazlawy-x9y8z7
```

---

## 5. 🔐 GitHub Secrets (مطلوبة للـ CI/CD)

في: https://github.com/momarzouk1998/Elnazlawy.openappo/settings/secrets/actions

| Secret | القيمة | ملاحظة |
|---|---|---|
| `SSH_HOST` | `64.226.118.40` | IP السيرفر (نفس mazaya) |
| `SSH_USER` | `root` | يوزر SSH |
| `SSH_PRIVATE_KEY` | محتوى `~/.ssh/id_ed25519` | **نفس المفتاح بتاع mazaya** |

> ⚠️ **مهم:** استخدم **نفس** SSH_PRIVATE_KEY بتاع mazaya — لأن نفس السيرفر. ممكن تنسخه من https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions

---

## 6. 🐙 GitHub

| الحاجة | القيمة |
|---|---|
| **Account** | `momarzouk1998` |
| **Email** | `mo.marzouk1998@gmail.com` |
| **Repository** | `Elnazlawy.openappo` |
| **HTTPS URL** | `https://github.com/momarzouk1998/Elnazlawy.openappo.git` |
| **SSH URL** | `git@github.com-momarzouk:momarzouk1998/Elnazlawy.openappo.git` |
| **Default Branch** | `main` |

### ⚠️ ملاحظة: إنشاء الـ Repository
الـ repo `Elnazlawy.openappo` **لازم يتعمل على GitHub** قبل أول push.

**الخطوات:**
1. افتح https://github.com/new
2. Repository name: `Elnazlawy.openappo`
3. Owner: `momarzouk1998`
4. Visibility: **Private**
5. ❌ **لا تضف** README أو .gitignore أو license
6. اضغط "Create repository"
7. بعد كده: `git push -u origin main`

---

## 7. 🌐 Nginx & SSL

| الحاجة | القيمة |
|---|---|
| **Nginx Config** | `/etc/nginx/sites-available/elnazlawy` |
| **Enabled** | `/etc/nginx/sites-enabled/elnazlawy` |
| **SSL** | Let's Encrypt (Certbot) |
| **Domain** | `elnazlawy.openappo.com` |
| **Proxy** | `http://127.0.0.1:3002` |

### إعداد SSL (لو احتجت تجدد)
```bash
certbot --nginx -d elnazlawy.openappo.com
```

### Nginx config example
```nginx
server {
    listen 443 ssl;
    server_name elnazlawy.openappo.com;
    ssl_certificate /etc/letsencrypt/live/elnazlawy.openappo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elnazlawy.openappo.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 8. 🌐 DNS (openappo.com)

| النطاق | IP | المشروع |
|---|---|---|
| `mazaya.openappo.com` | `64.226.118.40` | Mazaya |
| `elnazlawy.openappo.com` | `64.226.118.40` | **ELNAZLAWY (هذا المشروع)** |
| `opengym.openappo.com` | `64.226.118.40` | OpenGym |
| `openappo.com` | `2.57.91.91` | Hostinger (سيرفر منفصل) |

### إضافة DNS Record (في Hostinger DNS Zone)
```
Type: A
Host: elnazlawy
Value: 64.226.118.40
TTL: 300
```

---

## 9. ⚡ Quick Commands Cheat Sheet

```bash
# === الاتصال ===
ssh root@64.226.118.40

# === Service Management ===
docker service ps elnazlawy-x9y8z7
docker service logs elnazlawy-x9y8z7 --tail 50
docker service update --force elnazlawy-x9y8z7

# === Manual Deploy ===
docker pull ghcr.io/momarzouk1998/elnazlawy.openappo:latest
docker tag ghcr.io/momarzouk1998/elnazlawy.openappo:latest elnazlawy-x9y8z7:latest
docker service update --image elnazlawy-x9y8z7:latest --force elnazlawy-x9y8z7

# === Database ===
docker exec -it mazaya-postgres psql -U elnazlawy -d elnazlawy_db
SET search_path TO elnazlawy, public;
\dt

# === Seed Database ===
docker exec $(docker ps --filter name=elnazlawy-x9y8z7 -q | head -1) \
  node /app/prisma/seed.js
# أو محلياً: DATABASE_URL=... npx prisma db push && npx tsx prisma/seed.ts

# === Monitoring ===
free -h
df -h
docker stats --no-stream
```

---

## 10. 💾 النسخ الاحتياطي (موصى به)

### إضافة لـ crontab على السيرفر
```bash
# Backup يومي لـ schema elnazlawy فقط
0 3 * * * docker exec mazaya-postgres pg_dump -U elnazlawy -d elnazlawy_db -n elnazlawy | gzip > /root/backups/elnazlawy-$(date +\%Y\%m\%d).sql.gz

# أو backup كامل لكل الـ databases
0 4 * * * docker exec mazaya-postgres pg_dumpall -U mazaya | gzip > /root/backups/all-dbs-$(date +\%Y\%m\%d).sql.gz
```

---

## 🔑 بيانات الدخول الافتراضية (بعد الـ Seed)

| المستخدم | كلمة السر | الدور | الصلاحيات |
|---|---|---|---|
| `openapps` | `123456` | admin | كل شيء (يرى سعر الشراء) |
| `mahmoud` | `123456` | manager | يرى سعر الشراء |
| `abumahmoud` | `123456` | manager | يرى سعر الشراء |
| `ibrahim` | `123456` | accountant | لا يرى سعر الشراء |
| `rep1` | `123456` | rep | تطبيق المندوب |
| `rep2` | `123456` | rep | تطبيق المندوب |

> ⚠️ **غيّر كلمات المرور فوراً** بعد أول دخول!

---

## 📞 معلومات التواصل

| الحاجة | المكان |
|---|---|
| **حالة الـ CI/CD** | https://github.com/momarzouk1998/Elnazlawy.openappo/actions |
| **Secrets** | https://github.com/momarzouk1998/Elnazlawy.openappo/settings/secrets/actions |
| **DO Console** | https://cloud.digitalocean.com/droplets/580266631 |
| **الموقع** | https://elnazlawy.openappo.com |
| **العميل** | الحاج محمود حسين (01006172668) |

---

*آخر تحديث: 2026-07-12 — Migration v1 من AppSheet إلى Next.js + PostgreSQL*
