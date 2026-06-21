// Helpers للـ profile الحالي (role, visible modules, branch)
// ملاحظة: النظام داخلي لمصنع واحد. كل مستخدم عنده جلسة Supabase Auth
// وله وصول لكل البيانات. الفلترة على الصفحات المرئية بتتم عبر
// mazaya_users.visible_modules (يتم التحكم فيها من صفحة إدارة المستخدمين).

import { createClient } from "@/lib/supabase/server";

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

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("mazaya_users")
    .select("*")
    .eq("auth_id", user.id)
    .single();
  return data as CurrentProfile | null;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return profile;
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
 * يتحقق إن الـ profile عنده صلاحية لموديل معيّن.
 * الـ admin دائماً true. الموظفين بيتحققوا من visible_modules.
 */
export function canSeeModule(profile: CurrentProfile | null, moduleKey: string): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.visible_modules.includes(moduleKey);
}
