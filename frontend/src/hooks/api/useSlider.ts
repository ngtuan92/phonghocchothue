import { useQuery } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Query keys
export const sliderKeys = {
  all: ["sliders"] as const,
  lists: () => [...sliderKeys.all, "list"] as const,
};

// Get sliders
export const useSliders = () => {
  return useQuery({
    queryKey: sliderKeys.lists(),
    queryFn: async () => {
      const res = await fetchData(`${URL_API}api/slider`, "GET");
      return res.data || [];
    },
  });
};

