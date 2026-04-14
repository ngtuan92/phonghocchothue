import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Query keys
export const configKeys = {
  all: ["config"] as const,
  lists: () => [...configKeys.all, "list"] as const,
  list: (filters: string) => [...configKeys.lists(), { filters }] as const,
  details: () => [...configKeys.all, "detail"] as const,
  detail: (id: string) => [...configKeys.details(), id] as const,
};

// Get config
export const useConfig = () => {
  return useQuery({
    queryKey: configKeys.all,
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/config`, "GET");
      return res.data || [];
    },
  });
};

// Update config
export const useUpdateConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await fetchData(`${URL_API}api/config/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
};

// Create config
export const useCreateConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return await fetchData(`${URL_API}api/config`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
};

// Delete config
export const useDeleteConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await fetchData(`${URL_API}api/config/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
};

