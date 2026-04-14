import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Query keys
export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters?: string) => [...bookingKeys.lists(), { filters }] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// Get bookings
export const useBookings = (params?: { limit?: number; status?: string }) => {
  const queryParams = params
    ? `?${new URLSearchParams(params as any).toString()}`
    : "";

  return useQuery({
    queryKey: bookingKeys.list(queryParams),
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/bookings${queryParams}`, "GET");
      return res.data || [];
    },
  });
};

// Create booking
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return await fetchData(`${URL_API}api/bookings`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

// Update booking
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await fetchData(`${URL_API}api/bookings/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

// Delete booking
export const useDeleteBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await fetchData(`${URL_API}api/bookings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

