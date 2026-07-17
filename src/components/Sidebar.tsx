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

  // أغلق الـ drawer عند تغيير الصفحة
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // قفل/فتح scroll الـ body عند فتح الـ drawer
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // إغلاق بـ ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const visible = ALL_MODULES.filter(m => canSeeModule(profile, m.key));

  return (
    <>
      {/* ====== Mobile top bar (يظهر على الشاشات الصغيرة فقط) ====== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-header-gradient text-white px-3 py-2.5 flex items-center justify-between shadow-lg safe-area-top">
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-2xl shrink-0 order-1"
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {open ? '✕' : '☰'}
        </button>
        <div className="flex items-center gap-2 min-w-0 order-2">
          <div className="w-9 h-9 rounded-lg bg-white p-0.5 border-2 border-nazlawy-500 shrink-0">
            <Image src="/elnazlawy-logo.png" alt="النزلاوي" width={32} height={32} className="rounded" />
          </div>
          <div className="font-bold text-sm truncate">معرض النزلاوي</div>
        </div>
      </header>

      {/* ====== Mobile drawer (overlay) ====== */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-[280px] max-w-[85vw] bg-header-gradient text-white shadow-2xl flex flex-col animate-slide-in"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white p-0.5 border-2 border-nazlawy-500 shrink-0">
                  <Image src="/elnazlawy-logo.png" alt="النزلاوي" width={36} height={36} className="rounded" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm leading-tight truncate">معرض النزلاوي</div>
                  <div className="text-[10px] text-nazlawy-300 font-medium">ElNazlawy</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-xl"
                aria-label="إغلاق"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent visible={visible} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="p-3 border-t border-white/10">
              <div className="text-xs text-white/60 mb-0.5">المستخدم:</div>
              <div className="font-semibold text-sm truncate">{profile.full_name}</div>
              <div className="text-xs text-nazlawy-300 mb-3">{ROLE_LABELS[profile.role]}</div>
              <button onClick={logout} className="w-full py-2.5 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm font-medium">
                🚪 تسجيل خروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ====== Desktop sidebar (يظهر على الشاشات الكبيرة فقط) ====== */}
      <aside className="hidden md:flex flex-col w-64 bg-header-gradient text-white h-screen sticky top-0 shadow-2xl shrink-0">
        <SidebarContent visible={visible} pathname={pathname} onNavigate={() => {}} />
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-1">المستخدم:</div>
          <div className="font-semibold text-sm truncate">{profile.full_name}</div>
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
  const activeModule = visible.reduce<any | null>((best, module) => {
    if (!module.path) return best;
    if (pathname === module.path) return module;
    if (pathname.startsWith(`${module.path}/`)) {
      if (!best || module.path.length > best.path.length) return module;
    }
    return best;
  }, null);

  return (
    <>
      <div className="p-4 border-b-4 border-nazlawy-500 flex items-center gap-3 hidden md:flex">
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
          const active = activeModule?.key === m.key;
          return (
            <Link
              key={m.key}
              href={m.path}
              onClick={onNavigate}
              prefetch={true}
              className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-nazlawy-500 text-white shadow-md font-bold'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white active:bg-white/5'
              }`}
            >
              <span className="text-lg shrink-0">{m.icon}</span>
              <span className="truncate">{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
