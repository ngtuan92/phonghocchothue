"use client";

import useConfigContentByKey from "../hooks/useConfigContentByKey";

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
          <span className=" absolute -translate-x-4/5 ml-[20px] -bottom-0 sm:ml-10 sm:bottom-10 mr-4 text-white mb-4 w-[80%] sm:w-1/2 text-sm sm:text-[25px] !font-normal my-class-font">
            {nurseryTitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default NurseryHeader;

