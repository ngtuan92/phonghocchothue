"use client";

import { useEffect } from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";

const GoogleVerificationMeta = () => {
  const verificationValue = useConfigContentByKey("googleVerification");

  useEffect(() => {
    if (!verificationValue || typeof document === "undefined") return;

    let meta = document.querySelector('meta[name="google-site-verification"]');
    const isNew = !meta;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "google-site-verification");
      document.head.appendChild(meta);
    }

    const previousContent = meta.getAttribute("content");
    meta.setAttribute("content", verificationValue);

    return () => {
      if (!meta) return;
      if (isNew && !previousContent) {
        meta.remove();
      } else if (previousContent !== null) {
        meta.setAttribute("content", previousContent);
      }
    };
  }, [verificationValue]);

  return null;
};

export default GoogleVerificationMeta;

