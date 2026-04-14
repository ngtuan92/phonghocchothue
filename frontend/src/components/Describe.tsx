"use client";

import Image from "next/image";
import { Fade } from "react-slideshow-image";
import useConfigContentByKey from "../hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface SliderItem {
  image: string;
  [key: string]: any;
}

const Describe = () => {
  const textLine = {
    title: useConfigContentByKey("bgTitle"),
    description: useConfigContentByKey("textDecription"),
  };

  const { data: sliderData = [], isLoading } = useSliders();

  return (
    <div className="my-6 mb-20 sm:mb-0 sm:my-36 px-0 sm:px-[90px] grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 text-center sm:text-left justify-center items-center leading-[15px]">
      <div className="container p-6 px-[40px] sm:px-6 sm:pl-0">
        {textLine.title && (
          <Image
            src={`${URL_API}${textLine.title.replace(/\\/g, "/")}`}
            alt="bg"
            width={800}
            height={200}
            className="w-[80%] m-auto"
            sizes="80vw"
            quality={85}
            loading="lazy"
          />
        )}
        {textLine.description && (
          <span className="text-[12px] sm:text-base text-center text-gray-700 raleway !font-normal sm:!text-left">
            {textLine.description}
          </span>
        )}
      </div>

      <div className="container w-full p-6 px-[40px] sm:px-6 max-sm:pt-0 md:divide-none lg:divide-none sm:pr-0">
        {sliderData.length > 0 && (
          <Fade
            autoplay={true}
            duration={2000}
            transitionDuration={500}
            nextArrow={
              <button
                style={{
                  display: "none",
                }}
              ></button>
            }
            prevArrow={
              <button
                style={{
                  display: "none",
                }}
              ></button>
            }
          >
            {sliderData.map((fadeImage: SliderItem, index: number) => (
              <div key={index} className="relative w-full my-4" style={{ width: "100%" }}>
                <Image
                  className="w-full"
                  src={`${URL_API}${fadeImage.image?.replace(/\\/g, "/")}`}
                  alt={`Slide ${index + 1}`}
                  width={1200}
                  height={800}
                  sizes="100vw"
                  quality={85}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </Fade>
        )}
      </div>
    </div>
  );
};

export default Describe;

