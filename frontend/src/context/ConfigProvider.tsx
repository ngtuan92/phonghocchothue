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

  const colorBtn = dataConfig.find((item: ConfigItem) => item.key === "color-btn")?.content || "#b8c7b0";
  const colorBtnPurple = dataConfig.find((item: ConfigItem) => item.key === "color-btn-purple")?.content || "#563c39";
  const colorBtnPurpleHover = dataConfig.find((item: ConfigItem) => item.key === "color-btn-purple-hover")?.content || "#e57f7f";

  return (
    <ConfigContext.Provider value={{ dataConfig }}>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --btn-color: ${colorBtn};
          --color-btn-purple: ${colorBtnPurple};
          --color-btn-purple-hover: ${colorBtnPurpleHover};
        }
      ` }} />
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
