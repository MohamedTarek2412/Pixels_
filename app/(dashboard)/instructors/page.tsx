"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GraduationCap, Pencil, Trash2, CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Instructor = {
  id: string;
  ratePerSession: string;
  specialty?: string;
  rating?: number;
  user: { name: string; email: string; phone?: string };
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "mb-1 block text-sm text-muted";

export default function InstructorsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [logging, setLogging] = useState<Instructor | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => fetchJSON<{ instructors: Instructor[] }>("/api/instructors"),
  });

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", ratePerSession: 250, specialty: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل الإضافة");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", ratePerSession: 250, specialty: "" });
    },
  });

  const [editForm, setEditForm] = useState({ name: "", phone: "", specialty: "", ratePerSession: 0 });

  function startEdit(i: Instructor) {
    setEditForm({
      name: i.user.name,
      phone: i.user.phone || "",
      specialty: i.specialty || "",
      ratePerSession: Number(i.ratePerSession),
    });
    setEditing(i);
  }

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const res = await fetch(`/api/instructors/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("فشل التعديل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instructors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instructors"] }),
  });

  function handleDelete(i: Instructor) {
    if (confirm(`متأكد إنك عايز تحذف "${i.user.name}"؟`)) {
      deleteMutation.mutate(i.id);
    }
  }

  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    count: 1,
  });

  function startLog(i: Instructor) {
    setLogForm({
      date: new Date().toISOString().slice(0, 10),
      count: 1,
    });
    setLogging(i);
  }

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!logging) return;
      const res = await fetch(`/api/instructors/${logging.id}/log-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل التسجيل");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setLogging(null);
    },
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">المدرسين</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          إضافة مدرس
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.instructors.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-gray-900">{i.user.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button title="تسجيل سيشنات" onClick={() => startLog(i)} className="text-primary hover:text-primary-dark">
                    <CalendarPlus className="h-4 w-4" />
                  </button>
                  <button title="تعديل" onClick={() => startEdit(i)} className="text-primary hover:text-primary-dark">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button title="حذف" onClick={() => handleDelete(i)} className="text-danger hover:opacity-70">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">{i.user.email}</p>
              {i.user.phone && <p className="text-sm text-gray-500">{i.user.phone}</p>}
              {i.specialty && <p className="text-sm text-gray-500">التخصص: {i.specialty}</p>}
              <p className="mt-2 text-sm font-medium text-gray-900">
                {Number(i.ratePerSession).toLocaleString("ar-EG")} ج.م / سيشن
              </p>
            </div>
          ))}
          {data?.instructors.length === 0 && <p className="text-gray-400">لا يوجد مدرسين بعد</p>}
        </div>
      )}

      {/* إضافة مدرس */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مدرس جديد">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-3"
        >
          {createMutation.isError && (
            <div className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
              {(createMutation.error as Error).message}
            </div>
          )}
          <div>
            <label className={labelClass}>الاسم *</label>
            <input required className={inputClass} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>البريد الإلكتروني *</label>
            <input required type="email" className={inputClass} value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>كلمة المرور *</label>
            <input required type="password" className={inputClass} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>الهاتف</label>
              <input className={inputClass} value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>سعر السيشن *</label>
              <input required type="number" className={inputClass} value={form.ratePerSession}
                onChange={(e) => setForm((f) => ({ ...f, ratePerSession: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className={labelClass}>التخصص</label>
            <input className={inputClass} value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {/* تعديل مدرس */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="تعديل بيانات المدرس">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="space-y-3"
        >
          {editMutation.isError && (
            <div className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
              {(editMutation.error as Error).message}
            </div>
          )}
          <div>
            <label className={labelClass}>الاسم</label>
            <input className={inputClass} value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>الهاتف</label>
              <input className={inputClass} value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>سعر السيشن</label>
              <input type="number" className={inputClass} value={editForm.ratePerSession}
                onChange={(e) => setEditForm((f) => ({ ...f, ratePerSession: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className={labelClass}>التخصص</label>
            <input className={inputClass} value={editForm.specialty}
              onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={editMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ التعديل
            </button>
          </div>
        </form>
      </Modal>

      {/* تسجيل سيشنات تمت للمدرس */}
      <Modal open={!!logging} onClose={() => setLogging(null)} title={`تسجيل سيشنات: ${logging?.user.name ?? ""}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            logMutation.mutate();
          }}
          className="space-y-3"
        >
          {logMutation.isError && (
            <div className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
              {(logMutation.error as Error).message}
            </div>
          )}
          <p className="text-xs text-muted">
            هيتسجل عدد السيشنات دي كـ &quot;تمت&quot; للمدرس وهتتحسب أوتوماتيك في المرتب.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>التاريخ</label>
              <input type="date" className={inputClass} value={logForm.date}
                onChange={(e) => setLogForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>عدد السيشنات</label>
              <input type="number" min={1} max={50} className={inputClass} value={logForm.count}
                onChange={(e) => setLogForm((f) => ({ ...f, count: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLogging(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={logMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
