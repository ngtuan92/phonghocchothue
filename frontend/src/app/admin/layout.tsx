"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminLayout from "@/components/admin/Layout";

export default function AdminLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  
  // Không wrap AdminLayout cho login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
