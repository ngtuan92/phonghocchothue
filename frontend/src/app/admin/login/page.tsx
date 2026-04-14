"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import fetchData from "@/axios";
import Cookies from "js-cookie";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Login";
    }
  }, []);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const loginData = { email, password };

    try {
      const response = await fetchData<{
        token?: string;
        user?: any;
        data?: {
          token: string;
          user: any;
        };
      }>(`${URL_API}api/login`, "POST", loginData);

      // Kiểm tra cả response.token và response.data.token
      const token = response.token || response.data?.token;
      const user = response.user || response.data?.user;

      if (token) {
        // Set cookie với path và sameSite để đảm bảo cookie được set đúng
        Cookies.set("token", token, { 
          expires: 1,
          path: "/",
          sameSite: "lax"
        });
        
        if (user) {
          Cookies.set("user", JSON.stringify(user), { 
            expires: 1,
            path: "/",
            sameSite: "lax"
          });
        }

        // Đợi một chút để đảm bảo cookie đã được set
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Sử dụng window.location để force reload và đảm bảo middleware nhận được cookie
        if (typeof globalThis !== "undefined" && globalThis.location) {
          globalThis.location.href = "/admin/dashboard";
        }
      } else {
        setError("Không nhận được token từ server. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err?.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex items-center justify-center mb-8 text-base font-medium text-black hover:text-green-600 transition-colors duration-200"
        >
          <img
            className="w-8 h-8 mr-2"
            src="/assets/images/home-bg.png"
            alt="logo"
          />
          <span>Quay lại trang người dùng</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-green-500">
          <div className="bg-green-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white text-center">
              Đăng nhập Admin
            </h1>
          </div>
          <div className="px-8 py-10 sm:px-10">
            <p className="text-sm text-black text-center mb-8 font-medium">
              Vui lòng nhập thông tin đăng nhập của bạn
            </p>
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-black mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="w-full px-4 py-3 border-2 border-green-500 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-600 transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-black mb-2"
                >
                  Mật khẩu
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full px-4 py-3 border-2 border-green-500 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-600 transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-black border-2 border-red-500 rounded-lg p-4">
                  <p className="text-sm font-bold text-white">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-green-600 border-2 border-transparent hover:border-green-800"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
