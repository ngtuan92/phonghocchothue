"use client";

import Image from "next/image";
import useConfigContentByKey from "../hooks/useConfigContentByKey";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Backdrop = () => {
  const imgIcon = useConfigContentByKey("logo");
  const imgBackDrop = useConfigContentByKey("logo_big");
  const imgBackDropMobile = useConfigContentByKey("logo_big_mobile");

  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  return (
    <div className="flex flex-col justify-center items-center px-2 sm:px-0 my-0 sm:my-2 z-20 mt-0 sm:mt-[-5px] h-[90vh] sm:h-[75vh] max-sm:mt-[-25px]">
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
      {imgBackDrop && (
        <div className="max-md:hidden w-[75%] h-[67%] relative">
          <Image
            src={buildUrl(imgBackDrop)}
            alt="logo"
            fill
            className="object-cover object-position-custom"
            sizes="75vw"
            quality={85}
            loading="lazy"
          />
        </div>
      )}
      {imgBackDropMobile ? (
        <Image
          src={buildUrl(imgBackDropMobile)}
          alt="logo"
          width={600}
          height={400}
          className="w-[75%] sm:w-[68%] sm:h-[275px] md:hidden"
          sizes="(max-width: 768px) 75vw, 68vw"
          quality={85}
          // Đặt ảnh mobile hero làm LCP cho mobile
          priority
          fetchPriority="high"
        />
      ) : (
        <Image
          src="/assets/images/noimg.webp"
          alt="logo"
          width={600}
          height={400}
          className="w-[75%] sm:w-[68%] sm:h-[275px] md:hidden"
          sizes="(max-width: 768px) 75vw, 68vw"
          quality={80}
          // Fallback tĩnh để trình duyệt luôn có ảnh LCP trong HTML
          priority
          fetchPriority="high"
        />
      )}
    </div>
  );
};

export default Backdrop;

