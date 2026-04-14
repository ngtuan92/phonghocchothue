import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { toString } from "lodash";
import dataConfig from "../data/data.json";

export const cn = (...input) => {
  return twMerge(classNames(input));
};

const removeCookie = (name) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

export const handleInvalidToken = (navigator) => {
  removeCookie("token");
  removeCookie("user");
  if (typeof navigator === "function") {
    navigator("/admin/login");
    return;
  }

  if (navigator && typeof navigator.push === "function") {
    navigator.push("/admin/login");
    return;
  }

  if (navigator && typeof navigator.replace === "function") {
    navigator.replace("/admin/login");
    return;
  }

  if (typeof window !== "undefined") {
    window.location.href = "/admin/login";
  }
};

export const formatNumber = (val) => {
  return toString(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const getConfigByKey = (key) => {
  return dataConfig.find((item) => item.key === key) || null;
};

