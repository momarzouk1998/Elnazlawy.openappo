-- =============================================================
-- Mazaya: Drop Arabic CHECK constraints + convert data to English
-- Run this to fix the 500 errors on all POST/PATCH endpoints
-- =============================================================

BEGIN;

-- Drop ALL CHECK constraints that require Arabic values
ALTER TABLE IF EXISTS mazaya.orders              DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE IF EXISTS mazaya.orders              DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE IF EXISTS mazaya.journal_entries      DROP CONSTRAINT IF EXISTS journal_entries_entry_type_check;
ALTER TABLE IF EXISTS mazaya.journal_entries      DROP CONSTRAINT IF EXISTS journal_entries_payment_method_check;
ALTER TABLE IF EXISTS mazaya.journal_entries      DROP CONSTRAINT IF EXISTS journal_entries_party_type_check;
ALTER TABLE IF EXISTS mazaya.suppliers            DROP CONSTRAINT IF EXISTS suppliers_payment_type_check;
ALTER TABLE IF EXISTS mazaya.contractors          DROP CONSTRAINT IF EXISTS contractors_type_check;
ALTER TABLE IF EXISTS mazaya.order_materials      DROP CONSTRAINT IF EXISTS order_materials_item_category_check;
ALTER TABLE IF EXISTS mazaya.order_external_work  DROP CONSTRAINT IF EXISTS order_external_work_work_type_check;

-- Convert existing data from Arabic → English
UPDATE mazaya.orders SET order_type = 'new'          WHERE order_type = 'تصنيع جديد';
UPDATE mazaya.orders SET order_type = 'maintenance'  WHERE order_type = 'صيانة';
UPDATE mazaya.orders SET status = 'open'             WHERE status = 'مفتوح';
UPDATE mazaya.orders SET status = 'in_progress'      WHERE status = 'قيد التنفيذ';
UPDATE mazaya.orders SET status = 'completed'        WHERE status = 'مكتمل';
UPDATE mazaya.orders SET status = 'delivered'        WHERE status = 'تم التسليم';

UPDATE mazaya.journal_entries SET entry_type = 'purchase'    WHERE entry_type = 'مشتريات';
UPDATE mazaya.journal_entries SET entry_type = 'income'      WHERE entry_type = 'دفعة واردة من معرض';
UPDATE mazaya.journal_entries SET entry_type = 'expense'     WHERE entry_type = 'دفعة صادرة لمورد';
UPDATE mazaya.journal_entries SET entry_type = 'transfer'    WHERE entry_type = 'تحويل تمريري';
UPDATE mazaya.journal_entries SET entry_type = 'overhead'    WHERE entry_type = 'نثريات';
UPDATE mazaya.journal_entries SET payment_method = 'cash'    WHERE payment_method = 'نقدي';
UPDATE mazaya.journal_entries SET payment_method = 'transfer' WHERE payment_method = 'تحويل';

UPDATE mazaya.suppliers SET payment_type = 'cash'    WHERE payment_type = 'نقدي';
UPDATE mazaya.suppliers SET payment_type = 'transfer' WHERE payment_type IN ('تحويل', 'آجل');
UPDATE mazaya.suppliers SET payment_type = 'both'    WHERE payment_type IN ('كلاهما', 'نقدي وآجل');

UPDATE mazaya.order_materials SET item_category = 'board'     WHERE item_category IN ('boards_inventory', 'board');
UPDATE mazaya.order_materials SET item_category = 'accessory' WHERE item_category IN ('accessories_inventory', 'accessory');

COMMIT;
