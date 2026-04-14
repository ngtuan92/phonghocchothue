import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { toString } from "lodash";
import dataConfig from "@/data/data.json";

export const cn = (...input: any[]) => {
  return twMerge(classNames(input));
};

type NavigatorLike =
  | ((path: string) => void | Promise<void>)
  | {
      push?: (path: string) => void | Promise<void>;
      replace?: (path: string) => void | Promise<void>;
    };

const removeCookie = (name: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

export const handleInvalidToken = (navigator: NavigatorLike) => {
  removeCookie("token");
  removeCookie("user");
  if (typeof navigator === "function") {
    navigator("/admin/login");
    return;
  }

  if (navigator?.push) {
    navigator.push("/admin/login");
    return;
  }

  if (navigator?.replace) {
    navigator.replace("/admin/login");
    return;
  }

  if (typeof window !== "undefined") {
    window.location.href = "/admin/login";
  }
};

export const formatNumber = (val: number | string): string => {
  return toString(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const getConfigByKey = (key: string) => {
  return dataConfig.find((item: any) => item.key === key) || null;
};
