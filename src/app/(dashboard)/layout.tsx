import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();
  if (!profile) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 p-4 md:p-6 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
