import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "erp_session";
const PUBLIC_PATHS = ["/login"];

async function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // اسمح بالملفات الثابتة والـ API الخاصة بتسجيل الدخول
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(req);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // مسجل دخول وبيحاول يفتح /login -> رجّعه للداشبورد
  if (authenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // مش مسجل دخول وبيحاول يفتح صفحة محمية -> رجّعه لـ /login
  if (!authenticated && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * طبّق الـ middleware على كل حاجة ماعدا:
     * - static files (_next/static, _next/image)
     * - favicon
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
