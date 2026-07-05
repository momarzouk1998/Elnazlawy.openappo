-- ترحيل (migration) قيم طرق الدفع وأنواع الحركات من الإنجليزي للعربي
-- السبب: بيانات قديمة (seed) كانت بالإننجليزي فظهرت كخيارات مكررة في القوائم.
-- التطبيع ده بيوحّد كل القيم على العربي عشان الـ UI يبقى نظيف.

BEGIN;

-- 1) journal_entries.payment_method: 'cash' -> 'نقدي', 'transfer' -> 'تحويل'
UPDATE mazaya.journal_entries SET payment_method = 'نقدي' WHERE payment_method = 'cash';
UPDATE mazaya.journal_entries SET payment_method = 'تحويل' WHERE payment_method = 'transfer';
-- أي قيمة غريبة تانية تتحول لنقدي (الافتراضي)
UPDATE mazaya.journal_entries SET payment_method = 'نقدي'
  WHERE payment_method IS NOT NULL
    AND payment_method NOT IN ('نقدي', 'تحويل');

-- 2) journal_entries.entry_type: توحيد القيم الإنجليزي للعربي
UPDATE mazaya.journal_entries SET entry_type = 'مشتريات'           WHERE entry_type = 'purchase';
UPDATE mazaya.journal_entries SET entry_type = 'دفعة واردة من معرض' WHERE entry_type = 'incoming_from_branch';
UPDATE mazaya.journal_entries SET entry_type = 'دفعة صادرة لمورد'  WHERE entry_type = 'outgoing_to_supplier';
UPDATE mazaya.journal_entries SET entry_type = 'تحويل تمريري'      WHERE entry_type = 'transfer';
UPDATE mazaya.journal_entries SET entry_type = 'نثريات'            WHERE entry_type = 'overhead';

-- 3) overhead_expenses.payment_method
UPDATE mazaya.overhead_expenses SET payment_method = 'نقدي' WHERE payment_method = 'cash';
UPDATE mazaya.overhead_expenses SET payment_method = 'تحويل' WHERE payment_method = 'transfer';
UPDATE mazaya.overhead_expenses SET payment_method = 'نقدي'
  WHERE payment_method IS NOT NULL
    AND payment_method NOT IN ('نقدي', 'تحويل');

-- 4) suppliers.payment_type: 'cash' -> 'نقدي', 'transfer' -> 'تحويل', 'both' -> 'كلاهما'
UPDATE mazaya.suppliers SET payment_type = 'نقدي'  WHERE payment_type = 'cash';
UPDATE mazaya.suppliers SET payment_type = 'تحويل' WHERE payment_type = 'transfer';
UPDATE mazaya.suppliers SET payment_type = 'كلاهما' WHERE payment_type = 'both';

-- 5) orders.status: توحيد حالات الأوردر
UPDATE mazaya.orders SET status = 'مفتوح'        WHERE status = 'open';
UPDATE mazaya.orders SET status = 'قيد التنفيذ'   WHERE status = 'in_progress';
UPDATE mazaya.orders SET status = 'مكتمل'         WHERE status = 'completed';
UPDATE mazaya.orders SET status = 'تم التسليم'    WHERE status = 'delivered';

-- 6) orders.order_type
UPDATE mazaya.orders SET order_type = 'تصنيع جديد' WHERE order_type = 'new';
UPDATE mazaya.orders SET order_type = 'صيانة'      WHERE order_type = 'maintenance';

COMMIT;

-- ملاحظة: الـ schema الحالي بيستخدم VARCHAR مش ENUM، فمفيش حاجة تكسر.
-- الـ API اللي اتصحح هيرفض القيم الإنجليزي من دلوقتي، فمش هترجع تاني.
