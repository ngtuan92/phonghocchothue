import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  const user = request.cookies.get("user");

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = !!token && !!user;

  // Redirect động dựa vào cấu hình ở backend (không áp dụng cho /admin)
  if (!pathname.startsWith("/admin")) {
    try {
      const url = new URL("/api/redirect", BACKEND_URL);
      url.searchParams.set("path", pathname);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();

        if (data?.to) {
          return NextResponse.redirect(new URL(data.to, request.url));
        }
      }
    } catch (error) {
      // Nếu backend lỗi thì bỏ qua để không chặn request
      // console.error("Redirect middleware error:", error);
    }
  }

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    // Nếu vào đúng /admin hoặc /admin/ thì điều hướng theo trạng thái đăng nhập
    if (pathname === "/admin" || pathname === "/admin/") {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // Cho phép truy cập trang login
    if (pathname === "/admin/login") {
      // Nếu đã đăng nhập thì không cho vào login nữa, chuyển thẳng dashboard
      if (isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Các route admin khác: bắt buộc phải đăng nhập
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/phong/:path*"],
};
