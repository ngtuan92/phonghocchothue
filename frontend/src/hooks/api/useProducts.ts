import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Query keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: string) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Get products
export const useProducts = (params?: { limit?: number }) => {
  const queryParams = params
    ? `?${new URLSearchParams(params as any).toString()}`
    : "";

  return useQuery({
    queryKey: productKeys.list(queryParams),
    queryFn: async () => {
      // Thử api/product trước (số ít), nếu không được thì dùng api/products
      const res = await fetchData(`${URL_API}api/product${queryParams}`, "GET");
      return res.data || [];
    },
  });
};

// Get single product by slug or id
export const useProduct = (slugOrId: string) => {
  return useQuery({
    queryKey: productKeys.detail(slugOrId),
    queryFn: async () => {
      // API có thể nhận slug hoặc id
      const res = await fetchData(`${URL_API}api/product/detail/${slugOrId}`, "GET");
      return res.data;
    },
    enabled: !!slugOrId,
  });
};

// Create product
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return await fetchData(`${URL_API}api/products`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// Update product
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await fetchData(`${URL_API}api/products/${id}`, "PUT", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// Delete product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await fetchData(`${URL_API}api/products/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

