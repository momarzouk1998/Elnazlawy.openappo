# 🚀 دليل الإعداد النهائي — Self-Hosted Runner
## عشان `git push` يحدّث الموقع أوتوماتيك على `mazaya.openappo.com`

> **الفكرة:** نخلّي السيرفر نفسه هو الـ runner لـ GitHub Actions. يعني السيرفر بيسحب الـ job مباشرة من GitHub، يبني، ويحدّث الـ Docker service. **مفيش SSH، مفيش secrets، مفيش مشاكل network.**

---

## 📑 الفهرس

1. [الفرق بين الـ CI/CD الحالي والـ Self-Hosted Runner](#-1-الفرق-بين-الـ-cicd-الحالي-والـ-self-hosted-runner)
2. [ليه الـ CI/CD الحالي بيفشل](#-2-ليه-الـ-cicd-الحالي-بيفشل)
3. [الإعداد — خطوة بخطوة](#-3-الإعداد--خطوة-بخطوة)
4. [التحقق من إن كل حاجة شغّالة](#-4-التحقق-من-إن-كل-حاجة-شغّالة)
5. [الاستخدام اليومي (بعد الإعداد)](#-5-الاستخدام-اليومي-بعد-الإعداد)
6. [حل المشاكل](#-6-حل-المشاكل)
7. [Rollback لو حاجة كسرت](#-7-rollback-لو-حاجة-كسرت)
8. [أوامر سريعة (Cheat Sheet)](#-8-أوامر-سريعة-cheat-sheet)

---

## 🧠 1. الفرق بين الـ CI/CD الحالي والـ Self-Hosted Runner

### الوضع الحالي (اللي بيفشل):

```
جهازك (Push) → GitHub → Build على GitHub runner → Push لـ GHCR
                                                    ↓
                                          GitHub runner يعمل SSH على السيرفر
                                                    ↓
                                          ❌ FAIL (Permission denied)
```

**المشكلة:** الـ GitHub runner في أمريكا/أوروبا بيحاول يعمل SSH على `64.226.118.40:22`. السيرفر بيرفض (إما الـ key مش مطابق، أو الـ firewall بيبقّل).

### الوضع الجديد (اللي هنعمله):

```
جهازك (Push) → GitHub → Build على GitHub runner → Push لـ GHCR
                                                    ↓
                                    السيرفر (Self-hosted runner) بيسحب الـ job
                                                    ↓
                                    يبني (لو محتاج) → يسحب من GHCR → يحدّث الـ service
                                                    ↓
                                          ✅ SUCCESS
```

**المميزات:**
- ✅ مفيش SSH
- ✅ مفيش secrets للـ keys
- ✅ مفيش مشاكل network
- ✅ السيرفر بيشتغل على بيئة الإنتاج مباشرة (مفيش اختلافات)
- ✅ بيدعم أوامر معقدة (زي تنظيف صور قديمة، backup، إلخ)

---

## 🔍 2. ليه الـ CI/CD الحالي بيفشل

### الأعراض اللي شفناها:
1. **Build & Push step:** ✅ نجح (الـ image اترفعت على GHCR)
2. **Deploy via SSH step:** ❌ فشل

### الأسباب المحتملة (مرتبة بالأرجحية):

| # | السبب | الدليل | الحل |
|---|-------|--------|------|
| 1 | الـ `SSH_PRIVATE_KEY` في GitHub Secrets قديم/منتهي | `Permission denied (publickey)` | أحدّثه أو أستغني عنه (الحل الجديد) |
| 2 | السيرفر firewall بيبقّل GitHub IPs | `Connection timed out` | أضيف GitHub IP ranges في الـ firewall |
| 3 | الـ key passphrase غلط | `Could not create directory` | أعد التصدير بدون passphrase |

### الحل النهائي:
**نتخلص من SSH خالص** — نستبدله بـ **self-hosted runner** على السيرفر.

---

## 🛠️ 3. الإعداد — خطوة بخطوة

> **الوقت المطلوب:** 15-20 دقيقة (مرة واحدة بس)
> **مستوى الصعوبة:** متوسط (بتعمل أوامر على السيرفر)

### الخطوة 1: جهّز الـ Token من GitHub

#### 1.1 افتح صفحة الـ runners
روح على:
```
https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners/new
```

#### 1.2 اختار نظام التشغيل
- **Operating System:** Linux
- **Architecture:** x64

#### 1.3 انسخ الـ Token
هتلاقي instruction card شكلها كده:
```
# Create the runner directory
mkdir actions-runner && cd actions-runner
# Download the latest runner package
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz
# Extract the installer
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz
# Create the runner and start the configuration experience
./config.sh --url https://github.com/momarzouk1998/Mazaya.openappo --token AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**الـ Token** اللي في آخر سطر (اللي شكله `AXXX...`) — ده اللي هنحتاجه. **انسخه** لأنك هتستخدمه على السيرفر.

#### 1.4 ⚠️ ملاحظات مهمة:
- الـ Token **صالح لمدة ساعة واحدة** بس — لو اتأخرت، ارجع جدده من نفس الصفحة
- كل runner ليه label افتراضي اسمه `self-hosted` — هنستخدمه في الـ workflow

---

### الخطوة 2: ادخل على السيرفر

من جهازك (لو عندك SSH شغّال) أو من **DigitalOcean Console**:

#### الخيار A: من DigitalOcean Console (لو SSH مش شغّال)
1. https://cloud.digitalocean.com/droplets/580266631
2. اضغط **Access** → **Launch Droplet Console**
3. هيفتح terminal أسود على السيرفر

#### الخيار B: من PowerShell/CMD (لو SSH شغّال)
```powershell
ssh root@64.226.118.40
```

> **ملاحظة:** لازم تدخل كـ `root` (مش `dell` أو يوزر تاني) عشان الـ Docker daemon محتاج صلاحيات.

---

### الخطوة 3: ثبّت الـ Runner على السيرفر

بعد ما تفتح terminal السيرفر، شغّل الأوامر دي **بالترتيب**:

```bash
# 1. روح لمجلد الـ opt (اللي بنحط فيه الـ apps)
cd /opt

# 2. اعمل مجلد للـ runner
mkdir -p mazaya-runner
cd mazaya-runner

# 3. اعمل يوزر خاص بالـ runner (عشان الأمان — مينفعش يشتغل بـ root)
useradd -m -s /bin/bash mazaya-runner
chown -R mazaya-runner:mazaya-runner /opt/mazaya-runner

# 4. حمّل الـ runner package
# (الإصدار ممكن يكون اتحدث — استخدم الرقم من صفحة GitHub)
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz

# 5. فك الضغط
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz

# 6. خلي الـ owner هو الـ mazaya-runner
chown -R mazaya-runner:mazaya-runner /opt/mazaya-runner
```

#### ⚠️ لو الـ curl نزل ملف صغير غلط (مثلاً صفحة 404):
```bash
ls -lh actions-runner-linux-x64-2.319.1.tar.gz
# لازم يكون ~130MB، لو أقل من كده، الملف غلط
```

---

### الخطوة 4: سجّل الـ Runner مع GitHub

```bash
# 1. انتقل لليوزر الجديد (عشان الأمان)
su - mazaya-runner
cd /opt/mazaya-runner

# 2. سجّل الـ runner
# ⚠️ استبدل TOKEN_HERE بالـ token اللي نسخته من GitHub
./config.sh --url https://github.com/momarzouk1998/Mazaya.openappo --token TOKEN_HERE
```

**هيظهرلك prompts متتالية:**

| السؤال | الإجابة |
|--------|---------|
| `Enter the name of the runner group to add this runner to:` | اضغط **Enter** (الافتراضي `Default`) |
| `Enter the name of the runner to add to the group:` | اكتب `mazaya-runner` (أو اضغط Enter للاسم الافتراضي) |
| `Enter any additional labels (ex. label1,label2):` | اضغط **Enter** (مفيش labels إضافية) |
| `Enter name of work folder:` | اضغط **Enter** (`_work`) |

**الـ output لازم يكون:**
```
√ Connected to GitHub
...
√ Runner successfully added
√ Runner connection is good
```

---

### الخطوة 5: ثبّت الـ Runner كـ systemd service

```bash
# 1. ارجع ليوزر root (عشان نركّب الـ service)
exit
cd /opt/mazaya-runner

# 2. اعمل الـ service
./svc.sh install mazaya-runner
```

**لازم تشوف:**
```
Creating launch file for user mazaya-runner
Creating service...                     [OK]
Service installation succeeded!
```

#### 5.1 شغّل الـ service وفعّله عند الـ boot
```bash
systemctl start actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service
systemctl enable actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service

# ⚠️ اسم الـ service ممكن يختلف. لو مش لاقيه، دوّر:
# systemctl list-units | grep actions.runner
```

#### 5.2 اتأكد إنه شغّال
```bash
systemctl status actions.runner.*mazaya-runner*
```

**المفروض تشوف:**
- `Active: active (running)` ✅
- `Loaded: loaded` ✅

---

### الخطوة 6: امنح الـ Runner صلاحية الـ Docker

```bash
# ضيف الـ mazaya-runner لمجموعة الـ docker (عشان يقدر يستخدم docker commands)
usermod -aG docker mazaya-runner

# ريستارت الـ service عشان ياخد التغيير
systemctl restart actions.runner.*mazaya-runner*
```

#### 6.1 اتأكد
```bash
# شغّل التيست
su - mazaya-runner -c "docker ps"
```

**المفروض تشوف قائمة الكونتينرات** (فاضية أو فيها حاجة) — لو ظهرت، تمام. لو ظهر `permission denied`، الـ user مش في مجموعة docker صح.

---

### الخطوة 7: ارفع الـ workflows الجديدة على GitHub

الـ workflow الجديد (self-hosted runner) **جاهز** في المشروع. كل اللي عليك:

```powershell
# من جهازك
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git add -A
git commit -m "ci: switch to self-hosted runner for deploy"
git push origin main
```

**الـ workflow هيشتغل تلقائي** على push:
- `build-and-push.yml` → يبني الصورة على GitHub runner ويرفعها GHCR
- `deploy.yml` → الـ runner على السيرفر بيسحب الصورة ويحدّث الـ service

---

## ✅ 4. التحقق من إن كل حاجة شغّالة

### الفحص 1: الـ runner متسجل على GitHub
روح على:
```
https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners
```

**المفروض تشوف:**
- `mazaya-runner` بحالة **Idle** (يعني مستني job) ✅
- Label: `self-hosted` ✅

### الفحص 2: الـ runner شغّال على السيرفر
```bash
# على السيرفر
systemctl status actions.runner.*mazaya-runner*

# شوف اللوجز
journalctl -u actions.runner.*mazaya-runner* -f
```

**المفروض تشوف سطور زي:**
```
[2026-07-02 12:00:00] Listening for Jobs
```

### الفحص 3: اعمل deploy تجريبي
```powershell
# من جهازك — عدّل أي ملف بسيط
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
echo "<!-- test deploy $(date) -->" >> src/app/page.tsx
git add -A
git commit -m "test: verify self-hosted runner deploy"
git push origin main
```

**بعد 1-2 دقيقة:**
1. روح على https://github.com/momarzouk1998/Mazaya.openappo/actions
2. اضغط على آخر run
3. **Job "deploy"** لازم يكون **self-hosted runner** و**success** ✅
4. افتح https://mazaya.openappo.com/ — لازم تشوف التعديل

---

## 🎯 5. الاستخدام اليومي (بعد الإعداد)

### الـ Workflow العادي (بسيط جدًا):

```powershell
# 1. عدّل الكود
# 2. اختبر محلياً
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
npm run dev
# افتح http://localhost:3000 وجرّب

# 3. لما تخلص، ارفع
git add -A
git commit -m "feat: وصف التعديل"
git push origin main

# 4. استنى 2-4 دقايق
# 5. افتح https://mazaya.openappo.com/ واستخدم التعديل
```

**بس كده! 🎉** مفيش SSH، مفيش أوامر يدوية، مفيش secrets.

---

## 🔧 6. حل المشاكل

### مشكلة: الـ runner مش ظاهر في GitHub

**السبب المحتمل:** الـ service مش شغّال.

**الحل:**
```bash
# على السيرفر
systemctl status actions.runner.*mazaya-runner*
# لو مش شغّال:
systemctl start actions.runner.*mazaya-runner*

# شوف اللوجز
journalctl -u actions.runner.*mazaya-runner* --since "10 minutes ago"
```

---

### مشكلة: الـ workflow بيفضل "Queued" ومش بيبدأ

**السبب المحتمل:** مفيش runner متاح (offline).

**الحل:**
```bash
# 1. تأكد إن الـ service شغّال
systemctl status actions.runner.*mazaya-runner*

# 2. لو شغّال بس مش متسجل على GitHub
journalctl -u actions.runner.*mazaya-runner* -f
# شوف لو في connection error

# 3. أعد التسجيل
su - mazaya-runner
cd /opt/mazaya-runner
./config.sh remove   # شيل التسجيل القديم
# ارجع لـ خطوة 4 في الأعلى وسجّل تاني
```

---

### مشكلة: الـ deploy نجح بس الموقع مش متحدث

**السبب المحتمل:** الـ cache (Nginx/Cloudflare/CDN).

**الحل:**
```bash
# على السيرفر
# 1. شوف الـ image ID الجديد
docker images ghcr.io/momarzouk1998/mazaya.openappo:latest

# 2. شوف الـ container الحالي
docker ps --filter name=furniture-xhl2yk

# 3. لو الـ image محدّث بس الموقع قديم:
#    ريستارت Nginx (ممكن يكون كاش)
docker exec $(docker ps --filter name=nginx -q | head -1) nginx -s reload

# 4. أو مسح الـ cache من المتصفح (Ctrl+Shift+R)
```

---

### مشكلة: Out of memory أثناء build

**السبب:** السيرفر 2GB RAM والـ build بياخد ~1.3GB.

**الحل:** الـ build بيحصل على GitHub runner (مش على السيرفر) — فده مينفعش يحصل. لو حصلت مشكلة، قلل `NODE_OPTIONS` في الـ Dockerfile:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=1024"  # بدل 1280
```

---

### مشكلة: Permission denied على Docker

**الحل:**
```bash
# على السيرفر
usermod -aG docker mazaya-runner
systemctl restart actions.runner.*mazaya-runner*

# تأكد
su - mazaya-runner -c "docker ps"
```

---

## ⏪ 7. Rollback لو حاجة كسرت

### الطريقة 1: من خلال الـ runner
```bash
# على السيرفر — شوف آخر 5 إيمجز مرفوعة على GHCR
docker images ghcr.io/momarzouk1998/mazaya.openappo --format "{{.Tag}}" | head -5

# شغّل إصدار قديم
docker pull ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_COMMIT_SHA
docker tag ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_COMMIT_SHA furniture-xhl2yk:latest
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
```

### الطريقة 2: Revert + Push
```powershell
# من جهازك
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git revert HEAD
git push origin main
# الـ runner هيـ deploy الـ revert تلقائي
```

---

## 📋 8. أوامر سريعة (Cheat Sheet)

### على السيرفر:
```bash
# === حالة الـ runner ===
systemctl status actions.runner.*mazaya-runner*

# === لوجز الـ runner ===
journalctl -u actions.runner.*mazaya-runner* -f

# === حالة الخدمة ===
docker service ps furniture-xhl2yk

# === لوجز التطبيق ===
docker service logs furniture-xhl2yk --tail 50 -f

# === استهلاك الموارد ===
docker stats --no-stream

# === ريستارت التطبيق (من غير deploy) ===
docker service update --force furniture-xhl2yk

# === ريستارت الـ runner ===
systemctl restart actions.runner.*mazaya-runner*

# === شيل الـ runner (لو عايز تمسحه) ===
cd /opt/mazaya-runner
su - mazaya-runner -c "./config.sh remove"
exit
./svc.sh uninstall
```

### من جهازك (Windows):
```powershell
# === ارفع تعديل ===
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git add -A
git commit -m "feat: وصف التعديل"
git push origin main

# === اتفرج على الـ Actions ===
start https://github.com/momarzouk1998/Mazaya.openappo/actions

# === اتفرج على الـ runners ===
start https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners

# === افتح الموقع ===
start https://mazaya.openappo.com

# === اعمل deploy يدوي (لو محتاج) ===
# روح Actions → Deploy to Server → Run workflow
```

---

## 📞 معلومات التواصل / Debug

| الحاجة | المكان |
|---|---|
| **مستجدات الـ deploy** | https://github.com/momarzouk1998/Mazaya.openappo/actions |
| **حالة الـ runner** | https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners |
| **لوجز على السيرفر** | `journalctl -u actions.runner.* -f` |
| **لوجز التطبيق** | `docker service logs furniture-xhl2yk -f` |
| **SSH على السيرفر** | `ssh root@64.226.118.40` |
| **DO Console** | https://cloud.digitalocean.com/droplets/580266631 |

---

## 🎓 ملخص

| الوضع | قبل | بعد |
|---|---|---|
| **Workflow deploy** | SSH (بيفشل) | Self-hosted runner ✅ |
| **Secrets** | 3 (SSH_HOST, USER, KEY) | 0 ❌ |
| **Push → Live** | ~3 دقايق (لو شغّال) | ~3 دقايق (دائمًا) |
| **Debug** | صعب | سهل (لوجز واضحة) |
| **Setup** | ✅ خلاص | 15-20 دقيقة (مرة واحدة) |

**الـ setup بياخد 15-20 دقيقة مرة واحدة، وبعدها كل حاجة أوتوماتيك للأبد.**

---

*آخر تحديث: 2026-07-02*
