"use client";

import dynamic from "next/dynamic";

const ClientQuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);

export default ClientQuillWrapper;
