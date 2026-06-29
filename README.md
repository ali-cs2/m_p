# منصة ذاكرة الموصل

منصة عربية RTL لدراسة أثر الذاكرة البصرية للتراث الموصلي قبل الحرب وبعدها على الهوية الوطنية والصمود النفسي.

المشروع Vanilla HTML/CSS/JavaScript بدون React وبدون Backend خاص. يعمل محلياً عبر `localStorage`، ويمكن ربطه بـ Supabase عبر مفتاح `anon public` فقط.

## التشغيل المحلي

من مجلد المشروع:

```powershell
npm run build
python -m http.server 8000
```

ثم افتح:

```text
http://localhost:8000
```

يمكن أيضاً فتح `index.html` مباشرة، لكن يفضل الخادم المحلي لاختبار تحميل الملفات.

## إضافة الصور

ضع الصور داخل مجلد `images/` بالأسماء المحددة في `js/data.js`:

```text
site_01_before.jpg
site_01_after.jpg
...
site_10_before.jpg
site_10_after.jpg
```

إذا لم تكن الصورة موجودة، تعرض الواجهة رسالة عربية واضحة بدل كسر التصميم.

## إعداد قاعدة البيانات وربطها مع Vercel

### A. إعداد Supabase

1. أنشئ مشروع Supabase جديداً.
2. افتح SQL Editor.
3. انسخ وشغّل محتوى `supabase/schema.sql`.
4. اذهب إلى Settings ثم API.
5. انسخ Project URL.
6. انسخ anon public key فقط.
7. لا تستخدم مفتاح service_role في الواجهة أبداً.

الجداول المطلوبة هي:

- `participants`
- `scales`
- `image_responses`

تم تفعيل RLS، والسياسات تسمح بـ INSERT فقط للدور `anon`، ولا توجد سياسات عامة للقراءة أو التعديل أو الحذف.

### B. إعداد Vercel

1. افتح مشروع Vercel.
2. اذهب إلى Settings ثم Environment Variables.
3. أضف:

```text
SUPABASE_URL = Supabase Project URL
SUPABASE_ANON_KEY = Supabase anon public key
```

4. اجعل Build Command:

```text
npm run build
```

5. اجعل Output Directory:

```text
.
```

6. أعد النشر.

ملف `js/config.js` يتم إنشاؤه وقت البناء من متغيرات البيئة، وهو مضاف إلى `.gitignore` حتى لا تُرفع المفاتيح إلى GitHub.

### C. الإعداد المحلي لـ Supabase

1. انسخ `js/config.example.js` إلى `js/config.js`.
2. ضع Project URL ومفتاح anon public.
3. شغّل خادماً محلياً.
4. اختبر مسار مشارك كامل.
5. افتح Supabase Table Editor وتأكد من ظهور الصفوف.

إذا لم تضف `js/config.js` أو لم تضف المفاتيح، ستعمل المنصة بالحفظ المحلي فقط.

### D. التحقق من الحفظ

بعد إكمال مشاركة كاملة:

- جدول `participants` يستقبل صفاً واحداً للمشارك.
- جدول `scales` يستقبل أربعة صفوف لكل مشارك.
- جدول `image_responses` يستقبل عشرة صفوف لكل مشارك.
- إذا فشل Supabase، تبقى نسخة احتياطية في `localStorage`.

## استخراج CSV للتحليل

من Supabase SQL Editor يمكن تشغيل استعلام مثل:

```sql
select
  p.name,
  p.age_range,
  p.gender,
  p.academic_qualification,
  p.study_stage,
  p.specialization,
  p.residence_side,
  p.economic_level,
  p.religion,
  p.marital_status,
  p.profession,
  ir.site_id,
  ir.site_name,
  ir.hope,
  ir.belonging,
  ir.pride,
  ir.happiness,
  ir.sadness,
  ir.anger,
  ir.fear,
  ir.reaction_time_ms,
  ir.submitted_at
from image_responses ir
join participants p on p.id = ir.participant_id
order by ir.submitted_at;
```

ثم استخدم زر Download CSV من نتائج Supabase.

محلياً، يمكن نسخ النسخة الاحتياطية من Console:

```javascript
copy(localStorage.getItem("mosul_memory_platform_final_payload_v1"))
```

## دعم Supabase CLI اختياري

الطريقة الأساسية الموصى بها هي SQL Editor. إذا كان Supabase CLI مثبتاً والمشروع مربوطاً:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

لا تشغّل ترحيل قاعدة البيانات تلقائياً إلا بعد التأكد من ربط المشروع الصحيح.

## ملاحظات تقنية

- جميع الحقول الديمغرافية مطلوبة.
- مقياس الهوية الوطنية يحفظ الإجابات الخام ويحسب الدرجة بعد عكس الفقرات 6 و7 و13 و17.
- زمن استجابة الصور يبدأ من أول اختيار شعوري وينتهي عند الضغط على زر الموقع التالي.
- زر تعريف الشعور يظهر كأيقونة فقط `ⓘ` مع `aria-label`.
- التصميم متجاوب للموبايل والتابلت وسطح المكتب.
