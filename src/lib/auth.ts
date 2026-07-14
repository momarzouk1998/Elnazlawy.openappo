// ========================================
// ELNAZLAWY — Auth types & module registry
// ========================================

export type UserRole = 'admin' | 'manager' | 'accountant' | 'rep';

export interface CurrentProfile {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  can_see_cost: boolean;
  is_active: boolean;
}

export interface AllModule {
  key: string;
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

export const ALL_MODULES: AllModule[] = [
  // 🟢 للمدير (Admin / Manager)
  { key: 'dashboard',    label: 'الرئيسية',                icon: '📊', path: '/dashboard' },
  { key: 'pos',          label: 'إنشاء فاتورة مبيعات',      icon: '🛒', path: '/sales/new' },
  { key: 'sales',        label: 'فواتير المبيعات',         icon: '🛒', path: '/sales' },
  { key: 'purchases',    label: 'فواتير المشتريات',        icon: '📥', path: '/purchases' },
  { key: 'inventory',    label: 'بضاعة المخازن',           icon: '📦', path: '/inventory' },
  { key: 'transfers',    label: 'تحويلات المخازن',         icon: '🚛', path: '/inventory/transfers' },
  { key: 'products',     label: 'المنتجات',                 icon: '🏷️', path: '/products' },
  { key: 'customers',    label: 'العملاء',                 icon: '👥', path: '/customers' },
  { key: 'suppliers',    label: 'الموردين',                icon: '🏭', path: '/suppliers' },
  { key: 'treasury',     label: 'الخزائن',                 icon: '🏦', path: '/treasury' },
  { key: 'payments_in',  label: 'تحصيلات العملاء',         icon: '💰', path: '/treasury/customer-payments' },
  { key: 'payments_out', label: 'سداد الموردين',           icon: '💸', path: '/treasury/supplier-payments' },
  { key: 'expenses',     label: 'المصروفات',               icon: '📉', path: '/expenses' },
  { key: 'checks',       label: 'الشيكات',                 icon: '🧾', path: '/checks' },
  // 🔵 للمحاسب
  { key: 'reports',      label: 'التقارير',                icon: '📈', path: '/reports' },
  { key: 'statements',   label: 'كشوف الحسابات',           icon: '📋', path: '/reports/statements' },
  // 🟠 للمندوب
  { key: 'route',        label: 'خط السير',                icon: '🗺️', path: '/route' },
  { key: 'my_inventory', label: 'بضاعة السيارة',           icon: '🚐', path: '/my-inventory' },
  { key: 'my_sales',     label: 'فواتيري اليومية',         icon: '🛒', path: '/my-sales' },
  { key: 'collections',  label: 'دفتر التحصيلات',          icon: '💵', path: '/collections' },
  // 🟣 Admin only
  { key: 'users',        label: 'المستخدمين',              icon: '👤', path: '/admin/users',           adminOnly: true },
  { key: 'stores',       label: 'المخازن والفروع',         icon: '🏢', path: '/admin/stores',          adminOnly: true },
  { key: 'routes',       label: 'جدولة خطوط السير',         icon: '🗓️', path: '/admin/routes',          adminOnly: true },
];

export const MODULE_KEYS = ALL_MODULES.map((m) => m.key);

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير عام',
  manager: 'مدير',
  accountant: 'محاسب',
  rep: 'مندوب',
};

export function canSeeModule(profile: CurrentProfile | null, moduleKey: string): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const mod = ALL_MODULES.find((m) => m.key === moduleKey);
  if (mod && mod.adminOnly) return false;

  // Reps see only their own modules
  if (profile.role === 'rep') {
    return ['route', 'my_inventory', 'my_sales', 'collections', 'pos', 'products', 'customers'].includes(moduleKey);
  }
  // Managers + Accountants see everything except admin
  return true;
}

export function canSeeCost(profile: CurrentProfile | null): boolean {
  if (!profile) return false;
  return profile.can_see_cost;
}
