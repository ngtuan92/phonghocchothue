"use client";

import useConfigContentByKey from "../hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const NurseryHeader = () => {
  const nurseryImg = useConfigContentByKey("nurseryImg");
  const nurseryTitle = useConfigContentByKey("nurseryTitle");

  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  const backgroundImage = nurseryImg ? `url('${buildUrl(nurseryImg)}')` : "";

  return (
    <div
      className="w-full h-[220px] sm:h-[450px] bg-cover bg-center bg-no-repeat mt-6 sm:mt-32"
      style={{
        backgroundImage: backgroundImage || undefined,
      }}
    >
      <div className="h-full bg-black bg-opacity-20 relative">
        {nurseryTitle && (
          <span className=" absolute -translate-x-4/5 ml-[25px] -bottom-0 sm:ml-[80px] sm:bottom-4 mr-4 text-white mb-1 w-[80%] sm:w-1/2 text-sm sm:text-[25px] !font-normal my-class-font">
            <RichTextRenderer html={nurseryTitle} configKey="nurseryTitle" as="span" className="inline-rich-text" />
          </span>
        )}
      </div>
    </div>
  );
};

export default NurseryHeader;

