"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Course = {
  id: string;
  name: string;
  description?: string;
  _count: { enrollments: number };
};

async function fetchCourses() {
  const res = await fetch("/api/courses");
  if (!res.ok) throw new Error("فشل تحميل الكورسات");
  return res.json() as Promise<{ courses: Course[] }>;
}

export default function CoursesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setModalOpen(false);
      setName("");
      setDescription("");
    },
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">الكورسات</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          إضافة كورس
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.courses.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">{c.name}</h3>
              </div>
              {c.description && <p className="mb-3 text-sm text-gray-500">{c.description}</p>}
              <p className="text-xs text-gray-500 mt-2">
                عدد المسجلين: <span className="font-medium text-primary">{c._count.enrollments}</span> طالب
              </p>
            </div>
          ))}
          {data?.courses.length === 0 && (
            <p className="text-gray-400">لا توجد كورسات بعد</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة كورس جديد">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block text-sm text-gray-600">اسم الكورس *</label>
            <input
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="English, Programming, Robotics..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">الوصف</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
