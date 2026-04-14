import { useMutation } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Create contact
export const useCreateContact = () => {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone: string;
      subject: string;
    }) => {
      return await fetchData(`${URL_API}api/contact`, "POST", data);
    },
  });
};

