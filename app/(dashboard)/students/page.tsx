"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Phone, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StudentForm, EnrollmentEntry } from "@/components/students/student-form";

type Student = {
  id: string;
  fullName: string;
  age?: number;
  school?: string;
  guardianName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  payments: { status: string; remaining: string }[];
  enrollments: { course: { name: string } }[];
};

async function fetchStudents(search: string) {
  const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
  if (!res.ok) throw new Error("فشل تحميل الطلاب");
  return res.json() as Promise<{ students: Student[]; total: number }>;
}

async function fetchStudent(id: string) {
  const res = await fetch(`/api/students/${id}`);
  if (!res.ok) throw new Error("فشل تحميل بيانات الطالب");
  const data = await res.json();
  return data.student as Student;
}

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["students", search],
    queryFn: () => fetchStudents(search),
  });

  async function afterCreateEnrollments(studentId: string, enrollments: EnrollmentEntry[]) {
    for (const en of enrollments) {
      await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId: en.courseId,
          subscribedSessions: en.subscribedSessions,
          paidAmount: en.paidAmount,
        }),
      });

      if (en.paidAmount && en.paidAmount > 0) {
        await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            month: todayMonth(),
            amount: en.paidAmount,
            paidAmount: en.paidAmount,
            dueDate: new Date().toISOString(),
            notes: "دفعة اشتراك عند التسجيل",
          }),
        });
      }
    }
  }

  const createMutation = useMutation({
    mutationFn: async ({
      form,
      enrollments,
    }: {
      form: Record<string, unknown>;
      enrollments: EnrollmentEntry[];
    }) => {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل إضافة الطالب");
      const { student } = await res.json();
      await afterCreateEnrollments(student.id, enrollments);
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setAddOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: Record<string, unknown> }) => {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل تعديل بيانات الطالب");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingId(null);
      setEditingStudent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل حذف الطالب");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  async function openEdit(id: string) {
    setEditingId(id);
    setLoadingEdit(true);
    try {
      const student = await fetchStudent(id);
      setEditingStudent(student);
    } catch {
      setEditingId(null);
    } finally {
      setLoadingEdit(false);
    }
  }

  function closeEdit() {
    setEditingId(null);
    setEditingStudent(null);
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`متأكد إنك عايز تحذف "${name}"؟ الطالب هيتحول لغير نشط ومش هيظهر في القوائم.`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">الطلاب</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          إضافة طالب
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="w-full text-sm outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-right text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">الاسم</th>
              <th className="px-4 py-3 font-medium">السن</th>
              <th className="px-4 py-3 font-medium">ولي الأمر</th>
              <th className="px-4 py-3 font-medium">التواصل</th>
              <th className="px-4 py-3 font-medium">الكورسات</th>
              <th className="px-4 py-3 font-medium">حالة الدفع</th>
              <th className="px-4 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  جارِ التحميل...
                </td>
              </tr>
            ) : data?.students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  لا يوجد طلاب
                </td>
              </tr>
            ) : (
              data?.students.map((s) => {
                const lastPayment = s.payments[0];
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-background">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.age || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.guardianName || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.fatherPhone || s.whatsapp ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {s.fatherPhone || s.whatsapp}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.enrollments.map((e) => e.course.name).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {lastPayment ? (
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            lastPayment.status === "PAID"
                              ? "bg-success-light text-success"
                              : lastPayment.status === "OVERDUE"
                              ? "bg-danger-light text-danger"
                              : "bg-warning-light text-warning"
                          }`}
                        >
                          {lastPayment.status === "PAID"
                            ? "مدفوع"
                            : lastPayment.status === "OVERDUE"
                            ? "متأخر"
                            : lastPayment.status === "PARTIAL"
                            ? "جزئي"
                            : "مستحق"}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          title="تعديل"
                          onClick={() => openEdit(s.id)}
                          className="text-primary hover:text-primary-dark"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="حذف"
                          onClick={() => handleDelete(s.id, s.fullName)}
                          className="text-danger hover:opacity-70"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة طالب جديد">
        <StudentForm
          showEnrollment
          onCancel={() => setAddOpen(false)}
          submitting={createMutation.isPending}
          onSubmit={(form, enrollments) => createMutation.mutate({ form, enrollments })}
        />
      </Modal>

      <Modal open={!!editingId} onClose={closeEdit} title="تعديل بيانات الطالب">
        {loadingEdit || !editingStudent ? (
          <p className="py-6 text-center text-gray-400">جارِ التحميل...</p>
        ) : (
          <StudentForm
            initial={editingStudent}
            onCancel={closeEdit}
            submitting={editMutation.isPending}
            onSubmit={(form) => editMutation.mutate({ id: editingStudent.id, form })}
          />
        )}
      </Modal>
    </div>
  );
}
