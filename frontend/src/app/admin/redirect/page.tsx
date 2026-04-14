"use client";

import dynamic from "next/dynamic";

const RedirectAdmin = dynamic(() => import("@/views/admin/Redirect"), {
  ssr: false,
});

export default function RedirectAdminPage() {
  return <RedirectAdmin />;
}


