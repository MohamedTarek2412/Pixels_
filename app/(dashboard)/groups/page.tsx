"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Course = { id: string; name: string };
type Branch = { id: string; name: string; rooms: { id: string; name: string }[] };
type Instructor = { id: string; user: { name: string } };
type Group = {
  id: string;
  name: string;
  status: string;
  course: { name: string };
  branch: { name: string };
  instructor?: { user: { name: string } };
  room?: { name: string };
  scheduleDays: string[];
  scheduleTime?: string;
  _count: { enrollments: number; sessions: number };
};

const DAYS = [
  { value: "SUNDAY", label: "الأحد" },
  { value: "MONDAY", label: "الإثنين" },
  { value: "TUESDAY", label: "الثلاثاء" },
  { value: "WEDNESDAY", label: "الأربعاء" },
  { value: "THURSDAY", label: "الخميس" },
  { value: "FRIDAY", label: "الجمعة" },
  { value: "SATURDAY", label: "السبت" },
];

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function GroupsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => fetchJSON<{ groups: Group[] }>("/api/groups"),
  });
  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => fetchJSON<{ courses: Course[] }>("/api/courses"),
  });
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetchJSON<{ branches: Branch[] }>("/api/branches"),
  });
  const { data: instructorsData } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => fetchJSON<{ instructors: Instructor[] }>("/api/instructors"),
  });

  const [form, setForm] = useState({
    name: "",
    courseId: "",
    branchId: "",
    roomId: "",
    instructorId: "",
    startDate: "",
    seats: 10,
    scheduleDays: [] as string[],
    scheduleTime: "16:00",
    totalSessions: 8,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("فشل الإنشاء");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setModalOpen(false);
    },
  });

  const generateSessionsMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/groups/${groupId}/generate-sessions`, { method: "POST" });
      if (!res.ok) throw new Error("فشل توليد السيشنز");
      return res.json();
    },
    onSuccess: (data) => {
      alert(`تم توليد ${data.created} جلسة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => alert("فشل توليد السيشنز - تأكد من إضافة أيام الجدول وعدد السيشنز"),
  });

  const selectedBranch = branchesData?.branches.find((b) => b.id === form.branchId);

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day)
        ? f.scheduleDays.filter((d) => d !== day)
        : [...f.scheduleDays, day],
    }));
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">الجروبات</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          إضافة جروب
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupsData?.groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{g.name}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    g.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : g.status === "PAUSED"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {g.status === "ACTIVE" ? "نشط" : g.status === "PAUSED" ? "متوقف" : "منتهي"}
                </span>
              </div>
              <p className="text-sm text-gray-500">{g.course.name} · {g.branch.name}</p>
              <p className="text-sm text-gray-500">
                {g.instructor?.user.name || "بدون مدرس"} {g.room ? `· ${g.room.name}` : ""}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {g._count.enrollments} طالب
                </span>
                <span>{g._count.sessions} جلسة</span>
              </div>
              <button
                onClick={() => generateSessionsMutation.mutate(g.id)}
                disabled={generateSessionsMutation.isPending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <CalendarPlus className="h-3 w-3" />
                توليد الجلسات تلقائياً
              </button>
            </div>
          ))}
          {groupsData?.groups.length === 0 && (
            <p className="text-gray-400">لا توجد جروبات بعد</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة جروب جديد">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block text-sm text-gray-600">اسم الجروب *</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="English A1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">الكورس *</label>
              <select
                required
                className={inputClass}
                value={form.courseId}
                onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              >
                <option value="">اختر...</option>
                {coursesData?.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الفرع *</label>
              <select
                required
                className={inputClass}
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value, roomId: "" }))}
              >
                <option value="">اختر...</option>
                {branchesData?.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">الأوضة</label>
              <select
                className={inputClass}
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
              >
                <option value="">بدون</option>
                {selectedBranch?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">المدرس</label>
              <select
                className={inputClass}
                value={form.instructorId}
                onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))}
              >
                <option value="">بدون</option>
                {instructorsData?.instructors.map((i) => (
                  <option key={i.id} value={i.id}>{i.user.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">تاريخ البداية *</label>
              <input
                required
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">عدد المقاعد *</label>
              <input
                required
                type="number"
                className={inputClass}
                value={form.seats}
                onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">أيام الجدول</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    form.scheduleDays.includes(d.value)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">معاد الجلسة</label>
              <input
                type="time"
                className={inputClass}
                value={form.scheduleTime}
                onChange={(e) => setForm((f) => ({ ...f, scheduleTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">عدد الجلسات الكلي</label>
              <input
                type="number"
                className={inputClass}
                value={form.totalSessions}
                onChange={(e) => setForm((f) => ({ ...f, totalSessions: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {createMutation.isPending ? "جارِ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
