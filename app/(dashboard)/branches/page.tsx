"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, DoorOpen } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  rooms: { id: string; name: string; capacity: number }[];
  _count: { students: number };
};

export default function BranchesPage() {
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json() as Promise<{ branches: Branch[] }>;
    },
  });

  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "" });
  const [roomForm, setRoomForm] = useState({ name: "", capacity: 10 });

  const createBranch = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchForm),
      });
      if (!res.ok) throw new Error("فشل الإنشاء");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBranchModalOpen(false);
      setBranchForm({ name: "", address: "", phone: "" });
    },
  });

  const createRoom = useMutation({
    mutationFn: async (branchId: string) => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...roomForm, branchId }),
      });
      if (!res.ok) throw new Error("فشل الإنشاء");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setRoomModalOpen(null);
      setRoomForm({ name: "", capacity: 10 });
    },
  });

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">الفروع</h1>
        <button
          onClick={() => setBranchModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          إضافة فرع
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data?.branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">{b.name}</h3>
              </div>
              {b.address && <p className="text-sm text-gray-500">{b.address}</p>}
              {b.phone && <p className="text-sm text-gray-500">{b.phone}</p>}
              <p className="mt-1 text-xs text-gray-400">{b._count.students} طالب مسجل</p>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">الغرف</span>
                  <button
                    onClick={() => setRoomModalOpen(b.id)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    + إضافة غرفة
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.rooms.map((r) => (
                    <span
                      key={r.id}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      <DoorOpen className="h-3 w-3" />
                      {r.name} ({r.capacity})
                    </span>
                  ))}
                  {b.rooms.length === 0 && (
                    <span className="text-xs text-gray-400">لا توجد غرف</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="إضافة فرع جديد">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBranch.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block text-sm text-gray-600">اسم الفرع *</label>
            <input
              required
              className={inputClass}
              value={branchForm.name}
              onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">العنوان</label>
            <input
              className={inputClass}
              value={branchForm.address}
              onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">الهاتف</label>
            <input
              className={inputClass}
              value={branchForm.phone}
              onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBranchModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createBranch.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!roomModalOpen} onClose={() => setRoomModalOpen(null)} title="إضافة غرفة">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (roomModalOpen) createRoom.mutate(roomModalOpen);
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block text-sm text-gray-600">اسم الغرفة *</label>
            <input
              required
              className={inputClass}
              value={roomForm.name}
              onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">السعة *</label>
            <input
              required
              type="number"
              className={inputClass}
              value={roomForm.capacity}
              onChange={(e) => setRoomForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRoomModalOpen(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createRoom.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
