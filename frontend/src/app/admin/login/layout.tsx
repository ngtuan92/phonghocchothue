"use client";

import { ReactNode } from "react";

// Layout riêng cho login page - không wrap AdminLayout
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

