"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  ClipboardList,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { missingTables, onMissingTables } from "@/lib/db";
import { useAuth } from "@/components/AuthProvider";
import { LogoWordmark } from "@/components/Logo";
import { Loading } from "@/components/ui";
import { shortDate, todayISO } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  {
    label: "Admissions",
    icon: GraduationCap,
    children: [
      { href: "/admission-form", label: "Admission Form", icon: ClipboardList },
      { href: "/admission", label: "Admission Challan", icon: GraduationCap },
    ],
  },
  {
    label: "Fee Management",
    icon: Wallet,
    children: [
      { href: "/challans", label: "Generate Challan", icon: FileText },
      { href: "/payments", label: "Payment History", icon: Receipt },
      { href: "/fee-structure", label: "Fee Structure", icon: CreditCard },
    ],
  },
  {
    label: "Staff & Payroll",
    icon: UserCog,
    children: [
      { href: "/employees", label: "Employees", icon: UserCog },
      { href: "/payroll", label: "Payroll", icon: Banknote },
    ],
  },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Shell({ children }) {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [missing, setMissing] = useState([]);

  // Raised once if the database is behind the app, instead of a toast per page.
  useEffect(() => {
    setMissing(missingTables());
    return onMissingTables(setMissing);
  }, []);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) return <Loading label="Checking your session…" />;
  if (!session) return null;

  return (
    <div className="min-h-screen lg:flex">
      {/* ------------------------------------------------------- sidebar -- */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-navy-900 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <LogoWordmark />
          <button className="text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} pathname={pathname} />
            ) : (
              <NavLink key={item.href} item={item} active={pathname === item.href} />
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
          <p className="mt-3 px-3 text-center font-serif text-sm italic text-brand-200">
            Together for a Brighter Future
          </p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* --------------------------------------------------------- main -- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden items-center gap-2 text-sm font-medium text-slate-500 sm:flex">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              {shortDate(todayISO())}
            </span>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-3 pr-2 text-sm font-semibold text-navy-900">
              <span className="max-w-[180px] truncate">{session.user?.email || "Admin"}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        {missing.length > 0 && (
          <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
            <div className="flex items-start gap-2.5 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <b>Database is out of date.</b> The app is running without{" "}
                <span className="font-mono text-xs">{missing.join(", ")}</span>, so extra fee heads and itemised
                challans are unavailable. Run <span className="font-mono text-xs">supabase/schema.sql</span> in the
                Supabase SQL editor to catch up — everything else keeps working in the meantime.
              </p>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, active, nested = false }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-brand-600 text-white shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"
      } ${nested ? "pl-10 text-[13px]" : ""}`}
    >
      {!nested && Icon && <Icon className="h-5 w-5 shrink-0" />}
      {nested && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-white" : "bg-slate-500"}`} />}
      {item.label}
    </Link>
  );
}

function NavGroup({ item, pathname }) {
  const hasActive = item.children.some((c) => c.href === pathname);
  const [open, setOpen] = useState(hasActive);
  const Icon = item.icon;

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          hasActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {item.children.map((c) => (
            <NavLink key={c.href} item={c} active={pathname === c.href} nested />
          ))}
        </div>
      )}
    </div>
  );
}
