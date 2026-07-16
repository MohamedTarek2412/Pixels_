"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Payment = {
  id: string;
  month: string;
  amount: string;
  discount: string;
  paidAmount: string;
  remaining: string;
  dueDate: string;
  paidAt?: string;
  sessionsCovered?: number;
  status: string;
  paymentMethod?: string;
  studentId?: string;
  student: { fullName: string; whatsapp?: string };
};

type Student = { id: string; fullName: string };

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PAID: { label: "مدفوع", className: "bg-success-light text-success" },
  PARTIAL: { label: "جزئي", className: "bg-warning-light text-warning" },
  DUE: { label: "مستحق", className: "bg-gray-100 text-gray-600" },
  OVERDUE: { label: "متأخر", className: "bg-danger-light text-danger" },
};

const emptyForm = {
  studentId: "",
  month: new Date().toISOString().slice(0, 7),
  amount: 0,
  discount: 0,
  paidAmount: 0,
  dueDate: "",
  paidAt: new Date().toISOString().slice(0, 10),
  sessionsCovered: undefined as number | undefined,
  paymentMethod: "CASH",
  receiptNumber: "",
  notes: "",
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "mb-1 block text-sm text-gray-600";

function PaymentFields({
  form,
  setForm,
  studentsData,
  lockStudent,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  studentsData?: { students: Student[] };
  lockStudent?: boolean;
}) {
  return (
    <>
      <div>
        <label className={labelClass}>الطالب *</label>
        <select
          required
          disabled={lockStudent}
          className={inputClass}
          value={form.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
        >
          <option value="">اختر...</option>
          {studentsData?.students.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>الشهر *</label>
          <input required type="month" className={inputClass} value={form.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>تاريخ الاستحقاق *</label>
          <input required type="date" className={inputClass} value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>المبلغ *</label>
          <input required type="number" className={inputClass} value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
        </div>
        <div>
          <label className={labelClass}>الخصم</label>
          <input type="number" className={inputClass} value={form.discount}
            onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))} />
        </div>
        <div>
          <label className={labelClass}>المدفوع</label>
          <input type="number" className={inputClass} value={form.paidAmount}
            onChange={(e) => setForm((f) => ({ ...f, paidAmount: Number(e.target.value) }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>دفع يوم إيه؟</label>
          <input type="date" className={inputClass} value={form.paidAt}
            onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>الدفعة دي بتغطي كام سيشن؟</label>
          <input type="number" min={1} placeholder="مثال: 8" className={inputClass}
            value={form.sessionsCovered ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, sessionsCovered: e.target.value ? Number(e.target.value) : undefined }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>طريقة الدفع</label>
          <select className={inputClass} value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
            <option value="CASH">كاش</option>
            <option value="INSTAPAY">Instapay</option>
            <option value="VODAFONE_CASH">فودافون كاش</option>
            <option value="CARD">بطاقة</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>رقم الإيصال</label>
          <input className={inputClass} value={form.receiptNumber}
            onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className={labelClass}>ملاحظات</label>
        <textarea rows={2} className={inputClass} value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>
    </>
  );
}

export default function PaymentsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", statusFilter],
    queryFn: () => fetchJSON<{ payments: Payment[] }>(`/api/payments${statusFilter ? `?status=${statusFilter}` : ""}`),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students-all"],
    queryFn: () => fetchJSON<{ students: Student[] }>("/api/students"),
  });

  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setAddOpen(false);
      setForm(emptyForm);
    },
  });

  const [editForm, setEditForm] = useState(emptyForm);

  function startEdit(p: Payment) {
    setEditForm({
      studentId: p.studentId || "",
      month: p.month,
      amount: Number(p.amount),
      discount: Number(p.discount),
      paidAmount: Number(p.paidAmount),
      dueDate: p.dueDate.slice(0, 10),
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      sessionsCovered: p.sessionsCovered,
      paymentMethod: p.paymentMethod || "CASH",
      receiptNumber: "",
      notes: "",
    });
    setEditing(p);
  }

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const res = await fetch(`/api/payments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("فشل التعديل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  function handleDelete(p: Payment) {
    if (confirm(`متأكد إنك عايز تحذف دفعة "${p.student.fullName}" لشهر ${p.month}؟`)) {
      deleteMutation.mutate(p.id);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">المدفوعات</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          تسجيل دفعة
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "PAID", "PARTIAL", "DUE", "OVERDUE"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs ${
              statusFilter === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s === "" ? "الكل" : STATUS_LABEL[s].label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-right text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">الطالب</th>
              <th className="px-4 py-3 font-medium">الشهر</th>
              <th className="px-4 py-3 font-medium">المبلغ</th>
              <th className="px-4 py-3 font-medium">المدفوع</th>
              <th className="px-4 py-3 font-medium">المتبقي</th>
              <th className="px-4 py-3 font-medium">دفع يوم</th>
              <th className="px-4 py-3 font-medium">كام سيشن</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">جارِ التحميل...</td></tr>
            ) : data?.payments.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">لا توجد دفعات</td></tr>
            ) : (
              data?.payments.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.student.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{p.month}</td>
                  <td className="px-4 py-3 text-gray-600">{Number(p.amount).toLocaleString("ar-EG")}</td>
                  <td className="px-4 py-3 text-gray-600">{Number(p.paidAmount).toLocaleString("ar-EG")}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1">
                      {Number(p.remaining) > 0 && <AlertTriangle className="h-3 w-3 text-danger" />}
                      {Number(p.remaining).toLocaleString("ar-EG")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-EG") : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.sessionsCovered ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${STATUS_LABEL[p.status]?.className}`}>
                      {STATUS_LABEL[p.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button title="تعديل" onClick={() => startEdit(p)} className="text-primary hover:text-primary-dark">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title="حذف" onClick={() => handleDelete(p)} className="text-danger hover:opacity-70">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="تسجيل دفعة جديدة">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
          <PaymentFields form={form} setForm={setForm} studentsData={studentsData} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="تعديل الدفعة">
        <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }} className="space-y-3">
          <PaymentFields form={editForm} setForm={setEditForm} studentsData={studentsData} lockStudent />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={editMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
              حفظ التعديل
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
