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

const isCompressibleImage = (file: File): boolean => {
  if (!file) return false;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  return (
    type.startsWith("image/") &&
    !type.includes("gif") &&
    !type.includes("svg") &&
    !type.includes("icon") &&
    !type.includes("x-icon") &&
    !name.endsWith(".gif") &&
    !name.endsWith(".svg")
  );
};

const compressImage = (file: File, maxWidth = 1920, maxQuality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(file);
      return;
    }

    if (!isCompressibleImage(file)) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          maxQuality
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};

apiClient.interceptors.request.use(
  async (config) => {
    const token = getClientCookie("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && typeof window !== "undefined") {
      const newFormData = new FormData();
      for (const [key, value] of config.data.entries()) {
        if (value instanceof File && isCompressibleImage(value)) {
          try {
            const compressed = await compressImage(value);
            newFormData.append(key, compressed, value.name);
          } catch (e) {
            console.error("Lỗi nén ảnh, sử dụng file gốc:", e);
            newFormData.append(key, value);
          }
        } else {
          newFormData.append(key, value);
        }
      }
      config.data = newFormData;
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Xử lý unauthorized / invalid token
      removeClientCookie("token");
      removeClientCookie("user");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login";
      }
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

