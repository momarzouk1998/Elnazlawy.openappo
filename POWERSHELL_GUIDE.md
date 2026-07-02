# 🛠️ دليل PowerShell الشامل — إدارة سيرفر Mazaya
## من جهازك (Windows) للسيرفر — بدون ما تفتح DO Console

> **الفلسفة:** كل حاجة تتحكم فيها من PowerShell على جهازك.
> السيرفر بيتعامل معاه زي ما بتتعامل مع أي folder على جهازك.

---

## 📑 الفهرس

1. [الإعداد الأولي (مرة واحدة بس)](#-1-الإعداد-الأولي-مرة-واحدة-بس)
2. [الاتصال بالسيرفر](#-2-الاتصال-بالسيرفر)
3. [أوامر الإدارة اليومية](#-3-أوامر-الإدارة-اليومية)
4. [الـ Deploy (الطريقة القديمة - SSH)](#-4-الـ-deploy-الطريقة-القديئة---ssh)
5. [الـ Deploy (الطريقة الجديدة - Self-Hosted Runner)](#-5-الـ-deploy-الطريقة-الجديدة---self-hosted-runner)
6. [إعداد Self-Hosted Runner (بالتفصيل)](#-6-إعداد-self-hosted-runner-بالتفصيل)
7. [حل المشاكل (Troubleshooting)](#-7-حل-المشاكل-troubleshooting)
8. [النسخ الاحتياطي والاسترجاع](#-8-النسخ-الاحتياطي-والاسترجاع)
9. [أوامر المراقبة](#-9-أوامر-المراقبة)
10. [Cheat Sheet (كل الأوامر في صفحة واحدة)](#-10-cheat-sheet-كل-الأوامر-في-صفحة-واحدة)

---

## 🚀 1. الإعداد الأولي (مرة واحدة بس)

### 1.1 تأكد إن PowerShell محدّث

```powershell
# افتح PowerShell كـ Administrator
# كليك يمين على Start → Windows PowerShell (Admin) أو Terminal (Admin)

# شوف الإصدار
$PSVersionTable.PSVersion

# لازم يكون 5.1 أو أحدث (ويندوز 10/11 بيكون OK)
```

### 1.2 تأكد إن OpenSSH Client موجود

```powershell
# شوف لو موجود
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# لو مش موجود، ثبّته
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### 1.3 اعمل alias للأوامر الطويلة (اختياري لكنه مريح)

افتح PowerShell profile:
```powershell
notepad $PROFILE
```

لو قالك الملف مش موجود، اعمله:
```powershell
New-Item -Path $PROFILE -ItemType File -Force
notepad $PROFILE
```

ضيف السطور دي في الملف (وعدّل الـ IP لو مختلف):
```powershell
# === Mazaya Server Shortcuts ===
function ssh-mazaya { ssh -i $HOME\.ssh\id_ed25519_momarzouk root@64.226.118.40 }
Set-Alias -Name mazaya -Value ssh-mazaya
function ssh-mazaya-cmd { param([Parameter(ValueFromRemainingArguments=$true)][string]$Cmd) ssh -i $HOME\.ssh\id_ed25519_momarzouk root@64.226.118.40 $Cmd }
Set-Alias -Name mazaya-cmd -Value ssh-mazaya-cmd
```

دلوقتي تقدر تكتب:
```powershell
mazaya "docker ps"
mazaya "docker service ps furniture-xhl2yk"
```

---

## 🔌 2. الاتصال بالسيرفر

### 2.1 الاتصال البسيط (لو كل حاجة مضبوطة)

```powershell
ssh root@64.226.118.40
```

**لو ظهر `Permission denied`:** المفتاح مش متسجّل أو الـ IP اتغير.

### 2.2 الاتصال بمفتاح محدد

```powershell
# صيغة الأمر
ssh -i "C:\Users\dell\.ssh\id_ed25519_momarzouk" root@64.226.118.40
```

### 2.3 تنفيذ أمر واحد بدون ما تدخل

```powershell
# بدل ما تدخل على السيرفر، نفذ الأمر وارجع
ssh root@64.226.118.40 "docker ps"

# مع مفتاح محدد
ssh -i $HOME\.ssh\id_ed25519_momarzouk root@64.226.118.40 "docker ps"

# مع alias
mazaya "docker ps"
```

### 2.4 لو الـ SSH بطيء أو بيقفل

**السبب:** DNS resolution أو KeepAlive.

**الحل:** اعمل ملف `C:\Users\dell\.ssh\config` وضيف:
```
Host 64.226.118.40
    User root
    IdentityFile ~/.ssh/id_ed25519_momarzouk
    ServerAliveInterval 60
    ServerAliveCountMax 3
    PreferredAuthentications publickey
    PasswordAuthentication no
```

### 2.5 نقل ملفات (scp)

```powershell
# رفع ملف من جهازك للسيرفر
scp "C:\path\to\file.txt" root@64.226.118.40:/opt/

# رفع مجلد كامل
scp -r "C:\path\to\folder" root@64.226.118.40:/opt/

# تنزيل ملف من السيرفر لجهازك
scp root@64.226.118.40:/root/backups/db.sql.gz "D:\backups\"
```

### 2.6 لو SSH مرفوض خالص — بديل DO Console

```powershell
# لو كل حاجة فشلت، افتح الـ Console من المتصفح:
Start-Process "https://cloud.digitalocean.com/droplets/580266631/access"
# اضغط Launch Droplet Console
```

---

## ⚙️ 3. أوامر الإدارة اليومية

> **الأوامر دي بتشتغل على السيرفر (بعد ما تعمل SSH).**
> أو من PowerShell مباشرة: `mazaya "الأمر"`

### 3.1 حالة الخدمة (Docker Swarm)

```bash
# شوف حالة الـ service (شغّال/معطّل، IDs، أخطاء)
docker service ps furniture-xhl2yk

# شوف معلومات تفصيلية
docker service inspect furniture-xhl2yk --pretty

# شغّال قد إيه؟ متى بدأ؟ الـ image ID؟
docker service ps furniture-xhl2yk --format "table {{.Name}}\t{{.CurrentState}}\t{{.Image}}"
```

### 3.2 اللوجز (Logs)

```bash
# آخر 50 سطر
docker service logs furniture-xhl2yk --tail 50

# متابعة لوجز حية (real-time)
docker service logs furniture-xhl2yk -f

# لوجز كونتينر محدد
CONTAINER_ID=$(docker ps --filter name=furniture-xhl2yk -q | head -1)
docker logs $CONTAINER_ID --tail 100

# لوجز حية ب timestamps
docker logs -f --timestamps $CONTAINER_ID

# فلترة اللوجز للبحث عن errors
docker service logs furniture-xhl2yk --tail 200 | Select-String "Error" -CaseSensitive:$false
# (الأمر ده PowerShell، لو على السيرفر نفسه استخدم grep)
docker service logs furniture-xhl2yk --tail 200 | grep -E "Error|⨯|TypeError|ReferenceError"
```

### 3.3 استهلاك الموارد

```bash
# استهلاك CPU/RAM لكل كونتينر
docker stats --no-stream

# استهلاك لـ service محددة بس
docker stats --no-stream $(docker ps --filter name=furniture-xhl2yk -q)

# الرام والسواپ
free -h

# مساحة القرص
df -h

# الـ Disk I/O
iostat  # لو مش موجود: apt install sysstat
```

### 3.4 ريستارت الخدمة (من غير deploy)

```bash
# ريستارت بسيط (بيسحب آخر image)
docker service update --force furniture-xhl2yk

# ريستارت بعد تغيير في الـ env vars
# (شوف القسم 3.5)
```

### 3.5 تعديل الـ Environment Variables

```bash
# شوف الـ env الحالية
docker service inspect furniture-xhl2yk --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}'

# الطريقة المُوصى بها: عدّل ملف /opt/mazaya/.env على السيرفر
nano /opt/mazaya/.env

# ثم ريستارت
docker service update --force furniture-xhl2yk
```

### 3.6 تنفيذ أمر داخل الكونتينر

```bash
# افتح shell داخل الكونتينر
CONTAINER_ID=$(docker ps --filter name=furniture-xhl2yk -q | head -1)
docker exec -it $CONTAINER_ID sh

# نفذ أمر بدون ما تدخل
docker exec $CONTAINER_ID ls -la /app

# شوف العمليات جوه الكونتينر
docker exec $CONTAINER_ID ps aux
```

### 3.7 إيقاف/تشغيل الخدمة

```bash
# إيقاف مؤقت
docker service scale furniture-xhl2yk=0

# تشغيل تاني
docker service scale furniture-xhl2yk=1

# ⚠️ ده بيوقف الخدمة بالكامل. استخدمه للصيانة بس.
```

---

## 🚢 4. الـ Deploy (الطريقة القديمة - SSH)

> **دي الطريقة اللي كانت شغّالة. هنسيبها كـ backup.**

### 4.1 من جهازك (الطريقة السريعة)

```powershell
# 1. اعمل التعديلات
# 2. ارفع على GitHub
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git add -A
git commit -m "fix: وصف التعديل"
git push origin main

# 3. استنى 2-4 دقايق (GitHub Actions بيكمّل)
# 4. افتح https://mazaya.openappo.com
```

### 4.2 الـ Deploy اليدوي (من PowerShell)

**لو الـ CI/CD واقع:**

```powershell
# تنفيذ كل الأوامر على السيرفر بـ ssh واحد
ssh root@64.226.118.40 @"
set -e
echo '=== Pulling image ==='
docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest
echo '=== Tagging ==='
docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest
echo '=== Updating service ==='
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
echo '=== Waiting ==='
sleep 8
echo '=== Status ==='
docker service ps furniture-xhl2yk
echo '=== Logs ==='
docker service logs furniture-xhl2yk --tail 20
"@
```

**أو خطوة بخطوة (للـ debugging):**

```powershell
# 1. سحب آخر صورة
ssh root@64.226.118.40 "docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest"

# 2. عمل tag محلي
ssh root@64.226.118.40 "docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest"

# 3. تحديث الـ service
ssh root@64.226.118.40 "docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk"

# 4. استنى
ssh root@64.226.118.40 "sleep 8"

# 5. شوف الحالة
ssh root@64.226.118.40 "docker service ps furniture-xhl2yk"
```

### 4.3 لو الـ Docker login عايز token

```powershell
# شوف الـ token
$env:GITHUB_TOKEN

# لو مش موجود، حطه
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxx"

# على السيرفر
ssh root@64.226.118.40 "echo `$GITHUB_TOKEN | docker login ghcr.io -u momarzouk1998 --password-stdin"
```

---

## 🤖 5. الـ Deploy (الطريقة الجديدة - Self-Hosted Runner)

> **الطريقة المُوصى بها. مجرد `git push` والموقع بيتحدث.**

### 5.1 الـ Workflow اليومي (بسيط جدًا)

```powershell
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"

# 1. عدّل الكود (في VS Code أو أي محرر)
# 2. اختبر محلياً
npm run dev
# افتح http://localhost:3000

# 3. لما تخلص
git add -A
git commit -m "feat: وصف التعديل"
git push origin main

# 4. استنى 2-3 دقايق
# 5. افتح https://mazaya.openappo.com
```

### 5.2 راقب الـ workflow

```powershell
# افتح الـ Actions
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/actions"

# شوف آخر run بـ API
$headers = @{"Accept" = "application/vnd.github+json"}
$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/momarzouk1998/Mazaya.openappo/actions/runs?per_page=3" -Headers $headers
$runs.workflow_runs | Select-Object run_number, name, status, conclusion, display_title | Format-Table
```

### 5.3 لو محتاج تعمل manual deploy

```powershell
# 1. روح الـ Actions
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/actions"

# 2. اختار "Deploy to Server" من الـ sidebar
# 3. اضغط "Run workflow" → "Run workflow"
```

أو من GitHub CLI (لو مثبّت):
```powershell
gh workflow run "Deploy to Server" --repo momarzouk1998/Mazaya.openappo
```

### 5.4 شوف حالة الـ Runner

```powershell
# من GitHub
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners"

# من السيرفر
ssh root@64.226.118.40 "systemctl status actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service"
```

---

## 🛠️ 6. إعداد Self-Hosted Runner (بالتفصيل)

> **الوقت:** 15-20 دقيقة (مرة واحدة)
> **المتطلبات:** PowerShell + SSH للسيرفر

### 6.1 جهّز الـ Token

```powershell
# افتح صفحة التسجيل
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners/new"
```

في الصفحة:
1. **Operating System:** Linux
2. **Architecture:** x64
3. **انسخ الـ Token** (اللي شكله `AXXX...`)
4. **انسخ** الأوامر اللي تحت (هتستخدمها في الخطوة الجاية)

### 6.2 الاتصال بالسيرفر

```powershell
ssh root@64.226.118.40
```

### 6.3 إنشاء مجلد ويوزر

```bash
# على السيرفر
cd /opt
mkdir -p mazaya-runner && cd mazaya-runner

# يوزر خاص (عشان الأمان)
useradd -m -s /bin/bash mazaya-runner
chown -R mazaya-runner:mazaya-runner /opt/mazaya-runner
```

### 6.4 تحميل الـ Runner

```bash
# حمّل آخر إصدار
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz

# ⚠️ لو ظهر warning إن الإصدار قديم، شوف أحدث إصدار من:
# https://github.com/actions/runner/releases

# فك الضغط
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz
chown -R mazaya-runner:mazaya-runner /opt/mazaya-runner
```

### 6.5 تسجيل الـ Runner مع GitHub

```bash
# انتقل لليوزر الجديد
su - mazaya-runner
cd /opt/mazaya-runner

# سجّل الـ runner (الصق الـ token من الخطوة 6.1)
./config.sh --url https://github.com/momarzouk1998/Mazaya.openappo --token TOKEN_HERE
```

**Prompts المتوقعة:**

| السؤال | الإجابة |
|--------|---------|
| Runner group | **Enter** (Default) |
| Runner name | **Enter** (اسم افتراضي) أو اكتب `mazaya-runner` |
| Additional labels | **Enter** (مفيش) |
| Work folder | **Enter** (`_work`) |

**المفروض يطبع:**
```
√ Connected to GitHub
√ Runner successfully added
√ Runner connection is good
```

### 6.6 تركيب كـ Systemd Service

```bash
# ارجع لـ root
exit
cd /opt/mazaya-runner

# ركّب الـ service
./svc.sh install mazaya-runner

# شغّله
systemctl start actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service

# فعّله عند الـ boot
systemctl enable actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service
```

### 6.7 إعطاء صلاحية Docker

```bash
# ضيف للـ docker group
usermod -aG docker mazaya-runner

# ريستارت عشان التغيير يتفعل
systemctl restart actions.runner.momarzouk1998-Mazaya-openappo.mazaya-runner.service

# تأكد
su - mazaya-runner -c "docker ps"
```

**المفروض يطبع قائمة الكونتينرات (فاضية أو فيها حاجة) — لو ظهرت، تمام.**

### 6.8 التحقق النهائي

**من السيرفر:**
```bash
# شوف الـ status
systemctl status actions.runner.*mazaya-runner*

# شوف اللوجز
journalctl -u actions.runner.*mazaya-runner* --since "5 minutes ago"
```

**من جهازك (PowerShell):**
```powershell
# افتح صفحة الـ runners
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners"

# المفروض تشوف "mazaya-runner" بحالة Idle ✅
```

**اختبار نهائي — اعمل deploy تجريبي:**
```powershell
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
"<!-- test $(Get-Date) -->" | Out-File -Append src\app\page.tsx -Encoding utf8
git add -A
git commit -m "test: verify self-hosted runner"
git push origin main
```

**بعد 2-3 دقايق:**
- روح https://github.com/momarzouk1998/Mazaya.openappo/actions
- اضغط على آخر run → Job "deploy" → المفروض يكون **success** ويظهر `Runner: self-hosted` ✅
- افتح https://mazaya.openappo.com — لازم تشوف التعديل

---

## 🚨 7. حل المشاكل (Troubleshooting)

### 7.1 الموقع راجع 502

**السبب:** Nginx مش لاقي الكونتينر (الكونتينر مش شغّال أو مش بيسمع على 3001).

**التشخيص من PowerShell:**
```powershell
# شوف حالة الخدمة
ssh root@64.226.118.40 "docker service ps furniture-xhl2yk"

# شوف اللوجز
ssh root@64.226.118.40 "docker service logs furniture-xhl2yk --tail 50"

# شوف الـ resources
ssh root@64.226.118.40 "free -h && docker stats --no-stream"
```

**الحلول:**

```powershell
# 1. ريستارت الخدمة
ssh root@64.226.118.40 "docker service update --force furniture-xhl2yk"

# 2. لو مفيش RAM (OOM Killed)
ssh root@64.226.118.40 "free -h"
# لو used قريبة من total:
ssh root@64.226.118.40 "docker ps -a"  # شوف الـ killed containers

# 3. لو الخطأ HOSTNAME=127.0.0.1 في اللوجز
# ده معناه الـ Dockerfile محتاج تعديل (شوف DEPLOY.md)
```

### 7.2 الموقع راجع 500

**السبب:** خطأ في الكود.

```powershell
# شوف اللوجز للـ errors
ssh root@64.226.118.40 "docker service logs furniture-xhl2yk --tail 100" | Select-String "Error|⨯|TypeError"

# أخطاء شائعة:
# - PrismaClientInitializationError → مشكلة DB connection
# - libssl.so.1.1 → مشكلة Prisma + Alpine (شوف DEPLOY.md)
# - Cannot find module → package.json ناقص
```

### 7.3 الـ GitHub Actions deploy بيفشل

**شوف الـ error:**
```powershell
# افتح الـ run الأخير
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/actions"
```

**الأخطاء الشائعة:**

#### ❌ `Permission denied (publickey)`
**السبب:** الـ `SSH_PRIVATE_KEY` secret قديم.
**الحل:** حدثه من https://github.com/momarzouk1998/Mazaya.openappo/settings/secrets/actions

أو **استخدم self-hosted runner** (الطريقة الجديدة) عشان تتجنب المشكلة دي خالص.

#### ❌ `service furniture-xhl2yk not found`
**السبب:** الـ Swarm service اتمسحت.
**الحل:**
```powershell
ssh root@64.226.118.40 @"
docker service create \
  --name furniture-xhl2yk \
  --restart-condition any \
  --network host \
  --env-file /opt/mazaya/.env \
  ghcr.io/momarzouk1998/mazaya.openappo:latest
"@
```

#### ❌ `npm ci` error في الـ build
**السبب:** `package.json` و `package-lock.json` مش متطابقين.
**الحل:**
```powershell
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
npm install
git add package.json package-lock.json
git commit -m "fix: sync package-lock"
git push origin main
```

### 7.4 السيرفر مش بيرد على SSH أصلاً

```powershell
# 1. تأكد إن السيرفر شغّال (ping)
ping 64.226.118.40

# 2. لو ping بيفشل — السيرفر واقع
# ادخل DO Console: https://cloud.digitalocean.com/droplets/580266631
# اضغط Power → Reboot

# 3. لو ping بيشتغل بس SSH بيرفض
# تأكد إن الـ port 22 مفتوح
Test-NetConnection -ComputerName 64.226.118.40 -Port 22

# 4. لو الـ key مش مقبول
ssh -i $HOME\.ssh\id_ed25519_momarzouk -v root@64.226.118.40 "echo OK"
# شوف الـ output للتفاصيل
```

### 7.5 الـ Runner مش بياخد Jobs

```powershell
# 1. شوف حالة الـ runner
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners"

# 2. لو Offline:
ssh root@64.226.118.40 "systemctl status actions.runner.*mazaya-runner*"

# 3. لو الـ service مش شغّال:
ssh root@64.226.118.40 @"
systemctl start actions.runner.*mazaya-runner*
systemctl enable actions.runner.*mazaya-runner*
"@

# 4. شوف اللوجز
ssh root@64.226.118.40 "journalctl -u actions.runner.*mazaya-runner* -n 50"

# 5. لو الـ token انتهى، أعد التسجيل:
ssh root@64.226.118.40 @"
cd /opt/mazaya-runner
su - mazaya-runner -c './config.sh remove'
"@
# ثم روح https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners/new
# واعمل التسجيل من جديد
```

### 7.6 Disk Full

```powershell
# شوف الاستخدام
ssh root@64.226.118.40 "df -h"

# شوف أكبر الـ images
ssh root@64.226.118.40 "docker images --format '{{.Size}}\t{{.Repository}}:{{.Tag}}' | sort -rh | head -10"

# تنظيف
ssh root@64.226.118.40 @"
docker image prune -a
docker container prune
docker builder prune -a
docker volume prune
"@
```

### 7.7 OOM (Out of Memory)

```powershell
# شوف الـ RAM
ssh root@64.226.118.40 "free -h"

# شوف الـ Swap
ssh root@64.226.118.40 "swapon --show"

# لو مفيش swap (والسيرفر 2GB):
ssh root@64.226.118.40 @"
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
"@

# شوف أكتر العمليات استهلاكاً
ssh root@64.226.118.40 "top -b -n 1 | head -20"
```

---

## 💾 8. النسخ الاحتياطي والاسترجاع

### 8.1 Backup لـ PostgreSQL

**من PowerShell:**
```powershell
# Backup يدوي
$date = Get-Date -Format "yyyyMMdd"
ssh root@64.226.118.40 "docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/mazaya-$date.sql.gz"

# تأكد إن الـ backup موجود
ssh root@64.226.118.40 "ls -lh /root/backups/"
```

**تنزيل الـ backup على جهازك:**
```powershell
# اعمل مجلد للـ backups
New-Item -ItemType Directory -Force -Path "D:\backups\mazaya"

# حمّل آخر backup
$latest = ssh root@64.226.118.40 "ls -t /root/backups/mazaya-*.sql.gz | head -1"
scp "root@64.226.118.40:${latest}" "D:\backups\mazaya\"
```

**Backup تلقائي (Cron Job):**
```powershell
# ضيف cron job على السيرفر (الساعة 3 الفجر كل يوم)
ssh root@64.226.118.40 @"
(crontab -l 2>/dev/null; echo '0 3 * * * docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/mazaya-\$(date +\%Y\%m\%d).sql.gz') | crontab -
"@
```

### 8.2 Restore من Backup

```powershell
# شوف آخر backup على السيرفر
ssh root@64.226.118.40 "ls -lt /root/backups/ | head -5"

# ⚠️ ده هيستبدل الـ DB الحالية كلها
$backupFile = "/root/backups/mazaya-20260702.sql.gz"
ssh root@64.226.118.40 "gunzip -c $backupFile | docker exec -i mazaya-postgres psql -U mazaya -d mazaya"
```

### 8.3 Backup لـ Docker Image

```powershell
# احفظ آخر image محلي
$date = Get-Date -Format "yyyyMMdd"
ssh root@64.226.118.40 "docker save furniture-xhl2yk:latest | gzip > /root/backups/mazaya-image-$date.tar.gz"
```

### 8.4 Restore من Image Backup

```powershell
# ارفع الـ backup للسيرفر
scp "D:\backups\mazaya\mazaya-image-20260702.tar.gz" root@64.226.118.40:/root/backups/

# فكه وحدّث الـ service
ssh root@64.226.118.40 @"
gunzip -c /root/backups/mazaya-image-20260702.tar.gz | docker load
docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
"@
```

### 8.5 Rollback لـ Commit قديم

**من جهازك (الأسهل):**
```powershell
# شوف آخر 10 commits
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git log --oneline -10

# اعمل revert (أنسب من reset)
git revert HEAD
git push origin main
# الـ CI/CD هيـ deploy الـ revert تلقائي
```

**من السيرفر (لو مستعجل):**
```powershell
# شوف الـ tags المتاحة على GHCR
$tags = ssh root@64.226.118.40 "curl -s https://api.github.com/repos/momarzouk1998/Mazaya.openappo/packages/container/mazaya.openappo/versions | ConvertFrom-Json | Select-Object -First 5"
$tags | Select-Object metadata, created_at

# شغّل إصدار قديم (مثال)
ssh root@64.226.118.40 @"
docker pull ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_SHA
docker tag ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_SHA furniture-xhl2yk:latest
docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk
"@
```

---

## 📊 9. أوامر المراقبة

### 9.1 Dashboard سريع

```powershell
# شوف كل حاجة في شاشة واحدة
ssh root@64.226.118.40 @"
echo '=== SYSTEM ==='
uptime
echo ''
echo '=== RAM ==='
free -h
echo ''
echo '=== DISK ==='
df -h
echo ''
echo '=== DOCKER SERVICES ==='
docker service ls
echo ''
echo '=== RUNNING CONTAINERS ==='
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ''
echo '=== APP LOGS (last 10) ==='
docker service logs furniture-xhl2yk --tail 10
"@
```

### 9.2 Health Check (HTTP)

```powershell
# داخلي (على السيرفر)
ssh root@64.226.118.40 "curl -s -o /dev/null -w 'HTTP: %{http_code} | Time: %{time_total}s\n' http://127.0.0.1:3001/"

# خارجي (من جهازك لـ https)
(Invoke-WebRequest -Uri "https://mazaya.openappo.com/" -UseBasicParsing).StatusCode

# اختبار شامل
(Invoke-WebRequest -Uri "https://mazaya.openappo.com/login" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "https://mazaya.openappo.com/dashboard" -UseBasicParsing).StatusCode
```

### 9.3 Monitoring دوري (كل 5 ثواني)

```powershell
# PowerShell loop
while ($true) {
    Clear-Host
    Write-Host "=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -ForegroundColor Cyan
    ssh root@64.226.118.40 "docker stats --no-stream $(docker ps --filter name=furniture-xhl2yk -q | head -1) 2>/dev/null" 2>$null
    Start-Sleep -Seconds 5
}
# اضغط Ctrl+C للخروج
```

### 9.4 تنبيهات بـ PowerShell

```powershell
# راقب الموقع — لو وقع، انبّهك
while ($true) {
    try {
        $response = Invoke-WebRequest -Uri "https://mazaya.openappo.com/" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ne 200) {
            [Console]::Beep(1000, 500)
            Write-Host "⚠️ الموقع راجع $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        [Console]::Beep(1000, 500)
        Write-Host "🚨 الموقع واقع! $_" -ForegroundColor Red
        break
    }
    Start-Sleep -Seconds 30
}
```

---

## 📋 10. Cheat Sheet (كل الأوامر في صفحة واحدة)

### من جهازك (PowerShell):

```powershell
# === الاتصال ===
ssh root@64.226.118.40
ssh -i $HOME\.ssh\id_ed25519_momarzouk root@64.226.118.40 "docker ps"

# === Deploy سريع ===
cd "D:\OPEN APPS\DigitalOcian Projects\mazaya-system"
git add -A && git commit -m "fix: xxx" && git push origin main

# === Manual deploy ===
ssh root@64.226.118.40 "docker pull ghcr.io/momarzouk1998/mazaya.openappo:latest && docker tag ghcr.io/momarzouk1998/mazaya.openappo:latest furniture-xhl2yk:latest && docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk"

# === الحالة ===
ssh root@64.226.118.40 "docker service ps furniture-xhl2yk"
ssh root@64.226.118.40 "docker service logs furniture-xhl2yk --tail 30"
ssh root@64.226.118.40 "docker stats --no-stream"
ssh root@64.226.118.40 "free -h && df -h"

# === ريستارت ===
ssh root@64.226.118.40 "docker service update --force furniture-xhl2yk"

# === Backup ===
ssh root@64.226.118.40 "docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/mazaya-$(Get-Date -Format yyyyMMdd).sql.gz"
scp root@64.226.118.40:/root/backups/mazaya-*.sql.gz "D:\backups\"

# === Rollback ===
ssh root@64.226.118.40 "docker pull ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_SHA && docker tag ghcr.io/momarzouk1998/mazaya.openappo:main-OLD_SHA furniture-xhl2yk:latest && docker service update --image furniture-xhl2yk:latest --force furniture-xhl2yk"

# === فتح صفحات مهمة ===
Start-Process "https://mazaya.openappo.com"
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/actions"
Start-Process "https://github.com/momarzouk1998/Mazaya.openappo/settings/actions/runners"
Start-Process "https://cloud.digitalocean.com/droplets/580266631"
```

### على السيرفر (بعد SSH):

```bash
# === الحالة ===
docker service ps furniture-xhl2yk
docker service logs furniture-xhl2yk --tail 50
docker stats --no-stream
free -h && df -h

# === الإدارة ===
docker service update --force furniture-xhl2yk
docker service scale furniture-xhl2yk=0  # إيقاف
docker service scale furniture-xhl2yk=1  # تشغيل

# === الكونتينر ===
CID=$(docker ps --filter name=furniture-xhl2yk -q | head -1)
docker logs $CID --tail 50
docker exec -it $CID sh

# === Self-Hosted Runner ===
systemctl status actions.runner.*mazaya-runner*
journalctl -u actions.runner.*mazaya-runner* -f
systemctl restart actions.runner.*mazaya-runner*

# === Backup ===
docker exec mazaya-postgres pg_dump -U mazaya mazaya | gzip > /root/backups/db-$(date +%Y%m%d).sql.gz

# === التنظيف ===
docker image prune -a
docker container prune
docker builder prune -a
```

---

## 🎓 ملخص

| الحاجة | الحل |
|---|---|
| **أسرع deploy** | `git push` (مع self-hosted runner) |
| **Manual deploy** | `ssh ... "docker pull ... && docker service update ..."` |
| **Backup** | `ssh ... "docker exec ... pg_dump ..."` |
| **Rollback** | `git revert` + push |
| **الـ Monitoring** | `ssh ... "docker stats"` أو loop في PowerShell |
| **لو SSH واقع** | DO Console كـ backup |

**كل حاجة من PowerShell. مفيش Console. مفيش Web UI. بس أوامر. 🎯**

---

*آخر تحديث: 2026-07-02*
