import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Providers } from "@/app/providers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div dir="rtl" className="flex min-h-screen flex-col md:flex-row bg-background">
        <MobileSidebar />
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </Providers>
  );
}
