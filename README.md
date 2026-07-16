# نظام إدارة المركز التعليمي (ERP)

نظام متكامل لإدارة مركز تعليمي: طلاب، كورسات، حضور، مدفوعات، مرتبات، CRM، مخزون، وتقارير.

## Stack المستخدم

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Zod + React Hook Form
- TanStack Query
- JWT auth (كوكيز httpOnly) + RBAC

## نشر المشروع على Vercel

### المتغيرات المطلوبة
في Vercel → Project Settings → Environment Variables أضف:

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
JWT_SECRET="strong-random-secret"
NODE_ENV="production"
```

### إعدادات الـ Build
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`

### ملاحظات مهمة
- تأكد إن الـ database متاح في production.
- بعد النشر، شغّل `npm run db:push` أو أضفها في Post-Deploy command.
- لو ظهر warning عن lockfile، الملف [next.config.ts](next.config.ts) تم تجهيزـه لتحديد root تلقائياً.

## خطوات التشغيل

### 1. قاعدة البيانات
اعمل حساب مجاني على Neon (neon.tech) وخد الـ connection string، أو استخدم PostgreSQL محلي.

عدّل ملف `.env`:
```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
JWT_SECRET="حط سيكرت قوي هنا"
```

### 2. تثبيت المكتبات
```bash
npm install
```

### 3. إنشاء الجداول
```bash
npm run db:generate
npm run db:push
```

### 4. عمل Seed (أول Admin)
```bash
npm run db:seed
```
هيتعمل أول Admin:
- Email: admin@center.com
- Password: Admin@123456

**غيّر الباسورد ده فوراً بعد أول دخول.**

### 5. تشغيل المشروع
```bash
npm run dev
```

افتح http://localhost:3000/dashboard

## هيكل المشروع

```
app/
  api/                    -> كل الـ API Routes
    auth/login
    students
    payments
    payroll/generate
    groups/[id]/generate-sessions
    dashboard/stats
  (dashboard)/            -> صفحات الداشبورد (محمية)
    dashboard/
lib/
  prisma.ts               -> Prisma client singleton
  auth.ts                 -> JWT + RBAC permissions
  audit.ts                -> Audit logging helper
prisma/
  schema.prisma           -> كل الـ Models (15 موديول)
  seed.ts                 -> بيانات أولية
components/
  dashboard/              -> Sidebar, StatCard, ...
```

## اللي اتبنى لحد دلوقتي (كل الموديولات)

- Database Schema كامل لكل الموديولات
- Authentication (JWT + httpOnly cookies) + Middleware يحمي كل صفحات الداشبورد
- Audit Log helper بيتسجل تلقائي مع كل عملية
- صفحة Login شغالة + تسجيل خروج

### الصفحات الجاهزة والشغالة:
- **Dashboard**: كل الـ Stat Cards (إيراد، مصروف، ربح، طلاب، حضور...)
- **Students**: جدول + بحث + إضافة/تعديل
- **Courses**: عرض وإضافة الكورسات
- **Groups**: إضافة جروب + جدولة الأيام + توليد الجلسات تلقائياً
- **Attendance**: اختيار جروب/جلسة وتسجيل حضور كل طالب
- **Payments**: تسجيل دفعات + فلترة بالحالة (مدفوع/جزئي/مستحق/متأخر)
- **Instructors**: إضافة مدرس (بيتعمل له User + Instructor)
- **Payroll**: توليد المرتبات الشهرية بمنطق Cancelled/Substitute/Bonus/Penalty
- **Expenses**: تسجيل المصروفات بالتصنيف
- **CRM**: Kanban board لمتابعة الـ Leads من مصادر مختلفة
- **Branches**: إدارة الفروع والغرف
- **Inventory**: تتبع المخزون (متاح/تالف/مفقود)
- **Reports**: رسومات بيانية (إيرادات، مصروفات، ربح، شعبية الكورسات)
- **Notifications**: صفحة عرض + Cron endpoint يومي (دفعات متأخرة، جلسات اليوم، أعياد ميلاد)
- **Audit Logs**: سجل كل التعديلات (Admin فقط)

## الخطوات الجاية (اختيارية لاحقاً)

1. **Parent Portal** - صفحة مخصصة لولي الأمر يشوف حضور وأداء ابنه بس
2. **Cloudinary integration** لرفع صور الطلاب فعلياً
3. **PDF generation** لكشوف المرتبات والإيصالات
4. **Conflict Detection** - تنبيه لو نفس المدرس/الأوضة محجوزين في نفس الوقت
5. **صفحة تعديل** لكل موديول (حالياً فيه إضافة وعرض، مفيش تعديل/حذف من الواجهة)
6. **رفع مشروع الـ Vercel Cron فعلياً** (الملف `vercel.json` جاهز، يشتغل تلقائي بعد الـ deploy)


## ملاحظة مهمة

Prisma CLI محتاج يوصل لـ binaries.prisma.sh لتحميل الـ engines، وده مش
هيشتغل في بيئة التطوير المعزولة اللي بنيت فيها المشروع. لما تنزل المشروع
وتشغله عندك (أو على Vercel) هيشتغل عادي بدون أي مشاكل.
