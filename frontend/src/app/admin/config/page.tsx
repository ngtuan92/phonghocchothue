"use client";

import dynamic from "next/dynamic";

const Config = dynamic(() => import("@/views/admin/Config"), { ssr: false });

export default function ConfigPage() {
  return <Config />;
}
