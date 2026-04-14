import { useMutation } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Count visit
export const useCountVisit = () => {
  return useMutation({
    mutationFn: async () => {
      return await fetchData(`${URL_API}api/visits`, "GET");
    },
  });
};

