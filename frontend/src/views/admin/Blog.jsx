import React, { useEffect } from "react";
import BlogTable from "@/components/admin/blog/BlogTable";

export default function Blog() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Quản lý Blog";
    }
  }, []);

  return (
    <div>
      <div className="mt-5 grid h-full grid-cols-1 gap-5">
        <BlogTable />
      </div>
    </div>
  );
}
