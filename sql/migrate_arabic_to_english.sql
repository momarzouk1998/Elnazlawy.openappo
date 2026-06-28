-- =============================================================
-- Mazaya: Convert DB values from Arabic → English
-- WHY: Prisma schema and frontend send English values
-- (new/open/cash/transfer), but DB CHECK constraints
-- (added manually after Prisma created tables) expect Arabic.
-- This migration:
--   1. Drops all problematic CHECK constraints
--   2. Converts existing Arabic values to English
--   3. Leaves columns as TEXT (Prisma manages validation)
-- =============================================================

BEGIN;

-- =============================================================
-- 1. DROP CHECK CONSTRAINTS (safe with IF EXISTS)
-- =============================================================
ALTER TABLE IF EXISTS mazaya.orders              DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE IF EXISTS mazaya.orders              DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE IF EXISTS mazaya.journal_entries      DROP CONSTRAINT IF EXISTS journal_entries_entry_type_check;
ALTER TABLE IF EXISTS mazaya.journal_entries      DROP CONSTRAINT IF EXISTS journal_entries_payment_method_check;
ALTER TABLE IF EXISTS mazaya.suppliers            DROP CONSTRAINT IF EXISTS suppliers_payment_type_check;
ALTER TABLE IF EXISTS mazaya.contractors          DROP CONSTRAINT IF EXISTS contractors_type_check;

-- =============================================================
-- 2. CONVERT EXISTING DATA: orders
-- =============================================================
UPDATE mazaya.orders SET order_type = 'new'          WHERE order_type = 'تصنيع جديد';
UPDATE mazaya.orders SET order_type = 'maintenance'  WHERE order_type = 'صيانة';

UPDATE mazaya.orders SET status = 'open'             WHERE status = 'مفتوح';
UPDATE mazaya.orders SET status = 'in_progress'      WHERE status = 'قيد التنفيذ';
UPDATE mazaya.orders SET status = 'completed'        WHERE status = 'مكتمل';
UPDATE mazaya.orders SET status = 'delivered'        WHERE status = 'تم التسليم';

-- =============================================================
-- 3. CONVERT EXISTING DATA: journal_entries
--    (Using frontend key values so LABELS/COLORS work)
-- =============================================================
UPDATE mazaya.journal_entries SET entry_type = 'purchase'              WHERE entry_type = 'مشتريات';
UPDATE mazaya.journal_entries SET entry_type = 'income'                WHERE entry_type = 'دفعة واردة من معرض';
UPDATE mazaya.journal_entries SET entry_type = 'expense'               WHERE entry_type = 'دفعة صادرة لمورد';
UPDATE mazaya.journal_entries SET entry_type = 'transfer'              WHERE entry_type = 'تحويل تمريري';
UPDATE mazaya.journal_entries SET entry_type = 'overhead'              WHERE entry_type = 'نثريات';

UPDATE mazaya.journal_entries SET payment_method = 'cash'              WHERE payment_method = 'نقدي';
UPDATE mazaya.journal_entries SET payment_method = 'transfer'          WHERE payment_method = 'تحويل';

-- =============================================================
-- 4. CONVERT EXISTING DATA: suppliers
-- =============================================================
UPDATE mazaya.suppliers SET payment_type = 'cash'                      WHERE payment_type = 'نقدي';
UPDATE mazaya.suppliers SET payment_type = 'transfer'                  WHERE payment_type = 'آجل';
UPDATE mazaya.suppliers SET payment_type = 'both'                      WHERE payment_type = 'كلاهما';

-- =============================================================
-- 5. CONVERT EXISTING DATA: contractors
--    type column stores Arabic specialties (ألوميتال, تنجيد, نقل)
--    Keep them as-is since frontend selects from material_types;
--    the CHECK constraint was the issue, now removed.
-- =============================================================

-- =============================================================
-- 6. FIX order_materials: item_category rename
--    Prisma uses 'item_category' but some code may send 'inventory_table'
-- =============================================================
UPDATE mazaya.order_materials SET item_category = 'board'              WHERE item_category = 'boards_inventory';
UPDATE mazaya.order_materials SET item_category = 'accessory'          WHERE item_category = 'accessories_inventory';

COMMIT;
