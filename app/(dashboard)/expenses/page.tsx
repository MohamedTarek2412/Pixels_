"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Expense = {
  id: string;
  category: string;
  amount: string;
  date: string;
  notes?: string;
  branch?: { name: string };
};

const CATEGORY_LABEL: Record<string, string> = {
  RENT: "إيجار", SALARIES: "مرتبات", BILLS: "فواتير", EQUIPMENT: "أجهزة",
  MARKETING: "تسويق", WATER: "مياه", ELECTRICITY: "كهرباء",
  INTERNET: "إنترنت", MAINTENANCE: "صيانة", MISC: "متنوع",
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function ExpensesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", month],
    queryFn: () => fetchJSON<{ expenses: Expense[] }>(`/api/expenses?month=${month}`),
  });

  const [form, setForm] = useState({
    category: "RENT", amount: 0, date: new Date().toISOString().slice(0, 10), notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setModalOpen(false);
    },
  });

  const total = data?.expenses.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" />
            إضافة مصروف
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <span className="text-sm text-gray-500">إجمالي مصروفات {month}: </span>
        <span className="text-lg font-bold text-gray-900">{total.toLocaleString("ar-EG")} ج.م</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">النوع</th>
              <th className="px-4 py-3 font-medium">المبلغ</th>
              <th className="px-4 py-3 font-medium">التاريخ</th>
              <th className="px-4 py-3 font-medium">الفرع</th>
              <th className="px-4 py-3 font-medium">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">جارِ التحميل...</td></tr>
            ) : data?.expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">لا توجد مصروفات</td></tr>
            ) : (
              data?.expenses.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{CATEGORY_LABEL[e.category]}</td>
                  <td className="px-4 py-3 text-gray-600">{Number(e.amount).toLocaleString("ar-EG")}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(e.date).toLocaleDateString("ar-EG")}</td>
                  <td className="px-4 py-3 text-gray-600">{e.branch?.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{e.notes || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مصروف">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">النوع *</label>
            <select required className={inputClass} value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">المبلغ *</label>
              <input required type="number" className={inputClass} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">التاريخ *</label>
              <input required type="date" className={inputClass} value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">ملاحظات</label>
            <textarea className={inputClass} rows={2} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
