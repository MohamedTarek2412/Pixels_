"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, AlertCircle, Calendar, BookOpen, AlertTriangle, RefreshCw } from "lucide-react";

type Course = { id: string; name: string };
type AttendanceRow = { id: string; studentId: string; status: string; courseId: string | null };
type EnrollmentInfo = {
  courseId: string;
  courseName: string;
  attended: number;
  subscribed: number;
  needsRenewal: boolean;
};
type StudentBulk = {
  id: string;
  fullName: string;
  courses: Course[];
  attendances: AttendanceRow[];
  enrollmentInfo: EnrollmentInfo[];
};

// نوع البيانات المسترجعة من API
type BulkDataResponse = { data: StudentBulk[] };

// نوع المتغيرات المستخدمة في mutation
type MarkAttendanceVariables = { studentId: string; status: string };
// نوع السياق الخاص بـ onMutate
type MarkAttendanceContext = { previousData: BulkDataResponse | undefined };

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "حاضر", icon: Check, color: "bg-success-light text-success border-success" },
  { value: "ABSENT", label: "غايب", icon: X, color: "bg-danger-light text-danger border-danger" },
  { value: "LATE", label: "متأخر", icon: Clock, color: "bg-warning-light text-warning border-warning" },
  { value: "EXCUSED", label: "بعذر", icon: AlertCircle, color: "bg-info-light text-info border-info" },
];

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

function SessionProgress({ info, courseId }: { info: EnrollmentInfo[]; courseId: string }) {
  const filtered = courseId ? info.filter((e) => e.courseId === courseId) : info;
  if (filtered.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {filtered.map((e) => {
        const pct = Math.min((e.attended / e.subscribed) * 100, 100);
        const remaining = Math.max(e.subscribed - e.attended, 0);

        return (
          <div key={e.courseId} className="text-xs">
            {!courseId && (
              <span className="font-medium text-gray-600 text-[11px]">{e.courseName}: </span>
            )}
            {e.needsRenewal ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-danger-light border border-danger px-2 py-1.5 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0" />
                <span className="font-bold text-danger">انتهت الـ {e.subscribed} سيشن — يحتاج تجديد!</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-500">
                    حضر <span className="font-bold text-gray-800">{e.attended}</span> من{" "}
                    <span className="font-bold text-gray-800">{e.subscribed}</span> سيشن
                  </span>
                  {remaining <= 2 && remaining > 0 && (
                    <span className="flex items-center gap-0.5 text-warning font-semibold">
                      <RefreshCw className="h-3 w-3" />
                      باقي {remaining}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 75 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [courseId, setCourseId] = useState("");
  const queryClient = useQueryClient();

  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => fetchJSON<{ courses: Course[] }>("/api/courses"),
  });

  const { data: bulkData, isLoading } = useQuery({
    queryKey: ["attendance-bulk", date, courseId],
    queryFn: () => {
      const url = new URL("/api/attendance/bulk", window.location.origin);
      url.searchParams.set("date", date);
      if (courseId) url.searchParams.set("courseId", courseId);
      return fetchJSON<BulkDataResponse>(url.toString());
    },
  });

  const markMutation = useMutation<
    unknown, // نوع القيمة المعادة (لا نستخدمها)
    Error,   // نوع الخطأ
    MarkAttendanceVariables,
    MarkAttendanceContext
  >({
    mutationFn: async ({ studentId, status }) => {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, date, status, courseId: courseId || undefined }),
      });
      if (!res.ok) throw new Error("فشل حفظ الحضور");
      return res.json();
    },
    onMutate: async ({ studentId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["attendance-bulk", date, courseId] });

      const previousData = queryClient.getQueryData<BulkDataResponse>(["attendance-bulk", date, courseId]);

      queryClient.setQueryData<BulkDataResponse>(["attendance-bulk", date, courseId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((student: StudentBulk) => {
            if (student.id !== studentId) return student;
            const existingIndex = student.attendances.findIndex(
              (a) => !courseId || a.courseId === courseId
            );
            const newAttendances = [...student.attendances];
            if (existingIndex >= 0) {
              newAttendances[existingIndex] = { ...newAttendances[existingIndex], status };
            } else {
              newAttendances.push({ id: "temp-id", studentId, status, courseId: courseId || null });
            }
            return { ...student, attendances: newAttendances };
          }),
        };
      });
      return { previousData };
    },
    onError: (err: Error, _vars: MarkAttendanceVariables, context: MarkAttendanceContext | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(["attendance-bulk", date, courseId], context.previousData);
      }
      console.error("Error saving attendance:", err);
      alert("حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-bulk", date, courseId] });
    },
  });

  return (
    <div className="p-4 sm:p-6 pb-24">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">تسجيل الحضور</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-primary" /> التاريخ
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-white"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
            <BookOpen className="h-4 w-4 text-primary" /> الكورس
          </label>
          <select
            className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-white"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">كل الكورسات والطلاب</option>
            {coursesData?.courses?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students List */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-gray-400">جارِ تحميل الطلاب...</p>
        </div>
      ) : bulkData?.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-12">
          <p className="text-gray-500">لا يوجد طلاب مطابقين للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {bulkData?.data.map((student) => {
            const currentStatus = student.attendances.find(
              (a) => !courseId || a.courseId === courseId
            )?.status;

            const needsRenewal = courseId
              ? (student.enrollmentInfo ?? []).find((e) => e.courseId === courseId)?.needsRenewal
              : (student.enrollmentInfo ?? []).some((e) => e.needsRenewal);

            return (
              <div
                key={student.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                  needsRenewal ? "border-danger/40 bg-danger-light/20" : "border-border"
                }`}
              >
                <div className="mb-3 flex flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{student.fullName}</h3>
                    {needsRenewal && (
                      <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                        <AlertTriangle className="h-3 w-3" /> تجديد
                      </span>
                    )}
                  </div>
                  {student.courses.length > 0 && !courseId && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.courses.map((c) => (
                        <span key={c.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <SessionProgress info={student.enrollmentInfo ?? []} courseId={courseId} />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = currentStatus === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => markMutation.mutate({ studentId: student.id, status: opt.value })}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all active:scale-95 ${
                          active
                            ? opt.color + " ring-1 ring-inset ring-current"
                            : "border-border bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] sm:text-xs font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
