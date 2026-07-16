import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "erp_session";
const PUBLIC_PATHS = ["/login", "/"]; // أضف "/" إذا كانت الصفحة الرئيسية عامة

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not defined in environment variables");
      return false;
    }

    const secretBytes = new TextEncoder().encode(secret);
    await jwtVerify(token, secretBytes);
    return true;
  } catch (error) {
    console.error("Authentication verification failed:", error);
    return false;
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // السماح بالملفات الثابتة ومسارات API المفتوحة
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/auth") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    const authenticated = await isAuthenticated(req);
    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (authenticated && isPublicPath) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!authenticated && !isPublicPath) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware invocation error:", error);
    // في حالة خطأ غير متوقع، نسمح بالمرور لتجنب تعطيل الموقع بالكامل
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * طبّق الـ middleware على كل حاجة ماعدا:
     * - static files (_next/static, _next/image)
     * - favicon
     * - api routes (اختياري، لكن الأفضل تركها بدون مصادقة لأنها تديرها بنفسها)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
