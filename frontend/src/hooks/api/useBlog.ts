import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export type BlogCategory = "kien-thuc" | "kinh-nghiem";

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  category: BlogCategory;
  status: number;
  authorName: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export const blogKeys = {
  all: ["blogs"] as const,
  lists: () => [...blogKeys.all, "list"] as const,
  list: (filters?: string) => [...blogKeys.lists(), { filters }] as const,
  detail: (slug: string) => [...blogKeys.all, "detail", slug] as const,
};

export const useBlogs = (params?: {
  category?: BlogCategory;
  page?: number;
  limit?: number;
  status?: number | 'all';
}) => {
  const cleanParams = params ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined)) : {};
  const queryParams = Object.keys(cleanParams).length > 0
    ? `?${new URLSearchParams(cleanParams as any).toString()}`
    : "";

  return useQuery({
    queryKey: blogKeys.list(queryParams),
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/blog${queryParams}`, "GET");
      return (res as any);
    },
  });
};

export const useBlog = (slug: string) => {
  return useQuery({
    queryKey: blogKeys.detail(slug),
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/blog/${slug}`, "GET");
      return (res as any)?.data;
    },
    enabled: !!slug,
  });
};

export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Blog>) => 
      fetchData(`${URL_API}api/blog`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
};

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Blog> & { id: number }) => 
      fetchData(`${URL_API}api/blog/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
};

export const useDeleteBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => 
      fetchData(`${URL_API}api/blog/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
};
