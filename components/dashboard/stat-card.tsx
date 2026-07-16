import { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  alert,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        alert ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{title}</span>
        <Icon className={`h-5 w-5 ${alert ? "text-red-500" : "text-gray-400"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {trend && <div className="mt-1 text-xs text-gray-400">{trend}</div>}
    </div>
  );
}
