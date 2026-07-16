"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Lead = {
  id: string;
  name: string;
  phone?: string;
  source: string;
  status: string;
  notes?: string;
  assignedEmployee?: { name: string };
};

const STATUSES = [
  { value: "INTERESTED", label: "مهتم" },
  { value: "CALLED", label: "تم الاتصال" },
  { value: "TRIAL", label: "حصة تجريبية" },
  { value: "REGISTERED", label: "مسجل" },
  { value: "LOST", label: "فاقد" },
];

const SOURCE_LABEL: Record<string, string> = {
  FACEBOOK: "فيسبوك", INSTAGRAM: "انستجرام", REFERRAL: "توصية", WEBSITE: "الموقع", WALK_IN: "زيارة مباشرة",
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function CRMPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchJSON<{ leads: Lead[] }>("/api/leads"),
  });

  const [form, setForm] = useState({ name: "", phone: "", source: "FACEBOOK", notes: "" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setModalOpen(false);
      setForm({ name: "", phone: "", source: "FACEBOOK", notes: "" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">CRM - العملاء المحتملين</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          <Plus className="h-4 w-4" />
          إضافة Lead
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((status) => {
            const leadsInStatus = data?.leads.filter((l) => l.status === status.value) || [];
            return (
              <div key={status.value} className="rounded-xl bg-gray-100 p-3">
                <h3 className="mb-3 text-sm font-bold text-gray-700">
                  {status.label} ({leadsInStatus.length})
                </h3>
                <div className="space-y-2">
                  {leadsInStatus.map((lead) => (
                    <div key={lead.id} className="rounded-lg bg-white p-3 shadow-sm">
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      {lead.phone && (
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{SOURCE_LABEL[lead.source]}</p>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                        className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة Lead جديد">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">الاسم *</label>
            <input required className={inputClass} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">الهاتف</label>
            <input className={inputClass} value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">المصدر *</label>
            <select required className={inputClass} value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
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
