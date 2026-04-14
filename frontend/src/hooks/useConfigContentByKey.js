import { useConfig } from "../context/ConfigProvider";

const useConfigContentByKey = (key, value) => {
  const { dataConfig } = useConfig();
  if (!dataConfig || !Array.isArray(dataConfig)) return null;  // tránh lỗi khi dataConfig null/undefined

  const item = dataConfig.find((item) => item.key === key);

  if (item && value) {
    return item[value];   // nếu có truyền value thì lấy trường tương ứng
  }
  return item ? item.content : null; // mặc định trả về content
};

export default useConfigContentByKey;