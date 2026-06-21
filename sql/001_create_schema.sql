-- ============================================
-- Mazaya Furniture Factory - Database Schema
-- PostgreSQL / Supabase
-- Schema: public | Tables prefix: mazaya_
-- ============================================

-- 1. الموردين
CREATE TABLE IF NOT EXISTS public.mazaya_suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  payment_type VARCHAR(50) NOT NULL DEFAULT 'both', -- 'cash', 'transfer', 'both'
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. المعارض/الفروع
CREATE TABLE IF NOT EXISTS public.mazaya_branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. العملاء
CREATE TABLE IF NOT EXISTS public.mazaya_customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id BIGINT REFERENCES public.mazaya_branches(id),
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. الأوردرات
CREATE TABLE IF NOT EXISTS public.mazaya_orders (
  id BIGSERIAL PRIMARY KEY,
  order_name TEXT NOT NULL,
  customer_id BIGINT REFERENCES public.mazaya_customers(id),
  branch_id BIGINT REFERENCES public.mazaya_branches(id),
  order_type VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'maintenance'
  parent_order_id BIGINT REFERENCES public.mazaya_orders(id),
  start_date DATE,
  end_date DATE,
  duration_days INT GENERATED ALWAYS AS (
    CASE WHEN end_date IS NOT NULL AND start_date IS NOT NULL
         THEN end_date - start_date
         ELSE NULL
    END
  ) STORED,
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'delivered'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. مخزون الألواح
CREATE TABLE IF NOT EXISTS public.mazaya_boards_inventory (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  material_type VARCHAR(100),
  code TEXT NOT NULL,
  supplier_id BIGINT REFERENCES public.mazaya_suppliers(id),
  unit_price NUMERIC(10,2) NOT NULL,
  quantity_in INT NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity_in) STORED,
  date_added DATE DEFAULT CURRENT_DATE,
  linked_order_id BIGINT REFERENCES public.mazaya_orders(id),
  quantity_used INT DEFAULT 0,
  quantity_remaining INT GENERATED ALWAYS AS (quantity_in - quantity_used) STORED,
  CHECK (quantity_remaining >= 0),
  used_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (code, supplier_id)
);

-- 6. مخزون الاكسسوارات
CREATE TABLE IF NOT EXISTS public.mazaya_accessories_inventory (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  type VARCHAR(100),
  code TEXT NOT NULL,
  supplier_id BIGINT REFERENCES public.mazaya_suppliers(id),
  unit_price NUMERIC(10,2) NOT NULL,
  quantity_in INT NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity_in) STORED,
  date_added DATE DEFAULT CURRENT_DATE,
  linked_order_id BIGINT REFERENCES public.mazaya_orders(id),
  quantity_used INT DEFAULT 0,
  quantity_remaining INT GENERATED ALWAYS AS (quantity_in - quantity_used) STORED,
  CHECK (quantity_remaining >= 0),
  used_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (code, supplier_id)
);

-- 7. مواد الأوردر المستخدمة
CREATE TABLE IF NOT EXISTS public.mazaya_order_materials (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.mazaya_orders(id) ON DELETE CASCADE,
  board_id BIGINT REFERENCES public.mazaya_boards_inventory(id),
  accessory_id BIGINT REFERENCES public.mazaya_accessories_inventory(id),
  quantity_used INT NOT NULL,
  unit_price_snapshot NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) GENERATED ALWAYS AS (quantity_used * unit_price_snapshot) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (board_id IS NOT NULL OR accessory_id IS NOT NULL)
);

-- 8. تكاليف الأوردر
CREATE TABLE IF NOT EXISTS public.mazaya_order_costs (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.mazaya_orders(id) ON DELETE CASCADE,
  boards_cost NUMERIC(10,2) DEFAULT 0,
  accessories_cost NUMERIC(10,2) DEFAULT 0,
  installation_cost NUMERIC(10,2) DEFAULT 0,
  installation_travel_days INT DEFAULT 0,
  internal_transport_cost NUMERIC(10,2) DEFAULT 0,
  external_transport_cost NUMERIC(10,2) DEFAULT 0,
  factory_commission NUMERIC(10,2) DEFAULT 0,
  order_total NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(boards_cost,0) + COALESCE(accessories_cost,0) +
    COALESCE(installation_cost,0) + COALESCE(internal_transport_cost,0) +
    COALESCE(external_transport_cost,0) + COALESCE(factory_commission,0)
  ) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. المقاولين الخارجيين
CREATE TABLE IF NOT EXISTS public.mazaya_contractors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(100), -- 'aluminium', 'upholstery', 'other'
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. الأعمال الخارجية للأوردر
CREATE TABLE IF NOT EXISTS public.mazaya_order_external_work (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.mazaya_orders(id) ON DELETE CASCADE,
  work_type VARCHAR(100),
  contractor_id BIGINT REFERENCES public.mazaya_contractors(id),
  amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. اليومية المالية
CREATE TABLE IF NOT EXISTS public.mazaya_journal_entries (
  id BIGSERIAL PRIMARY KEY,
  entry_date DATE DEFAULT CURRENT_DATE,
  entry_type VARCHAR(50) NOT NULL, -- 'purchase','income','expense','transfer','overhead'
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(50), -- 'cash', 'transfer'
  supplier_id BIGINT REFERENCES public.mazaya_suppliers(id),
  branch_id BIGINT REFERENCES public.mazaya_branches(id),
  contractor_id BIGINT REFERENCES public.mazaya_contractors(id),
  order_id BIGINT REFERENCES public.mazaya_orders(id),
  is_passthrough BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. النثريات
CREATE TABLE IF NOT EXISTS public.mazaya_overhead_expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. المستخدمون (profiles) — كلمات السر في Supabase Auth
CREATE TABLE IF NOT EXISTS public.mazaya_users (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email_or_phone TEXT NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'branch_user', -- 'admin', 'branch_user'
  branch_id BIGINT REFERENCES public.mazaya_branches(id),
  visible_modules TEXT[] DEFAULT ARRAY['dashboard','orders'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- 14. قوائم الاختيارات القابلة للتوسيع (Material Types, Suppliers types…)
CREATE TABLE IF NOT EXISTS public.mazaya_lookup_lists (
  id BIGSERIAL PRIMARY KEY,
  list_key VARCHAR(100) NOT NULL, -- 'board_material','accessory_type','supplier_payment_type'...
  value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (list_key, value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mazaya_suppliers_name ON public.mazaya_suppliers(name);
CREATE INDEX IF NOT EXISTS idx_mazaya_customers_branch ON public.mazaya_customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_mazaya_orders_customer ON public.mazaya_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_mazaya_orders_branch ON public.mazaya_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_mazaya_orders_status ON public.mazaya_orders(status);
CREATE INDEX IF NOT EXISTS idx_mazaya_boards_supplier ON public.mazaya_boards_inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mazaya_boards_remaining ON public.mazaya_boards_inventory(quantity_remaining);
CREATE INDEX IF NOT EXISTS idx_mazaya_accessories_supplier ON public.mazaya_accessories_inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mazaya_accessories_remaining ON public.mazaya_accessories_inventory(quantity_remaining);
CREATE INDEX IF NOT EXISTS idx_mazaya_journal_date ON public.mazaya_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_mazaya_journal_type ON public.mazaya_journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_mazaya_users_username ON public.mazaya_users(username);
CREATE INDEX IF NOT EXISTS idx_mazaya_users_auth ON public.mazaya_users(auth_id);

-- ============================================
-- Row Level Security (RLS)
-- النظام داخلي لمصنع واحد - كل مستخدم (admin/branch_user) عنده
-- جلسة Supabase Auth وله حق الوصول لكل البيانات.
-- الصلاحيات (مين يشوف إيه) بتتحكم فيها الـ Application عبر
-- mazaya_users.visible_modules (checkboxes في صفحة إدارة المستخدمين).
-- ============================================

ALTER TABLE public.mazaya_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_boards_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_accessories_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_order_external_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_overhead_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazaya_lookup_lists ENABLE ROW LEVEL SECURITY;

-- سياسة موحدة: أي مستخدم مسجل دخوله (authenticated) له حق الوصول الكامل
-- لجميع الجداول. الفلترة على الصفحات المرئية بتتم في الـ UI.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'mazaya_suppliers','mazaya_branches','mazaya_customers','mazaya_orders',
    'mazaya_boards_inventory','mazaya_accessories_inventory',
    'mazaya_order_materials','mazaya_order_costs',
    'mazaya_contractors','mazaya_order_external_work',
    'mazaya_journal_entries','mazaya_overhead_expenses',
    'mazaya_users','mazaya_lookup_lists'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS mazaya_authenticated_all ON public.%I', t);
    EXECUTE format('CREATE POLICY mazaya_authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END$$;

-- الزناد: خصم الكمية من المخزون عند إضافة مواد لأوردر
CREATE OR REPLACE FUNCTION public.mazaya_deduct_inventory() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.board_id IS NOT NULL THEN
    UPDATE public.mazaya_boards_inventory
       SET quantity_used = quantity_used + NEW.quantity_used
     WHERE id = NEW.board_id;
  END IF;
  IF NEW.accessory_id IS NOT NULL THEN
    UPDATE public.mazaya_accessories_inventory
       SET quantity_used = quantity_used + NEW.quantity_used
     WHERE id = NEW.accessory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_inventory ON public.mazaya_order_materials;
CREATE TRIGGER trg_deduct_inventory
  AFTER INSERT ON public.mazaya_order_materials
  FOR EACH ROW EXECUTE FUNCTION public.mazaya_deduct_inventory();

-- الزناد: إرجاع الكمية عند حذف مادة من أوردر
CREATE OR REPLACE FUNCTION public.mazaya_restore_inventory() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.board_id IS NOT NULL THEN
    UPDATE public.mazaya_boards_inventory
       SET quantity_used = quantity_used - OLD.quantity_used
     WHERE id = OLD.board_id;
  END IF;
  IF OLD.accessory_id IS NOT NULL THEN
    UPDATE public.mazaya_accessories_inventory
       SET quantity_used = quantity_used - OLD.quantity_used
     WHERE id = OLD.accessory_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_inventory ON public.mazaya_order_materials;
CREATE TRIGGER trg_restore_inventory
  AFTER DELETE ON public.mazaya_order_materials
  FOR EACH ROW EXECUTE FUNCTION public.mazaya_restore_inventory();

-- الزناد: تسجيل شراء صنف تلقائياً في اليومية (مصروف)
CREATE OR REPLACE FUNCTION public.mazaya_log_purchase() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_in > 0 THEN
    INSERT INTO public.mazaya_journal_entries
      (entry_date, entry_type, description, amount, payment_method, supplier_id, notes)
    VALUES
      (NEW.date_added, 'purchase',
       CONCAT('شراء: ', NEW.item_name, ' (', NEW.quantity_in, ' × ', NEW.unit_price, ')'),
       NEW.quantity_in * NEW.unit_price,
       'cash', NEW.supplier_id,
       CONCAT('كود الصنف: ', NEW.code));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_board_purchase ON public.mazaya_boards_inventory;
CREATE TRIGGER trg_log_board_purchase
  AFTER INSERT ON public.mazaya_boards_inventory
  FOR EACH ROW EXECUTE FUNCTION public.mazaya_log_purchase();

DROP TRIGGER IF EXISTS trg_log_accessory_purchase ON public.mazaya_accessories_inventory;
CREATE TRIGGER trg_log_accessory_purchase
  AFTER INSERT ON public.mazaya_accessories_inventory
  FOR EACH ROW EXECUTE FUNCTION public.mazaya_log_purchase();
