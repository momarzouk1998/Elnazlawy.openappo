# 🚨 دليل حل مشكلة "Push لا يحدّث الموقع"

> **المشكلة:** رفع الكود على GitHub لا يحدّث `mazaya.openappo.com` تلقائياً.

---

## 🎯 الفحص السريع (3 دقائق)

### 1. افتح صفحة الـ Actions
https://github.com/momarzouk1998/Mazaya.openappo/actions

**ما الذي تشاهده؟**

| الحالة | المعنى | الحل |
|--------|--------|------|
| ❌ لا يوجد workflow run على آخر push | الـ trigger لا يعمل | انظر [السبب A](#a-push-لا-يطلق-workflow) |
| 🟡 Workflow في "Queued" | لا يوجد runner متاح | انظر [السبب B](#b-self-hosted-runner-غير-متاح) |
| ✅ Build & Push نجح ✅ Deploy فشل | مشكلة في deploy step | انظر [السبب C](#c-deploy-فشل-بعد-نجاح-build) |
| ✅ كل شيء أخضر لكن الموقع قديم | Cache أو مشكلة DNS | انظر [السبب D](#d-الموقع-قديم-رغم-نجاح-كل-شيء) |

---

## A) Push لا يطلق Workflow

### الأعراض
آخر commit موجود على GitHub، لكن لا يوجد workflow run في تبويب Actions.

### السبب
- الـ workflow لا يسمع على `main` branch
- أو الـ commit ليس على main

### التشخيص
```bash
git branch --show-current    # لازم يقول: main
git log --oneline -3         # شوف آخر 3 commits
```

### الحل
```bash
# لو مش على main
git checkout main

# تأكد إن الـ workflow يستمع على main
cat .github/workflows/deploy.yml | grep "branches:"
# لازم يقول: branches: [main]
```

---

## B) Self-Hosted Runner غير متاح

### الأعراض
الـ workflow يظهر في حالة **"Queued"** ولا يبدأ أبداً.

### السبب
الـ self-hosted runner على السيرفر غير متصل بالإنترنت أو لم يُسجَّل.

### التشخيص (من السيرفر مباشرة)
```bash
ssh root@64.226.118.40

# هل الـ service شغال؟
systemctl status actions.runner.*mazaya-runner*

# لو شغال، شوف اللوجز
journalctl -u actions.runner.*mazaya-runner* -f
```

### الحل 1: أعد تشغيل الـ service
```bash
systemctl restart actions.runner.*mazaya-runner*
```

### الحل 2: لو الـ runner لم يُسجَّل أصلاً
اتبع دليل `MD/DEPLOY_RUNNER_SETUP.md` خطوة بخطوة (15-20 دقيقة).

### الحل 3: لو مش عايز تعبث بالـ self-hosted runner
**الحل الأسرع:** اعتمد على SSH approach (workflow معدّل بالفعل):

```bash
# الـ workflow الجديد يحتوي على jobين:
# 1. deploy-self-hosted (يحاول، لكن continue-on-error: true)
# 2. deploy-ssh (يبدأ تلقائياً لو الأول فشل)
```

---

## C) Deploy فشل بعد نجاح Build

### الأعراض
- ✅ Build & Push step: أخضر
- ❌ Deploy step: أحمر

### الأسباب الشائعة

#### 1) Permission denied (SSH)
```
Permission denied (publickey)
```
**الحل:** أحدّث `SSH_PRIVATE_KEY` في GitHub Secrets:
```bash
# على جهازك — انظر محتوى المفتاح
cat ~/.ssh/id_ed25519_momarzouk

# الصقه في: https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions
# Secret name: SSH_PRIVATE_KEY
```

#### 2) Connection timed out
```
ssh: connect to host 64.226.118.40 port 22: Connection timed out
```
**الحل:** تأكد من أن الـ firewall على السيرفر يسمح لـ GitHub IPs:
```bash
ssh root@64.226.118.40
ufw status
# لازم يظهر: 22/tcp ALLOW Anywhere
```

#### 3) service not found
```
Error: No such service: furniture-xhl2yk
```
**الحل:** الـ service اتمسحت. أنشئها من جديد:
```bash
docker service create \
  --name furniture-xhl2yk \
  --restart-condition any \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
```

---

## D) الموقع قديم رغم نجاح كل شيء

### الأعراض
- ✅ Actions كلها خضراء
- ❌ `mazaya.openappo.com` يعرض إصدار قديم

### الحلول مرتبة بالأسهل:

#### 1) Cloudflare / DNS cache (الأكثر شيوعاً)
امسح cache المتصفح:
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

#### 2) Nginx cache
```bash
ssh root@64.226.118.40
docker exec $(docker ps --filter name=nginx -q | head -1) nginx -s reload
```

#### 3) Docker service لم يتحدّث
```bash
# شوف الـ image ID المستخدم حالياً
docker service ps furniture-xhl2yk

# لو الـ image قديم، حدّث يدوياً
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest
docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
```

#### 4) Next.js cache
```bash
# على السيرفر
docker exec $(docker ps --filter name=furniture-xhl2yk -q | head -1) \
  rm -rf .next/cache
docker service update --force furniture-xhl2yk
```

---

## 🛠️ الحل اليدوي السريع (Manual Deploy)

> **استخدمه لما الـ CI/CD فاشل خالص وتريد الموقع يتحدث فوراً.**

```bash
ssh root@64.226.118.40

# 1. اسحب آخر صورة
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest

# 2. أعد التسمية
docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest

# 3. حدّث الخدمة
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk

# 4. تأكد
sleep 5
docker service ps furniture-xhl2yk
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://mazaya.openappo.com/
```

---

## 🔄 إعادة الـ workflow للوضع الكلاسيكي (SSH فقط)

لو مش عايز تستخدم self-hosted runner أبداً، احذف الـ deploy job الأول:

```yaml
# في .github/workflows/deploy.yml — احذف job: deploy-self-hosted
# وغيّر اسم job: deploy-ssh إلى: deploy
```

---

## 📞 معلومات التواصل

| الحاجة | المكان |
|---|---|
| **حالة الـ Actions** | https://github.com/momarzouk1998/Mazaya.openappo/actions |
| **حالة الـ runners** | https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners |
| **لوجز السيرفر** | `journalctl -u actions.runner.* -f` |
| **SSH** | `ssh root@64.226.118.40` |
| **DO Console** | https://cloud.digitalocean.com/droplets/580266631 |

---

## 🎓 ملخص

| السيناريو | الحل |
|---|---|
| **لا يوجد workflow run** | تأكد إنك على `main` branch |
| **Queued للأبد** | الـ runner offline — استخدم SSH fallback |
| **Build ✅ Deploy ❌** | أحدّث GitHub Secrets أو firewall |
| **كل شيء ✅ الموقع قديم** | امسح cache (متصفح/Nginx) |

**الحل الأضمن:** الـ workflow الجديد يحتوي على **fallback تلقائي للـ SSH** لو الـ self-hosted فشل — يعني حتى لو الـ runner offline، الموقع سيتحدث عبر SSH.

---

*آخر تحديث: 2026-07-02*
