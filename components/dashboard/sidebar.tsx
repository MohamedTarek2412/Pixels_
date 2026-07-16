"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, Layers, Wallet, CalendarCheck,
  GraduationCap, Receipt, Megaphone, Building2, Boxes, FileBarChart,
  Bell, ShieldCheck, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/students", label: "الطلاب", icon: Users },
  { href: "/courses", label: "الكورسات", icon: BookOpen },
  { href: "/groups", label: "الجروبات", icon: Layers },
  { href: "/payments", label: "المدفوعات", icon: Wallet },
  { href: "/attendance", label: "الحضور", icon: CalendarCheck },
  { href: "/instructors", label: "المدرسين", icon: GraduationCap },
  { href: "/payroll", label: "المرتبات", icon: Receipt },
  { href: "/expenses", label: "المصروفات", icon: Receipt },
  { href: "/crm", label: "CRM", icon: Megaphone },
  { href: "/branches", label: "الفروع", icon: Building2 },
  { href: "/inventory", label: "المخزون", icon: Boxes },
  { href: "/reports", label: "التقارير", icon: FileBarChart },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/audit-logs", label: "سجل التعديلات", icon: ShieldCheck },
];

export function Sidebar({ isMobile }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`flex flex-col border-l border-gray-200 bg-white w-64 ${isMobile ? 'h-full' : 'h-screen'}`}>
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-bold text-primary">Pixels Juniors</h2>
        <p className="text-xs text-muted">نظام إدارة المركز</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary-light text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
