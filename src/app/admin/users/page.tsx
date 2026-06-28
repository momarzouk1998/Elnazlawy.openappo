"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ALL_MODULES } from "@/lib/auth";

interface UserRow {
  id: number; username: string; full_name: string;
  role: string;
  visible_modules: string[]; is_active: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const { user: profile } = useUserStore();
  const { data: usersData, loading, refetch } = useApi<{ users: any[] }>('/api/admin/create-user?limit=500');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  useEffect(() => {
    if (usersData?.users) setUsers(usersData.users as UserRow[]);
  }, [usersData]);

  async function toggleModule(u: UserRow, modKey: string) {
    const newMods = u.visible_modules.includes(modKey)
      ? u.visible_modules.filter(m => m !== modKey)
      : [...u.visible_modules, modKey];
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_modules: newMods }),
    });
    if (res.ok) setUsers(s => s.map(x => x.id === u.id ? { ...x, visible_modules: newMods } : x));
  }

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (res.ok) setUsers(s => s.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`تعطيل "${u.username}"؟ لا يمكن التراجع.`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setUsers(s => s.map(x => x.id === u.id ? { ...x, is_active: false } : x));
  }

  if (!profile) return null;
  const totalActive = users.filter(u => u.is_active).length;
  const branchCount = users.filter(u => u.role === "branch_user" && u.is_active).length;
  const adminCount = users.filter(u => u.role === "admin" && u.is_active).length;
  const disabledCount = users.filter(u => !u.is_active).length;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="إدارة الموظفين"
        subtitle={`${users.length} موظف`}
        helpTitle="إدارة المستخدمين"
        helpDescription="من هنا تقدر تضيف موظفين جداد أو تعدل بيانات الموجودين، وتتحكم في الصفحات اللي يشوفها كل موظف من الـ Checkboxes، وتعطل حساب أو تريست الباسورد. كل موظف بيشوف بس الصفحات اللي مفعّلها."
        backHref="/dashboard"
        actions={<Button onClick={() => setShowAdd(true)}>+ إضافة موظف جديد</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي الموظفين" value={users.length} icon="👥" color="bg-blue-500" />
        <StatCard label="الموظفون" value={branchCount} icon="👤" color="bg-green-500" />
        <StatCard label="المدراء" value={adminCount} icon="👑" color="bg-orange-500" />
        <StatCard label="معطلة" value={disabledCount} icon="🔒" color="bg-red-500" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-right font-semibold text-xs uppercase sticky right-0 bg-gray-50 z-10">الموظف</th>
              {ALL_MODULES.map(m => (
                <th key={m.key} className="px-2 py-3 text-center font-semibold text-xs uppercase" title={m.label}>
                  <div className="text-lg">{m.icon}</div>
                  <div className="hidden lg:block text-[10px]">{m.label}</div>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-xs uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={ALL_MODULES.length + 2} className="text-center py-8">جاري التحميل...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={!u.is_active ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}>
                <td className="px-3 py-3 sticky right-0 bg-white">
                  <div className="font-semibold text-brand-black">{u.full_name}</div>
                  <div className="text-xs text-gray-500">@{u.username}</div>
                  <div className="mt-1">
                    <span className={`badge ${u.role === "admin" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
                      {u.role === "admin" ? "مدير المصنع" : "موظف"}
                    </span>
                    {!u.is_active && <span className="badge bg-red-100 text-red-800 mr-1">معطل</span>}
                  </div>
                </td>
                {ALL_MODULES.map(m => (
                  <td key={m.key} className="px-2 py-3 text-center">
                    <button
                      onClick={() => toggleModule(u, m.key)}
                      className={`w-7 h-7 rounded-md transition ${u.visible_modules.includes(m.key) ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400 hover:bg-gray-300"}`}
                      title={u.visible_modules.includes(m.key) ? `إخفاء: ${m.label}` : `إظهار: ${m.label}`}
                    >
                      {u.visible_modules.includes(m.key) ? "✓" : ""}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setEditing(u)} className="p-1.5 hover:bg-blue-100 rounded" title="تعديل">✏️</button>
                    <button onClick={() => toggleActive(u)} className="p-1.5 hover:bg-yellow-100 rounded" title={u.is_active ? "تعطيل" : "تفعيل"}>{u.is_active ? "🔒" : "🔓"}</button>
                    {u.id !== profile.id && (
                      <button onClick={() => deleteUser(u)} className="p-1.5 hover:bg-red-100 rounded" title="حذف">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); refetch(); }} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); refetch(); }} />}
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={`${color} text-white rounded-xl p-4 shadow-elevated`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs opacity-90">{label}</div>
    </div>
  );
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    username: "", full_name: "", password: "",
    role: "branch_user",
    visible_modules: ["dashboard", "orders"] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMod(k: string) {
    setForm(f => ({
      ...f,
      visible_modules: f.visible_modules.includes(k) ? f.visible_modules.filter(x => x !== k) : [...f.visible_modules, k],
    }));
  }

  async function submit() {
    setError(null);
    if (!form.username || !form.full_name || !form.password) { setError("املأ الحقول المطلوبة"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const j = await res.json();
    if (!res.ok) { setError(j.error); return; }
    onSuccess();
  }

  return (
    <ModalShell title="إضافة موظف جديد" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="الاسم بالكامل *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        <Input label="اسم المستخدم *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} hint="بيستخدم في تسجيل الدخول" />
        <Input label="كلمة السر *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <Select label="الدور" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={[{ value: "admin", label: "مدير المصنع (يشوف كل حاجة)" }, { value: "branch_user", label: "موظف (حسب الـ Checkboxes)" }]} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">الصفحات المرئية</label>
            <div className="flex gap-1">
              <button onClick={() => setForm(f => ({ ...f, visible_modules: ALL_MODULES.map(m => m.key) }))} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">تحديد الكل</button>
              <button onClick={() => setForm(f => ({ ...f, visible_modules: ["dashboard"] }))} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">إلغاء الكل</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_MODULES.map(m => (
              <label key={m.key} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${form.visible_modules.includes(m.key) ? "bg-green-50 border-green-300" : ""}`}>
                <input type="checkbox" checked={form.visible_modules.includes(m.key)} onChange={() => toggleMod(m.key)} className="accent-brand-orange" />
                <span className="text-sm">{m.icon} {m.label}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{error}</div>}
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit} loading={saving}>حفظ</Button>
      </div>
    </ModalShell>
  );
}

function EditUserModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name, username: user.username,
    role: user.role,
    visible_modules: user.visible_modules, is_active: user.is_active,
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null); setSaving(true);
    const payload: any = { full_name: form.full_name, role: form.role, is_active: form.is_active };
    if (form.password) payload.password = form.password;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    const j = await res.json();
    if (!res.ok) { setError(j.error); return; }
    onSuccess();
  }

  return (
    <ModalShell title={`تعديل: ${user.username}`} onClose={onClose}>
      <div className="space-y-3">
        <Input label="الاسم بالكامل" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        <Input label="اسم المستخدم" value={form.username} disabled />
        <Input label="كلمة سر جديدة (اتركها فارغة لو مش عايز تغير)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <Select label="الدور" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={[{ value: "admin", label: "مدير" }, { value: "branch_user", label: "موظف" }]} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-brand-orange" /><span className="text-sm">مفعّل</span></label>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{error}</div>}
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit} loading={saving}>حفظ</Button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
