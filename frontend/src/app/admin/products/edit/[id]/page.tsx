"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MdArrowBack, MdSave, MdClose } from "react-icons/md";
import ProductForm from "@/components/admin/product/ProductForm";
import fetchData from "@/axios";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import Loading from "@/components/admin/loading";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [productData, setProductData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetchData(`${URL_API}api/product/edit/${id}`);
        setProductData((response as any).data || null);
      } catch (error) {
        showToastError("Không tải được thông tin phòng");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

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
      await fetchData(`${URL_API}api/product/update/${id}`, "PUT", formData, {
        "Content-Type": "multipart/form-data",
      });

      showToastSuccess("Cập nhật phòng thành công");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error: any) {
      showToastError("Cập nhật phòng thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#15803d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <p className="text-gray-600 font-bold">Không tìm thấy thông tin phòng học.</p>
        <button
          onClick={() => router.push("/admin/products")}
          className="mt-4 px-6 py-2 bg-[#15803d] text-white rounded-xl font-bold text-sm"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

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
        dataEdit={productData}
        onSave={handleSaveProduct}
        onCancel={() => router.push("/admin/products")}
        id={id}
        isPage={true}
      />
    </div>
  );
}
