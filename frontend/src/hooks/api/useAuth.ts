import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/lib/api-client";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

// Login
export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetchData(`${URL_API}api/auth/login`, "POST", credentials);
      if (res.token) {
        Cookies.set("token", res.token);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.push("/admin/dashboard");
    },
  });
};

// Logout
export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      Cookies.remove("token");
      queryClient.clear();
      router.push("/admin/login");
    },
  });
};

