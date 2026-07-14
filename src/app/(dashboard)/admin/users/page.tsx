import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import prisma from "@/lib/db/prisma";

export default async function AdminUsersPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const users = await prisma.users.findMany({
    where: { is_active: true },
    orderBy: { full_name: "asc" },
    select: { id: true, username: true, full_name: true, role: true, phone: true, is_active: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">👤 المستخدمين</h1>
          <p className="text-sm text-gray-500">قائمة المستخدمين النشطين داخل النظام</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">الاسم</th>
              <th className="p-3 text-right">اسم المستخدم</th>
              <th className="p-3 text-right">الدور</th>
              <th className="p-3 text-right">الهاتف</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-semibold">{user.full_name}</td>
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
