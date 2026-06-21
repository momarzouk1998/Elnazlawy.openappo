// Types + Constants + Client-safe helpers (NO server imports here)
// السيرفر-only functions (getCurrentProfile/requireAdmin) في lib/auth-server.ts

export interface CurrentProfile {
  id: number;
  auth_id: string;
  username: string;
  email_or_phone: string;
  role: "admin" | "branch_user";
  branch_id: number | null;
  visible_modules: string[];
  is_active: boolean;
}

export const ALL_MODULES = [
  { key: "dashboard", label: "لوحة التحكم", icon: "📊", path: "/dashboard" },
  { key: "suppliers", label: "الموردين", icon: "🏭", path: "/suppliers" },
  { key: "boards_inventory", label: "مخزون الألواح", icon: "📋", path: "/boards" },
  { key: "accessories_inventory", label: "مخزون الاكسسوارات", icon: "🔩", path: "/accessories" },
  { key: "branches", label: "المعارض", icon: "🏪", path: "/branches" },
  { key: "customers", label: "العملاء", icon: "👥", path: "/customers" },
  { key: "orders", label: "الأوردرات", icon: "📦", path: "/orders" },
  { key: "journal", label: "اليومية", icon: "💰", path: "/journal" },
  { key: "overhead", label: "النثريات", icon: "📄", path: "/overhead" },
  { key: "contractors", label: "المقاولين", icon: "🔨", path: "/contractors" },
  { key: "reports", label: "التقارير", icon: "📈", path: "/reports" },
  { key: "users", label: "المستخدمين", icon: "⚙️", path: "/admin/users" },
  { key: "material_types", label: "قوائم الاختيارات", icon: "🏷️", path: "/admin/material-types" },
] as const;

export const MODULE_KEYS = ALL_MODULES.map(m => m.key);

/**
 * يتحقق إن الـ profile عنده صلاحية لموديول معيّن.
 * الـ admin دائماً true. الموظفين بيتحققوا من visible_modules.
 */
export function canSeeModule(profile: CurrentProfile | null, moduleKey: string): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.visible_modules.includes(moduleKey);
}
