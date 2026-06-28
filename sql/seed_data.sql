-- ============================================
-- Mazaya Furniture Factory — Seed Data
-- Run AFTER create_schema.sql
-- Default admin password: admin123 (change after first login)
-- ============================================

SET search_path TO mazaya;

-- Branches (المعارض — 4 فروع)
INSERT INTO mazaya.branches (name, location, phone, notes) VALUES
  ('معرض دمياط الرئيسي', 'دمياط - الميناء', '0123123123', 'المقر الرئيسي'),
  ('معرض القاهرة', 'القاهرة - النيل', '0111111111', 'فرع العاصمة'),
  ('معرض الإسكندرية', 'الإسكندرية - أمام البحر', '0222222222', 'فرع ساحلي'),
  ('معرض الجيزة', 'الجيزة - الهرم', '0333333333', 'فرع الجيزة')
ON CONFLICT (name) DO NOTHING;

-- Suppliers (الموردين — 7 شركات)
INSERT INTO mazaya.suppliers (name, payment_type, phone, notes) VALUES
  ('شركة النيل للأثاث', 'transfer', '0123456789', 'مورد ألواح رئيسي'),
  ('شركة الدلتا الخشبية', 'cash', '0987654321', 'متخصصة في MDF'),
  ('شركة البحر الأبيض', 'both', '0111122223', 'موردة اكسسوارات'),
  ('مصنع الزهراء', 'transfer', '0222233334', 'ألوميتال والتنجيد'),
  ('شركة الشرقية', 'both', '0333344445', 'خامات متعددة'),
  ('موردون الفردوس', 'cash', '0444455556', 'متخصصون في الكاوتش'),
  ('شركة البناء والتشييد', 'transfer', '0555566667', 'موردة عامة')
ON CONFLICT DO NOTHING;

-- Admin user (password: admin123 — bcrypt hash cost=10)
INSERT INTO mazaya.users (username, full_name, password_hash, role, is_active) VALUES
  ('admin', 'محمد مروك — مدير المصنع', '$2a$10$OqRNT2xxgiYk0WDSfYZcmu2Edlx5Y6F0/KNp6eeCjWRIbfkgvwdf.', 'admin', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Contractors (المقاولين الخارجيين)
INSERT INTO mazaya.contractors (name, specialty, phone, notes) VALUES
  ('ورشة ألوميتال الإسلامي', 'ألوميتال', '0100000010', 'متخصصة في الأبواب'),
  ('ورشة التنجيد الأسود', 'تنجيد', '0100000011', 'تنجيد عالي الجودة'),
  ('ورشة النقل السريع', 'نقل', '0100000012', 'نقل وتسليم')
ON CONFLICT DO NOTHING;

-- Material Types (أنواع خامات الألواح)
INSERT INTO mazaya.material_types (name, category, sort_order) VALUES
  ('MDF (عادي/ساده)', 'board', 1),
  ('MDF أخضر', 'board', 2),
  ('MDF مطلي / مكثف', 'board', 3),
  ('كونتر ساده', 'board', 4),
  ('كونتر مونيدج', 'board', 5),
  ('بيروديوم', 'board', 6),
  ('سندوتش', 'board', 7)
ON CONFLICT (name) DO NOTHING;

-- Accessory Types (أنواع الاكسسوارات)
INSERT INTO mazaya.material_types (name, category, sort_order) VALUES
  ('مفصلات - بلوم (Blum)', 'accessory', 1),
  ('مفصلات - عادي', 'accessory', 2),
  ('سكك دُرج', 'accessory', 3),
  ('مجاري دُرج', 'accessory', 4),
  ('جوانب / قواعد', 'accessory', 5),
  ('كاوتش', 'accessory', 6),
  ('أخرى', 'accessory', 99)
ON CONFLICT (name) DO NOTHING;
