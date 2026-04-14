import axios, { AxiosError } from "axios";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const getClientCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
  }
  return undefined;
};

const removeClientCookie = (name: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

// Tạo axios instance
export const apiClient = axios.create({
  baseURL: URL_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor để thêm token vào mọi request
apiClient.interceptors.request.use(
  (config) => {
    const token = getClientCookie("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Xử lý unauthorized
      removeClientCookie("token");
    }
    return Promise.reject(error);
  }
);

// Helper function để fetch data
export const fetchData = async <T = any>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  data?: any,
  additionalHeaders?: Record<string, string>
): Promise<T> => {
  try {
    const response = await apiClient({
      url,
      method,
      data,
      headers: additionalHeaders,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default fetchData;

