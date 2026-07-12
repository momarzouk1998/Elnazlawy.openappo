"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALL_MODULES, canSeeModule, type CurrentProfile, ROLE_LABELS } from "@/lib/auth";
import Image from "next/image";

export default function Sidebar({ profile }: { profile: CurrentProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const visible = ALL_MODULES.filter(m => canSeeModule(profile, m.key));

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-header-gradient text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white p-0.5 border-2 border-nazlawy-500">
            <Image src="/elnazlawy-logo.png" alt="النزلاوي" width={32} height={32} className="rounded" />
          </div>
          <div className="font-bold text-sm">معرض النزلاوي</div>
        </div>
        <button onClick={() => setOpen(!open)} className="text-2xl">{open ? '✕' : '☰'}</button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-72 bg-header-gradient text-white shadow-2xl flex flex-col"
          >
            <SidebarContent visible={visible} pathname={pathname} onNavigate={() => setOpen(false)} />
            <button onClick={logout} className="m-4 py-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30">تسجيل خروج</button>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-header-gradient text-white min-h-screen shadow-xl">
        <SidebarContent visible={visible} pathname={pathname} onNavigate={() => {}} />
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-1">المستخدم:</div>
          <div className="font-semibold text-sm">{profile.full_name}</div>
          <div className="text-xs text-nazlawy-300 mb-3">{ROLE_LABELS[profile.role]}</div>
          <button onClick={logout} className="w-full py-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm">
            🚪 تسجيل خروج
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarContent({ visible, pathname, onNavigate }: { visible: any[]; pathname: string; onNavigate: () => void }) {
  return (
    <>
      <div className="p-4 border-b-4 border-nazlawy-500 flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-white p-0.5 border-2 border-nazlawy-500 shrink-0">
          <Image src="/elnazlawy-logo.png" alt="النزلاوي" width={44} height={44} className="rounded" />
        </div>
        <div>
          <div className="font-extrabold text-base leading-tight">معرض النزلاوي</div>
          <div className="text-[10px] text-nazlawy-300 font-medium">ElNazlawy</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {visible.map((m) => {
          const active = pathname === m.path || pathname.startsWith(m.path + '/');
          return (
            <Link
              key={m.key}
              href={m.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-nazlawy-500 text-white shadow-md font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
