"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  user?: { name: string };
};

const ACTION_LABEL: Record<string, { label: string; className: string }> = {
  CREATE: { label: "إضافة", className: "bg-green-100 text-green-700" },
  UPDATE: { label: "تعديل", className: "bg-yellow-100 text-yellow-700" },
  DELETE: { label: "حذف", className: "bg-red-100 text-red-700" },
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل التحميل");
  return res.json();
}

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => fetchJSON<{ logs: AuditLog[] }>(
      `/api/audit-logs${entityType ? `?entityType=${entityType}` : ""}`
    ),
  });

  const entityTypes = ["Student", "Payment", "Payroll", "Expense", "Lead"];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">سجل التعديلات</h1>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setEntityType("")}
          className={`rounded-full px-3 py-1 text-xs ${
            entityType === "" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          الكل
        </button>
        {entityTypes.map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`rounded-full px-3 py-1 text-xs ${
              entityType === t ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-red-500">الصلاحية دي متاحة للأدمن بس</p>
      ) : isLoading ? (
        <p className="text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-right text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">العملية</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">المستخدم</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${ACTION_LABEL[log.action]?.className}`}>
                      {ACTION_LABEL[log.action]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.entityType}</td>
                  <td className="px-4 py-3 text-gray-600">{log.user?.name || "System"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
