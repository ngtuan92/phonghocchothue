"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MdArrowBack, MdSave, MdClose } from "react-icons/md";
import ProductForm from "@/components/admin/product/ProductForm";
import fetchData from "@/axios";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import Loading from "@/components/admin/loading";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProduct = async (data: any) => {
    setIsSubmitting(true);
    const formData = new FormData();

    for (const key of Object.keys(data)) {
      const value = data[key];
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          formData.append(key, item);
        });
      } else {
        formData.append(key, value);
      }
    }

    try {
      await fetchData(`${URL_API}api/product/insert`, "POST", formData, {
        "Content-Type": "multipart/form-data",
      });

      showToastSuccess("Thêm phòng thành công");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/admin/products");
      return true;
    } catch (error: any) {
      showToastError("Thêm phòng thất bại");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full p-2 md:p-6 max-w-[1600px] mx-auto relative">
      {isSubmitting && <Loading />}

      {/* Simple Back button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/products")}
          className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#15803d] transition-all active:scale-95"
        >
          <MdArrowBack className="h-4 w-4" />
          Quay lại danh sách
        </button>
      </div>

      {/* Form Workspace */}
      <ProductForm
        dataEdit={null}
        onSave={handleSaveProduct}
        onCancel={() => router.push("/admin/products")}
        id={null}
        isPage={true}
      />
    </div>
  );
}
