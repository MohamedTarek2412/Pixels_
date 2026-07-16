"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, Users, UserPlus,
  CalendarClock, GraduationCap, AlertCircle, Percent,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

type Stats = {
  revenueToday: number;
  revenueThisMonth: number;
  expenses: number;
  profit: number;
  activeStudents: number;
  newStudents: number;
  upcomingSessionsToday: number;
  instructorsToday: number;
  pendingPayments: number;
  debts: number;
  attendancePercentage: number;
};

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("فشل تحميل الإحصائيات");
  return res.json();
}

function currency(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats });

  if (isLoading || !data) {
    return <div className="p-6 text-gray-400">جارِ تحميل الإحصائيات...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">لوحة التحكم</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إيراد اليوم" value={currency(data.revenueToday)} icon={DollarSign} />
        <StatCard title="إيراد الشهر" value={currency(data.revenueThisMonth)} icon={TrendingUp} />
        <StatCard title="المصروفات" value={currency(data.expenses)} icon={TrendingDown} />
        <StatCard
          title="الأرباح"
          value={currency(data.profit)}
          icon={DollarSign}
          alert={data.profit < 0}
        />

        <StatCard title="الطلاب النشطين" value={data.activeStudents} icon={Users} />
        <StatCard title="طلاب جدد هذا الشهر" value={data.newStudents} icon={UserPlus} />
        <StatCard
          title="جلسات اليوم"
          value={data.upcomingSessionsToday}
          icon={CalendarClock}
        />
        <StatCard title="مدرسين اليوم" value={data.instructorsToday} icon={GraduationCap} />

        <StatCard
          title="دفعات معلقة"
          value={data.pendingPayments}
          icon={AlertCircle}
          alert={data.pendingPayments > 0}
        />
        <StatCard
          title="إجمالي المديونيات"
          value={currency(data.debts)}
          icon={AlertCircle}
          alert={data.debts > 0}
        />
        <StatCard
          title="نسبة الحضور"
          value={`${data.attendancePercentage}%`}
          icon={Percent}
        />
      </div>
    </div>
  );
}
