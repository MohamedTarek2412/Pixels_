import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // السماح بكل الطلبات دون مصادقة (للتجربة)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * تطبيق الميدلوير على كل المسارات ما عدا:
     * - الملفات الثابتة
     * - API (لأنها تدير المصادقة بنفسها)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
