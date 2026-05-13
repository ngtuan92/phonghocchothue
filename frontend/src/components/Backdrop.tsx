"use client";

import Image from "next/image";
import useConfigContentByKey from "../hooks/useConfigContentByKey";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Backdrop = () => {
  const imgIcon = useConfigContentByKey("logo");
  
  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  return (
    <div className="flex flex-col justify-center items-center px-2 sm:px-0 my-0 sm:my-2 z-20 mt-0 sm:mt-[-5px] h-[30vh] sm:h-[20vh] max-sm:mt-[-25px]">
      {imgIcon && (
        <Image
          src={buildUrl(imgIcon)}
          alt="logo"
          width={110}
          height={120}
          className="size-40 w-[77px] h-[86px] sm:w-[110px] sm:h-[120px]"
          priority
          quality={85}
        />
      )}
    </div>
  );
};

export default Backdrop;

