import { useConfig } from "@/context/ConfigProvider";

const useConfigContentByKey = (key: string, value?: string): any => {
  const { dataConfig } = useConfig();
  if (!dataConfig || !Array.isArray(dataConfig)) return null;

  const item = dataConfig.find((item) => item.key === key);

  if (item && value) {
    return item[value];
  }
  return item ? item.content : null;
};

export default useConfigContentByKey;
