"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";

type Payroll = {
  id: string;
  month: string;
  sessionsCount: number;
  baseAmount: string;
  bonus: string;
  penalty: string;
  totalAmount: string;
  instructor: { user: { name: string } };
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payroll", month],
    queryFn: () => fetchJSON<{ payrolls: Payroll[] }>(`/api/payroll?month=${month}`),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      if (!res.ok) throw new Error("فشل التوليد");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", month] });
    },
  });

  const total = data?.payrolls.reduce((sum, p) => sum + Number(p.totalAmount), 0) || 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">المرتبات</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
          >
            <Receipt className="h-4 w-4" />
            {generateMutation.isPending ? "جارِ التوليد..." : "توليد المرتبات"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-sm text-gray-500">إجمالي مرتبات {month}: </span>
            <span className="text-lg font-bold text-gray-900">
              {total.toLocaleString("ar-EG")} ج.م
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-right text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">المدرس</th>
                  <th className="px-4 py-3 font-medium">عدد السيشنز</th>
                  <th className="px-4 py-3 font-medium">الأساسي</th>
                  <th className="px-4 py-3 font-medium">مكافأة</th>
                  <th className="px-4 py-3 font-medium">خصم</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data?.payrolls.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    لا توجد مرتبات لهذا الشهر - اضغط &quot;توليد المرتبات&quot;
                  </td></tr>
                ) : (
                  data?.payrolls.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.instructor.user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sessionsCount}</td>
                      <td className="px-4 py-3 text-gray-600">{Number(p.baseAmount).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-green-600">+{Number(p.bonus).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-red-600">-{Number(p.penalty).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{Number(p.totalAmount).toLocaleString("ar-EG")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
