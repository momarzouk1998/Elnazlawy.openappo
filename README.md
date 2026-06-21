# مصنع مزايا للأثاث - نظام الإدارة | Mazaya Furniture Management System

نظام إدارة متكامل لمصنع الأثاث: مخزون، أوردرات، يومية مالية، معارض، عملاء، وتقارير.

## المميزات

- 📦 إدارة مخزون الألواح والاكسسوارات (~560 كود)
- 📋 أوردرات تصنيع وصيانة مع تتبع التكاليف التلقائي
- 💰 يومية مالية + ملخص أسبوعي + صندوق رصيد
- 🏪 إدارة 4 معارض وعملاء كل معرض
- 👥 نظام صلاحيات متقدم (Admin / Branch User)
- 📊 تقارير + تصدير Excel
- 📱 PWA — يشتغل على الموبايل كتطبيق

## التقنيات

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL + Auth + RLS)
- **Charts**: Recharts
- **Excel**: SheetJS
- **PWA**: Manifest + Service Worker

## الإعداد السريع

راجع [`SETUP_AR.md`](./SETUP_AR.md) للدليل الكامل بالعربية.

```bash
npm install
cp .env.example .env.local  # عدّل القيم
npm run dev
```

## الترخيص

خاص بـ مصنع مزايا للأثاث. جميع الحقوق محفوظة.
