# 🚀 DEPLOY — Mazaya System

> **القاعدة الذهبية:** مفيش deploy مباشر على السيرفر.
> الكود بيرفع على GitHub الأول، وبعدها CI/CD يبني Docker image ويرفعها على GHCR، والسيرفر يسحبها.

---

## 🧠 ازاي الشغل بنفسج؟

```
جهازك (تعديل الكود)  →  GitHub (المصدر الرسمي)  →  GitHub Actions (CI/CD)
                                                       ↓
السيرفر (docker pull)  ←  GHCR (GitHub Container Registry)  ←  بناء Docker image
```

- ✅ لو السيرفر وقع، الكود آمن على GitHub + الصورة على GHCR.
- ✅ الـ build مبيستهلكش موارد السيرفر (بيحصل على GitHub).
- ✅ تاريخ كامل لكل تعديل.

---

## ✅ خطوات الـ Deploy

### الخطوة 1: تأكد إن الكود شغّال محلياً

```bash
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
npm run build
```

- لو ظهر `✓ Compiled successfully` → كمّل.
- لو ظهر خطأ → **وقّف**، اصلحه، وارجع جرّب.

### الخطوة 2: ارفع الكود لـ GitHub

```bash
git status                    # شوف إيه اللي اتعدّل
git add -A                    # ضيف كل التعديلات
git commit -m "وصف مختصر"     # احفظ التعديلات
git push origin main          # ارفع لـ GitHub
```

**رسالة commit واضحة:**
- `feat:` لميزة جديدة، `fix:` لإصلاح، `style:` للشكل.
- مثال: `feat: إضافة تقرير الأرباح مع الفلترة بالشهر`

### الخطوة 3: استنى CI/CD

GitHub Actions بيشتغل تلقائياً:
1. يبني Docker image
2. يرفعها على `ghcr.io/momarzouk1998/mazaya.openappo:latest`

تقدر تتابع الشغل من هنا: https://github.com/momarzouk1998/Mazaya.openappo/actions

### الخطوة 4: ادخل على السيرفر ونزّل الصورة الجديدة

```bash
ssh root@64.226.118.40
```

### الخطوة 5: اسحب الصورة الجديدة وشغّلها

```bash
# سحب أحدث صورة
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest

# وقف ومسح الكونتينر القديم
docker stop mazaya
docker rm mazaya

# تشغيل الكونتينر الجديد
docker run -d \
  --name mazaya \
  --restart unless-stopped \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
```

> **مهم:** `--network host` عشان الكونتينر يوصل PostgreSQL على localhost:5432.
> **مهم:** `--env-file /opt/mazaya/.env` عشان يدخل DATABASE_URL والـ secrets.

### الخطوة 6: تأكد إنه شغّال

```bash
docker ps --filter name=mazaya          # لازم يشوفك الكونتينر
docker logs mazaya --tail 10            # آخر لوج — مفروض مفيش errors
```

المفروض تشوف:
```
▲ Next.js 16.2.9
- Local: http://localhost:3001
✓ Ready in 0ms
```

### الخطوة 7: اختبر الموقع

```bash
curl -s -o /dev/null -w "%{http_code}" https://mazaya.openappo.com/
```

- `200` = تمام ✅
- `500` = في مشكلة في الكود ❌
- `502` = الكونتينر مش شغّال أو Nginx مش لاقيه ❌

---

## ⚡ الاختصار (كوبي-بيست من جهازك)

```bash
# === على جهازك ===
cd "D:/OPEN APPS/DigitalOcian Projects/mazaya-system"
git add -A && git commit -m "وصف" && git push origin main

# استنى شوية (2-3 دقايق عشان CI/CD يخلص)

# === على السيرفر ===
ssh root@64.226.118.40
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest
docker stop mazaya && docker rm mazaya
docker run -d --name mazaya --restart unless-stopped \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
sleep 5
docker logs mazaya --tail 5
```

---

## 🛡️ إدارة الموارد (السيرفر 2GB RAM)

### تحسينات مضبوطة مسبقاً
- **Dockerfile multi-stage:** الصورة النهائية صغيرة (~180MB).
- **NODE_OPTIONS محدودة:** وقت الـ build 1280MB (على GitHub وليس السيرفر)، وقت التشغيل 512MB.
- **Swap file 2GB:** عشان لو حصل زيادة استهلاك.

### أوامر مراقبة
```bash
free -h                              # استهلاك RAM
docker stats mazaya --no-stream      # استهلاك الكونتينر
docker system df                      # مساحة الـ Docker
```

### تنظيف دوري
```bash
docker image prune -a                # امسح الصور القديمة
```

---

## 🔐 المتغيرات المهمة

| الملف | الوظيفة |
|---|---|
| `/opt/mazaya/.env` | DATABASE_URL + secrets (ممنوع يرفع على GitHub) |
| `/opt/mazaya/Dockerfile` | بناء الصورة (multi-stage) |
| `/etc/nginx/sites-available/mazaya` | Nginx config للـ subdomain |

### محتويات `.env` على السيرفر
```
DATABASE_URL=postgresql://mazaya:Mazaya2024!SecureDb@localhost:5432/mazaya
NEXT_PUBLIC_APP_URL=https://mazaya.openappo.com
NEXT_PUBLIC_APP_NAME=مصنع مزايا للأثاث
AUTH_SECRET=mazaya-super-secret-key-2024
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
```

---

## 🚨 مشاكل وحلول

### `docker pull` بيرفض
**السبب:** الـ GHCR token منتهي أو مش مضبوط.
**الحل:**
```bash
echo $GHCR_TOKEN | docker login ghcr.io -u momarzouk1998 --password-stdin
```

### الكونتينر بيرجع 500
**السبب:** خطأ في الكود.
**الحل:**
```bash
docker logs mazaya --tail 50 | grep "⨯"
```

### السيرفر مش بيرد على SSH
**السبب:** RAM خلصت.
**الحل:** ادخل DigitalOcean Dashboard → Reboot.

### عاوز تجرب API من السيرفر
```bash
# تسجيل دخول
curl -s -c /tmp/jar -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# تجربة API
curl -s -b /tmp/jar http://localhost:3001/api/reports/inventory | python3 -m json.tool
```

---

## 🔒 قواعد مهمة

1. **مفيش deploy مباشر على السيرفر.** كل حاجة تمر عبر GitHub.
2. **مفيش تعديل على ملفات السيرفر يدوياً** (غير `.env` لو اضطررت).
3. **متشغّلش `npm run build` على السيرفر** — البناء يحصل في GitHub Actions.
4. **اعمل backup دوري:**
   ```bash
   sudo -u postgres pg_dump mazaya > /root/backup-$(date +%Y%m%d).sql
   ```
5. **لو مش متأكد → اسأل** قبل ما تكسر الـ production.

---

*آخر تحديث: 2026-06-28*
