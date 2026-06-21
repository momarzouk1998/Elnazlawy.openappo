-- ============================================
-- Seed Data — بيانات تجريبية
-- ============================================

-- الموردين (7 شركات)
INSERT INTO public.mazaya_suppliers (name, payment_type, phone, notes) VALUES
('شركة النيل للأثاث', 'transfer', '0123456789', 'مورد ألواح رئيسي'),
('شركة الدلتا الخشبية', 'cash', '0987654321', 'متخصصة في MDF'),
('شركة البحر الأبيض', 'both', '0111122223', 'موردة اكسسوارات'),
('مصنع الزهراء', 'transfer', '0222233334', 'ألوميتال والتنجيد'),
('شركة الشرقية', 'both', '0333344445', 'خامات متعددة'),
('موردون الفردوس', 'cash', '0444455556', 'متخصصون في الكاوتش'),
('شركة البناء والتشييد', 'transfer', '0555566667', 'موردة عامة')
ON CONFLICT DO NOTHING;

-- المعارض (4 فروع)
INSERT INTO public.mazaya_branches (name, location, phone, notes) VALUES
('معرض دمياط الرئيسي', 'دمياط - الميناء', '0123123123', 'المقر الرئيسي'),
('معرض القاهرة', 'القاهرة - النيل', '0111111111', 'فرع العاصمة'),
('معرض الإسكندرية', 'الإسكندرية - أمام البحر', '0222222222', 'فرع ساحلي'),
('معرض الجيزة', 'الجيزة - الهرم', '0333333333', 'فرع الجيزة')
ON CONFLICT DO NOTHING;

-- العملاء
INSERT INTO public.mazaya_customers (name, branch_id, phone, address, notes) VALUES
('محمد علي', 1, '0100000001', 'دمياط - الميناء', 'عميل VIP'),
('أحمد عادل', 2, '0100000002', 'القاهرة - المعادي', 'عميل جديد'),
('فاطمة إبراهيم', 3, '0100000003', 'الإسكندرية - محطة', 'عميل قديم'),
('سارة حسن', 4, '0100000004', 'الجيزة - الدقي', 'صاحبة كافيه'),
('خالد سعيد', 1, '0100000005', 'دمياط - رابعه', 'طلب صيانة')
ON CONFLICT DO NOTHING;

-- عينات مخزون الألواح
INSERT INTO public.mazaya_boards_inventory (item_name, material_type, code, supplier_id, unit_price, quantity_in, date_added) VALUES
('لوح ١٨مل بيروديوم ٧٦٢٩×٦٠٠٤', 'بيروديوم', 'SUP001-001', 1, 150.00, 100, CURRENT_DATE),
('لوح ٢٥مل MDF أخضر', 'MDF أخضر', 'SUP002-045', 2, 200.00, 50, CURRENT_DATE),
('لوح كونتر ساده ١٦مل', 'كونتر ساده', 'SUP003-078', 3, 120.00, 75, CURRENT_DATE),
('لوح MDF مطلي أبيض', 'MDF مطلي / مكثف', 'SUP005-022', 5, 180.00, 60, CURRENT_DATE),
('لوح سندوتش ١٢مل', 'سندوتش', 'SUP007-014', 7, 95.00, 120, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- عينات مخزون الاكسسوارات
INSERT INTO public.mazaya_accessories_inventory (item_name, type, code, supplier_id, unit_price, quantity_in, date_added) VALUES
('مفصلات بلوم ٩٠ درجة', 'مفصلات - بلوم', 'ACC001-021', 3, 45.00, 200, CURRENT_DATE),
('سكك دُرج أمريكي ٨٠٠مل', 'سكك دُرج', 'ACC002-056', 3, 30.00, 150, CURRENT_DATE),
('كاوتش أسود 1 متر', 'كاوتش', 'ACC003-012', 6, 5.00, 500, CURRENT_DATE),
('مجاري دُرج تليسكوب', 'مجاري دُرج', 'ACC004-005', 3, 85.00, 80, CURRENT_DATE),
('جوانب جانبية بلاستيك', 'جوانب / قواعد', 'ACC005-018', 5, 12.00, 300, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- المقاولين
INSERT INTO public.mazaya_contractors (name, type, phone, notes) VALUES
('ورشة ألوميتال الإسلامي', 'aluminium', '0100000010', 'متخصصة في الأبواب'),
('ورشة التنجيد الأسود', 'upholstery', '0100000011', 'تنجيد عالي الجودة'),
('ورشة النقل السريع', 'other', '0100000012', 'نقل وتسليم')
ON CONFLICT DO NOTHING;

-- المستخدمون (موظفو المصنع)
-- - admin: محمد (صاحب المصنع) - بيشوف كل حاجة
-- - branch_user: موظفون بصلاحيات جزئية (مثلاً المحاسب، أمين المخزن، مدير الإنتاج)
--   بيشوفوا كل البيانات بس visible_modules بيحدد أي صفحات تظهر لهم في الـ Sidebar.
--   كلمة السر في Supabase Auth. هذا الجدول للـ profile فقط.
INSERT INTO public.mazaya_users (auth_id, username, email_or_phone, role, branch_id, visible_modules, is_active, notes) VALUES
(NULL, 'admin', 'abomrzk@gmail.com', 'admin', NULL,
   ARRAY['dashboard','suppliers','boards_inventory','accessories_inventory','branches','customers','orders','journal','overhead','contractors','reports','users','material_types'],
   TRUE, 'مدير المصنع (محمد)'),

-- أمثلة لموظفين بصلاحيات جزئية
(NULL, 'mohandess', 'production@mazaya.com', 'branch_user', NULL,
   ARRAY['dashboard','orders','boards_inventory','accessories_inventory'],
   TRUE, 'مدير الإنتاج - بيشوف المخزون والأوردرات'),

(NULL, 'mohaseb', 'accountant@mazaya.com', 'branch_user', NULL,
   ARRAY['dashboard','journal','overhead','reports'],
   TRUE, 'المحاسب - بيشوف المالية والتقارير'),

(NULL, 'amen_makhzon', 'stock@mazaya.com', 'branch_user', NULL,
   ARRAY['dashboard','suppliers','boards_inventory','accessories_inventory','material_types'],
   TRUE, 'أمين المخزن - بيشوف المخزون والموردين'),

(NULL, 'moteaba3', 'sales@mazaya.com', 'branch_user', NULL,
   ARRAY['dashboard','orders','customers','branches'],
   TRUE, 'موظف المبيعات - بيشوف العملاء والأوردرات والمعارض')
ON CONFLICT (username) DO NOTHING;

-- قوائم الاختيارات
INSERT INTO public.mazaya_lookup_lists (list_key, value, sort_order) VALUES
('board_material', 'MDF (عادي/ساده)', 1),
('board_material', 'MDF أخضر', 2),
('board_material', 'MDF مطلي / مكثف', 3),
('board_material', 'كونتر ساده', 4),
('board_material', 'كونتر مونيدج', 5),
('board_material', 'بيروديوم', 6),
('board_material', 'سندوتش', 7),
('accessory_type', 'مفصلات - بلوم (Blum)', 1),
('accessory_type', 'مفصلات - عادي', 2),
('accessory_type', 'سكك دُرج', 3),
('accessory_type', 'مجاري دُرج', 4),
('accessory_type', 'جوانب / قواعد', 5),
('accessory_type', 'كاوتش', 6),
('accessory_type', 'أخرى', 99),
('payment_type', 'نقدي', 1),
('payment_type', 'تحويل', 2),
('payment_type', 'كلاهما', 3),
('order_type', 'تصنيع جديد', 1),
('order_type', 'صيانة', 2),
('order_status', 'مفتوح', 1),
('order_status', 'قيد التنفيذ', 2),
('order_status', 'مكتمل', 3),
('order_status', 'تم التسليم', 4),
('journal_entry_type', 'مشتريات', 1),
('journal_entry_type', 'دفعة واردة من معرض', 2),
('journal_entry_type', 'دفعة صادرة لمورد', 3),
('journal_entry_type', 'تحويل تمريري', 4),
('journal_entry_type', 'نثريات', 5),
('payment_method', 'نقدي', 1),
('payment_method', 'تحويل', 2),
('external_work_type', 'ألوميتال', 1),
('external_work_type', 'تنجيد', 2),
('external_work_type', 'أخرى', 3)
ON CONFLICT (list_key, value) DO NOTHING;
