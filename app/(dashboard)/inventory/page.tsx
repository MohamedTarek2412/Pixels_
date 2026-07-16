"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Boxes } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Item = {
  id: string;
  name: string;
  quantity: number;
  available: number;
  broken: number;
  lost: number;
  branch?: { name: string };
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function InventoryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchJSON<{ items: Item[] }>("/api/inventory"),
  });

  const [form, setForm] = useState({ name: "", quantity: 1, available: 1, broken: 0, lost: 0 });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setModalOpen(false);
    },
  });

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">المخزون</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          <Plus className="h-4 w-4" />
          إضافة عنصر
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">العنصر</th>
              <th className="px-4 py-3 font-medium">الفرع</th>
              <th className="px-4 py-3 font-medium">الكمية</th>
              <th className="px-4 py-3 font-medium">متاح</th>
              <th className="px-4 py-3 font-medium">تالف</th>
              <th className="px-4 py-3 font-medium">مفقود</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">جارِ التحميل...</td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">لا توجد عناصر</td></tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-gray-400" />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.branch?.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-green-600">{item.available}</td>
                  <td className="px-4 py-3 text-red-600">{item.broken}</td>
                  <td className="px-4 py-3 text-gray-500">{item.lost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة عنصر مخزون">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">اسم العنصر *</label>
            <input required className={inputClass} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Robotics Kits, Arduino..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">الكمية *</label>
              <input required type="number" className={inputClass} value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">متاح *</label>
              <input required type="number" className={inputClass} value={form.available}
                onChange={(e) => setForm((f) => ({ ...f, available: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">تالف</label>
              <input type="number" className={inputClass} value={form.broken}
                onChange={(e) => setForm((f) => ({ ...f, broken: Number(e.target.value) }))} />
            </div>
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
