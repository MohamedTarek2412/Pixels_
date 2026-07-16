"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

type MonthlyReport = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  newStudents: number;
  enrollments: number;
};

type ReportData = {
  monthly: MonthlyReport[];
  coursePopularity: { name: string; students: number }[];
};

const COLORS = ["#111827", "#4b5563", "#9ca3af", "#d1d5db", "#e5e7eb"];

async function fetchReport() {
  const res = await fetch("/api/reports?months=6");
  if (!res.ok) throw new Error("فشل تحميل التقارير");
  return res.json() as Promise<ReportData>;
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: fetchReport });

  if (isLoading || !data) return <div className="p-6 text-gray-400">جارِ تحميل التقارير...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">التقارير</h1>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">الإيرادات والمصروفات (آخر 6 أشهر)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#111827" name="الإيراد" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#d1d5db" name="المصروفات" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">صافي الربح</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="profit" stroke="#111827" strokeWidth={2} name="الربح" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">الطلاب الجدد شهرياً</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="newStudents" fill="#111827" name="طلاب جدد" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">شعبية الكورسات</h2>
          {data.coursePopularity.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد بيانات كافية بعد</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.coursePopularity}
                  dataKey="students"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.coursePopularity.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
