"use client";

import { createContext, useContext, ReactNode } from "react";
import { useConfig as useConfigQuery } from "@/hooks/api/useConfig";

interface ConfigItem {
  [key: string]: any;
}

interface ConfigContextType {
  dataConfig: ConfigItem[];
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const { data: dataConfig = [], isLoading } = useConfigQuery();

  return (
    <ConfigContext.Provider value={{ dataConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️ useConfig gọi ngoài ConfigProvider, trả về dataConfig rỗng tạm thời."
      );
    }
    return { dataConfig: [] };
  }
  return context;
};
