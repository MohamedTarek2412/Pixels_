"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, DollarSign, Calendar, Cake, AlertTriangle } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  PAYMENT_OVERDUE: DollarSign,
  SESSION_TODAY: Calendar,
  BIRTHDAY: Cake,
  SUBSCRIPTION_ENDING: AlertTriangle,
  REPEATED_ABSENCE: AlertTriangle,
  GENERAL: Bell,
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchJSON<{ notifications: Notification[] }>("/api/notifications"),
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">الإشعارات</h1>

      {isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : data?.notifications.length === 0 ? (
        <p className="text-gray-400">لا توجد إشعارات</p>
      ) : (
        <div className="space-y-2">
          {data?.notifications.map((n) => {
            const Icon = ICON_MAP[n.type] || Bell;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  n.isRead ? "border-gray-200 bg-white" : "border-gray-300 bg-gray-50"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 ${n.isRead ? "text-gray-300" : "text-gray-700"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${n.isRead ? "text-gray-500" : "text-gray-900"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
                {!n.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
