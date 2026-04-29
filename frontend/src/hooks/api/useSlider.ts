import { useQuery } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Query keys
export const sliderKeys = {
  all: ["sliders"] as const,
  lists: () => [...sliderKeys.all, "list"] as const,
  byType: (type: string) => [...sliderKeys.all, "list", type] as const,
};

// Get sliders - filter by type to keep each section independent
export const useSliders = (type: string = "gallery") => {
  return useQuery({
    queryKey: sliderKeys.byType(type),
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/slider?type=${type}`, "GET");
      return res.data || [];
    },
  });
};

