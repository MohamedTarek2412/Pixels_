"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

type StudentFormData = {
  fullName: string;
  age?: number;
  school?: string;
  guardianName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
};

export type EnrollmentEntry = {
  courseId: string;
  subscribedSessions?: number;
  paidAmount?: number;
};

type Course = { id: string; name: string; description?: string };

async function fetchCourses() {
  const res = await fetch("/api/courses");
  if (!res.ok) return { courses: [] as Course[] };
  return res.json() as Promise<{ courses: Course[] }>;
}

export function StudentForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  showEnrollment = false,
}: {
  initial?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData, enrollments: EnrollmentEntry[]) => void;
  onCancel: () => void;
  submitting?: boolean;
  /** يظهر قسم "التسجيل في الكورسات" فقط وقت إضافة طالب جديد */
  showEnrollment?: boolean;
}) {
  const [form, setForm] = useState<StudentFormData>({
    fullName: initial?.fullName || "",
    age: initial?.age,
    school: initial?.school || "",
    guardianName: initial?.guardianName || "",
    fatherPhone: initial?.fatherPhone || "",
    motherPhone: initial?.motherPhone || "",
    whatsapp: initial?.whatsapp || "",
    address: initial?.address || "",
    notes: initial?.notes || "",
  });

  const [enrollments, setEnrollments] = useState<EnrollmentEntry[]>(
    showEnrollment ? [{ courseId: "" }] : []
  );

  const { data: coursesData } = useQuery({
    queryKey: ["courses-for-enrollment"],
    queryFn: fetchCourses,
    enabled: showEnrollment,
  });

  function update<K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateEnrollment(index: number, patch: Partial<EnrollmentEntry>) {
    setEnrollments((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function addEnrollmentRow() {
    setEnrollments((list) => [...list, { courseId: "" }]);
  }

  function removeEnrollmentRow(index: number) {
    setEnrollments((list) => list.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validEnrollments = enrollments.filter((en) => en.courseId);
    onSubmit(form, validEnrollments);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>الاسم *</label>
        <input
          required
          className={inputClass}
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>السن</label>
          <input
            type="number"
            className={inputClass}
            value={form.age ?? ""}
            onChange={(e) => update("age", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label className={labelClass}>المدرسة</label>
          <input
            className={inputClass}
            value={form.school}
            onChange={(e) => update("school", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>ولي الأمر</label>
        <input
          className={inputClass}
          value={form.guardianName}
          onChange={(e) => update("guardianName", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>رقم الأب</label>
          <input
            className={inputClass}
            value={form.fatherPhone}
            onChange={(e) => update("fatherPhone", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>رقم الأم</label>
          <input
            className={inputClass}
            value={form.motherPhone}
            onChange={(e) => update("motherPhone", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>واتساب</label>
        <input
          className={inputClass}
          value={form.whatsapp}
          onChange={(e) => update("whatsapp", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>العنوان</label>
        <input
          className={inputClass}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>ملاحظات</label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {showEnrollment && (
        <div className="rounded-lg border border-primary-light bg-primary-light/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">التسجيل في الكورسات (اختياري)</h3>
            <button
              type="button"
              onClick={addEnrollmentRow}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark"
            >
              <Plus className="h-3 w-3" /> إضافة كورس تاني
            </button>
          </div>

          <div className="space-y-3">
            {enrollments.map((en, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelClass}>الكورس</label>
                  {enrollments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEnrollmentRow(idx)}
                      className="text-danger hover:opacity-70"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <select
                  className={inputClass}
                  value={en.courseId}
                  onChange={(e) => updateEnrollment(idx, { courseId: e.target.value })}
                >
                  <option value="">بدون تسجيل الآن</option>
                  {coursesData?.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {en.courseId && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>عدد السيشنات المشترك فيها</label>
                      <input
                        type="number"
                        min={1}
                        className={inputClass}
                        placeholder="مثال: 8"
                        value={en.subscribedSessions ?? ""}
                        onChange={(e) =>
                          updateEnrollment(idx, {
                            subscribedSessions: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>المبلغ المدفوع (ج.م)</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        placeholder="مثال: 800"
                        value={en.paidAmount ?? ""}
                        onChange={(e) =>
                          updateEnrollment(idx, {
                            paidAmount: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-gray-50"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "جارِ الحفظ..." : "حفظ"}
        </button>
      </div>
    </form>
  );
}
